/**
 * Pure Cover Flow transform math for the desktop iTunes view. Forked from the
 * iPod's CoverFlowView and scaled up for the larger canvas. Kept in its own
 * module (no React, no CSS) so it can be unit-tested directly.
 */

export const RENDER_WINDOW = 6;
export const COVER = 240;

export function coverTransform(offset: number): string {
  if (offset === 0) return 'translateX(0) translateZ(120px) rotateY(0deg)';
  const side = Math.sign(offset);
  const x = side * (120 + Math.min(Math.abs(offset), RENDER_WINDOW) * 44);
  return `translateX(${x}px) translateZ(-90px) rotateY(${-side * 64}deg)`;
}

export function coverOpacity(offset: number): number {
  const distance = Math.abs(offset);
  return distance >= 3 ? Math.max(0.5, 1 - (distance - 2) * 0.16) : 1;
}

export function coverDim(offset: number): number {
  const distance = Math.abs(offset);
  return distance === 0 ? 0 : Math.min(0.45, 0.2 + (distance - 1) * 0.08);
}
