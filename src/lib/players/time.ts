/** "m:ss" for playback displays; negative/NaN input clamps to 0:00. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** The iPod-style countdown shown on the right of the progress bar. */
export function formatRemaining(position: number, duration: number): string {
  return `-${formatTime(Math.max(0, duration - position))}`;
}
