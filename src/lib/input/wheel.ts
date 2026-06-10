/**
 * Pure click-wheel math. Pointer positions on the wheel ring become signed
 * "detent ticks", one per DETENT_DEG degrees of rotation — clockwise is +1
 * (down/next), counter-clockwise is -1, matching the real iPod.
 */

export const DETENT_DEG = 18;
const DETENT_RAD = (DETENT_DEG * Math.PI) / 180;

/** Angle of a pointer position around a center, in radians. */
export function angleAt(cx: number, cy: number, x: number, y: number): number {
  return Math.atan2(y - cy, x - cx);
}

/** Smallest signed difference between two angles, wrapped to (-π, π]. */
export function angleDelta(prev: number, next: number): number {
  let d = next - prev;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

export interface WheelAccumulator {
  /** Rotation accumulated since the last emitted tick, in radians. */
  acc: number;
}

export function createAccumulator(): WheelAccumulator {
  return { acc: 0 };
}

/**
 * Feed one rotation delta; returns how many ticks fire (signed).
 * Mutation-free: returns the next accumulator state.
 */
export function accumulate(
  state: WheelAccumulator,
  deltaRad: number,
): { state: WheelAccumulator; ticks: number } {
  const total = state.acc + deltaRad;
  const ticks = Math.trunc(total / DETENT_RAD);
  return { state: { acc: total - ticks * DETENT_RAD }, ticks };
}

/**
 * Which tap-zone a pointer position falls in, for press-and-release taps.
 * Returns null when the position is in the center button or outside the wheel.
 */
export type WheelZone = 'menu' | 'prev' | 'next' | 'playPause' | 'center';

export function zoneAt(
  cx: number,
  cy: number,
  x: number,
  y: number,
  wheelRadius: number,
  centerRadius: number,
): WheelZone | null {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist <= centerRadius) return 'center';
  if (dist > wheelRadius) return null;
  const angle = Math.atan2(dy, dx); // 0 = right, -π/2 = top
  const deg = (angle * 180) / Math.PI;
  if (deg >= -135 && deg < -45) return 'menu';
  if (deg >= -45 && deg < 45) return 'next';
  if (deg >= 45 && deg < 135) return 'playPause';
  return 'prev';
}
