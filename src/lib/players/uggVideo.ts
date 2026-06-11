/**
 * Handle to the persistent <video> element for local UGG episodes (owned by
 * UggStage, mounted once like the other persistent players). Module-level so
 * the store can start playback synchronously *inside* the user's click /
 * keypress — Safari only honors unmuted play() from a real gesture, and a
 * React effect runs too late for it.
 */
let el: HTMLVideoElement | null = null;

export function registerUggVideo(video: HTMLVideoElement | null): void {
  el = video;
}

/** Load (only if the src changed) and play. Re-calls with the same src just resume. */
export function uggLoad(src: string): void {
  if (!el) return;
  if (el.getAttribute('src') !== src) {
    el.setAttribute('src', src);
  }
  void el.play().catch(() => {
    // Autoplay veto: the paused OSD stays up and center press resumes.
  });
}

export function uggToggle(): void {
  if (!el) return;
  if (el.paused) void el.play().catch(() => {});
  else el.pause();
}

export function uggPause(): void {
  el?.pause();
}
