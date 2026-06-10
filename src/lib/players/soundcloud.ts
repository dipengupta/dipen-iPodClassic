import type { PlayTrack } from '../menu/types';

/**
 * Persistent SoundCloud widget, ported from the old site's ipod.js: an
 * off-screen audio-only iframe whose track list (via getSounds) becomes an
 * iPod menu, and whose skip()/play() drive playback. The widget is created
 * once by PlayersLayer and never unmounted.
 */

export const SOUNDCLOUD_TRACKS_URL = 'https://soundcloud.com/dipen-gupta/tracks';

export function soundcloudPlayerSrc(): string {
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
  toggle: () => void;
}

interface ScSound {
  title?: string;
  description?: string;
  created_at?: string;
}

declare global {
  interface Window {
    SC?: {
      Widget: ((iframe: HTMLIFrameElement) => ScWidget) & {
        Events: { READY: string; PLAY: string; PAUSE: string; FINISH: string };
      };
    };
  }
}

const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js';

let widget: ScWidget | null = null;
let resolveTracks: ((tracks: PlayTrack[]) => void) | null = null;
const tracksPromise = new Promise<PlayTrack[]>((resolve) => {
  resolveTracks = resolve;
});

function loadWidgetApi(): Promise<void> {
  if (window.SC?.Widget) return Promise.resolve();
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

/** Called once by PlayersLayer with the persistent hidden iframe. */
export async function initSoundcloud(
  iframe: HTMLIFrameElement,
  onPlaying: (playing: boolean) => void,
): Promise<void> {
  await loadWidgetApi();
  if (!window.SC || widget) return;
  const sc = window.SC;
  widget = sc.Widget(iframe);
  widget.bind(sc.Widget.Events.READY, () => {
    widget!.getSounds((sounds) => {
      // Widget order is newest-first; reverse for ascending display, but the
      // track id stays the *widget* index so skip() targets the right sound.
      const tracks = sounds
        .map<PlayTrack>((sound, i) => ({
          id: String(i),
          title: sound.title ?? `Track ${i + 1}`,
          description: sound.description ?? '',
          date: sound.created_at ?? '',
        }))
        .reverse();
      resolveTracks?.(tracks);
    });
    widget!.bind(sc.Widget.Events.PLAY, () => onPlaying(true));
    widget!.bind(sc.Widget.Events.PAUSE, () => onPlaying(false));
    widget!.bind(sc.Widget.Events.FINISH, () => onPlaying(false));
  });
}

/** Resolves with the ascending track list, or null if the widget is slow/blocked. */
export function getSoundcloudTracks(timeoutMs = 6000): Promise<PlayTrack[] | null> {
  return Promise.race([
    tracksPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export function soundcloudPlay(widgetIndex: number): void {
  if (!widget) return;
  widget.skip(widgetIndex);
  widget.play();
}

export function soundcloudToggle(): void {
  widget?.toggle();
}

export function soundcloudPause(): void {
  widget?.pause();
}
