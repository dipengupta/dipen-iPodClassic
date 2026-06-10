import { describe, expect, it } from 'vitest';
import {
  DETENT_DEG,
  accumulate,
  angleAt,
  angleDelta,
  createAccumulator,
  zoneAt,
} from '@/lib/input/wheel';

const rad = (deg: number) => (deg * Math.PI) / 180;

describe('angleAt', () => {
  it('measures the pointer angle around a center', () => {
    expect(angleAt(0, 0, 1, 0)).toBeCloseTo(0);
    expect(angleAt(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
    expect(angleAt(0, 0, -1, 0)).toBeCloseTo(Math.PI);
    expect(angleAt(0, 0, 0, -1)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('angleDelta', () => {
  it('returns small signed deltas', () => {
    expect(angleDelta(rad(10), rad(25))).toBeCloseTo(rad(15));
    expect(angleDelta(rad(25), rad(10))).toBeCloseTo(rad(-15));
  });

  it('wraps across the ±π boundary', () => {
    // 175° -> -175° is a +10° clockwise move, not -350°.
    expect(angleDelta(rad(175), rad(-175))).toBeCloseTo(rad(10));
    expect(angleDelta(rad(-175), rad(175))).toBeCloseTo(rad(-10));
  });
});

describe('accumulate', () => {
  it('emits one tick per detent angle', () => {
    let state = createAccumulator();
    let result = accumulate(state, rad(DETENT_DEG - 1));
    expect(result.ticks).toBe(0);
    result = accumulate(result.state, rad(2));
    expect(result.ticks).toBe(1);
  });

  it('emits multiple ticks for fast spins', () => {
    const { ticks } = accumulate(createAccumulator(), rad(DETENT_DEG * 3 + 5));
    expect(ticks).toBe(3);
  });

  it('emits negative ticks counter-clockwise and keeps the remainder', () => {
    const { state, ticks } = accumulate(createAccumulator(), rad(-DETENT_DEG * 2 - 4));
    expect(ticks).toBe(-2);
    expect(state.acc).toBeCloseTo(rad(-4));
  });

  it('does not tick when wiggling around zero', () => {
    let state = createAccumulator();
    for (const delta of [5, -5, 8, -8, 3, -3]) {
      const result = accumulate(state, rad(delta));
      state = result.state;
      expect(result.ticks).toBe(0);
    }
  });
});

describe('zoneAt', () => {
  const args = { cx: 100, cy: 100, wheel: 80, center: 30 };
  const at = (x: number, y: number) => zoneAt(args.cx, args.cy, x, y, args.wheel, args.center);

  it('maps the four quadrants and center', () => {
    expect(at(100, 40)).toBe('menu');
    expect(at(100, 160)).toBe('playPause');
    expect(at(40, 100)).toBe('prev');
    expect(at(160, 100)).toBe('next');
    expect(at(100, 100)).toBe('center');
  });

  it('returns null outside the wheel', () => {
    expect(at(100, 5)).toBeNull();
  });
});
