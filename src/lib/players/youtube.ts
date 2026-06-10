/**
 * Persistent YouTube player (IFrame API), ported from the old site's ipod.js:
 * created ONCE at full size inside the screen and never moved or unmounted —
 * moving an iframe reloads it, which stops playback. PlayersLayer raises it
 * above the menu only while watching; behind the menu the audio keeps going.
 */

interface YtPlayer {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          width?: number;
          height?: number;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
          };
        },
      ) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api';

let player: YtPlayer | null = null;
let ready = false;
let pendingVideoId: string | null = null;
let initStarted = false;

function loadIframeApi(): void {
  if (window.YT?.Player || document.querySelector(`script[src="${API_SRC}"]`)) return;
  const script = document.createElement('script');
  script.src = API_SRC;
  document.head.appendChild(script);
}

export interface YoutubeCallbacks {
  onPlaying: (playing: boolean) => void;
  onEnded: () => void;
}

/** Called once by PlayersLayer; `elementId` is the div the API replaces. */
export function initYoutube(elementId: string, callbacks: YoutubeCallbacks): void {
  if (initStarted) return;
  initStarted = true;

  const create = () => {
    player = new window.YT!.Player(elementId, {
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          ready = true;
          if (pendingVideoId) {
            player!.loadVideoById(pendingVideoId);
            player!.playVideo();
            pendingVideoId = null;
          }
        },
        onStateChange: (e) => {
          // 1 = playing, 2 = paused, 0 = ended
          if (e.data === 1) callbacks.onPlaying(true);
          else if (e.data === 2 || e.data === 0) callbacks.onPlaying(false);
          if (e.data === 0) callbacks.onEnded();
        },
      },
    });
  };

  if (window.YT?.Player) {
    create();
  } else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      create();
    };
    loadIframeApi();
  }
}

export function youtubeLoad(videoId: string): void {
  if (ready && player) {
    player.loadVideoById(videoId);
    player.playVideo();
  } else {
    pendingVideoId = videoId;
  }
}

export function youtubeToggle(): void {
  if (!ready || !player) return;
  if (player.getPlayerState() === 1) player.pauseVideo();
  else player.playVideo();
}

export function youtubePause(): void {
  if (ready && player) player.pauseVideo();
}
