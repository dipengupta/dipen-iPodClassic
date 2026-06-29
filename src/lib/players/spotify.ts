/**
 * Persistent hidden <audio> element that streams Spotify's keyless 30s preview
 * MP3s (the `audioPreview.url` shipped in each playlist's embed feed). Mounted
 * once by PlayersLayer, like the other persistent players. Module-level so the
 * store can start playback synchronously *inside* the user's click / keypress —
 * Safari only honors play() from a real gesture, and a React effect runs too
 * late for it. Real currentTime/duration drive the Now Playing scrubber, so
 * Spotify gets the exact same transport as SoundCloud.
 */
let el: HTMLAudioElement | null = null;

export function initSpotify(
  audio: HTMLAudioElement | null,
  onPlaying: (playing: boolean) => void,
  onProgress: (positionSec: number, durationSec: number) => void,
  onEnded: () => void,
): void {
  if (!audio || el) return;
  el = audio;
  audio.addEventListener('play', () => onPlaying(true));
  audio.addEventListener('pause', () => onPlaying(false));
  audio.addEventListener('ended', onEnded);
  // Report position + duration on every relevant event — not just `timeupdate`
  // (which only fires while actually playing). `loadedmetadata`/`durationchange`
  // surface the track length as soon as it's known, so the bar shows the right
  // time even when autoplay is blocked and the track sits paused at 0:00.
  const emit = () =>
    onProgress(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : 0);
  audio.addEventListener('timeupdate', emit);
  audio.addEventListener('loadedmetadata', emit);
  audio.addEventListener('durationchange', emit);
}

/** Load (only if the src changed) and play. Re-calls with the same src resume. */
export function spotifyLoad(src: string): void {
  if (!el) return;
  if (el.getAttribute('src') !== src) {
    el.setAttribute('src', src);
  }
  void el.play().catch(() => {
    // Autoplay veto: the paused card stays up and center press resumes.
  });
}

export function spotifyToggle(): void {
  if (!el) return;
  if (el.paused) void el.play().catch(() => {});
  else el.pause();
}

export function spotifyPause(): void {
  el?.pause();
}

export function spotifySeekBy(seconds: number): void {
  if (!el) return;
  const duration = Number.isFinite(el.duration) ? el.duration : 0;
  const target = el.currentTime + seconds;
  el.currentTime = Math.max(0, duration > 0 ? Math.min(duration, target) : target);
}
