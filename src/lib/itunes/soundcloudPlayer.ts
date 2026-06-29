/**
 * iTunes-local SoundCloud player. A standalone copy of the iPod's
 * src/lib/players/soundcloud.ts — NOT imported from it, so the iTunes view stays
 * fully independent (own module singleton + own hidden iframe). The SoundCloud
 * widget is the only way to play full tracks, so iTunes drives it the same way
 * the iPod does, but through its own transport.
 */

export interface ScTrack {
  /** Widget index — used as both the row key and the skip() target. */
  id: number;
  title: string;
  date?: string;
}

const SOUNDCLOUD_TRACKS_URL = 'https://soundcloud.com/dipen-gupta/tracks';

export function soundcloudEmbedSrc(): string {
  return (
    'https://w.soundcloud.com/player/?url=' +
    encodeURIComponent(SOUNDCLOUD_TRACKS_URL) +
    '&color=%232f6fc4&auto_play=false&hide_related=true' +
    '&show_comments=false&show_user=true&show_reposts=false&visual=false'
  );
}

interface ScWidget {
  bind: (event: string, cb: (...args: unknown[]) => void) => void;
  getSounds: (cb: (sounds: ScSound[]) => void) => void;
  skip: (index: number) => void;
  play: () => void;
  pause: () => void;
  getPosition: (cb: (ms: number) => void) => void;
  getDuration: (cb: (ms: number) => void) => void;
  seekTo: (ms: number) => void;
}

interface ScSound {
  title?: string;
  created_at?: string;
}

interface ScApi {
  Widget: ((iframe: HTMLIFrameElement) => ScWidget) & {
    Events: { READY: string; PLAY: string; PAUSE: string; FINISH: string; PLAY_PROGRESS: string };
  };
}

const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js';

let widget: ScWidget | null = null;
let resolveTracks: ((tracks: ScTrack[]) => void) | null = null;
const tracksPromise = new Promise<ScTrack[]>((resolve) => {
  resolveTracks = resolve;
});

function scApi(): ScApi | undefined {
  return (window as unknown as { SC?: ScApi }).SC;
}

function loadWidgetApi(): Promise<void> {
  if (scApi()?.Widget) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_API_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('SC api load failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = WIDGET_API_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('SC api load failed'));
    document.head.appendChild(script);
  });
}

/** Called once by ItunesApp with the persistent hidden iframe. */
export async function initSoundcloud(
  iframe: HTMLIFrameElement,
  onPlaying: (playing: boolean) => void,
  onProgress: (positionSec: number, durationSec: number) => void,
  onFinish: () => void,
): Promise<void> {
  await loadWidgetApi();
  const sc = scApi();
  if (!sc || widget) return;
  widget = sc.Widget(iframe);
  widget.bind(sc.Widget.Events.READY, () => {
    widget!.getSounds((sounds) => {
      // Widget order is newest-first; reverse for ascending. The id stays the
      // *widget* index so skip() targets the right sound.
      const tracks = sounds
        .map<ScTrack>((sound, i) => ({
          id: i,
          title: sound.title ?? `Track ${i + 1}`,
          date: sound.created_at,
        }))
        .reverse();
      resolveTracks?.(tracks);
    });
    widget!.bind(sc.Widget.Events.PLAY, () => onPlaying(true));
    widget!.bind(sc.Widget.Events.PAUSE, () => onPlaying(false));
    widget!.bind(sc.Widget.Events.FINISH, () => {
      onPlaying(false);
      onFinish();
    });
    widget!.bind(sc.Widget.Events.PLAY_PROGRESS, (event) => {
      const positionMs = (event as { currentPosition?: number })?.currentPosition ?? 0;
      widget!.getDuration((durationMs) => onProgress(positionMs / 1000, durationMs / 1000));
    });
  });
}

/** Resolves with the ascending track list, or null if the widget is slow/blocked. */
export function getTracks(timeoutMs = 6000): Promise<ScTrack[] | null> {
  return Promise.race([
    tracksPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export function scPlay(widgetIndex: number): void {
  if (!widget) return;
  widget.skip(widgetIndex);
  widget.play();
}

export function scResume(): void {
  widget?.play();
}

export function scPause(): void {
  widget?.pause();
}

export function scSeekTo(seconds: number): void {
  const w = widget;
  if (!w) return;
  w.getDuration((durationMs) => {
    w.seekTo(Math.max(0, Math.min(durationMs, seconds * 1000)));
  });
}
