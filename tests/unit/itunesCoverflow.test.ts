import { describe, expect, it } from 'vitest';
import {
  COVER,
  RENDER_WINDOW,
  coverDim,
  coverOpacity,
  coverTransform,
} from '@/components/itunes/views/coverflowMath';

describe('iTunes Cover Flow math', () => {
  it('the focused cover faces forward, pulled toward the viewer', () => {
    expect(coverTransform(0)).toBe('translateX(0) translateZ(120px) rotateY(0deg)');
    expect(coverOpacity(0)).toBe(1);
    expect(coverDim(0)).toBe(0);
  });

  it('side covers fan out symmetrically and rotate inward', () => {
    expect(coverTransform(1)).toBe('translateX(164px) translateZ(-90px) rotateY(-64deg)');
    expect(coverTransform(-1)).toBe('translateX(-164px) translateZ(-90px) rotateY(64deg)');
  });

  it('fan spacing grows with distance but clamps at the render window', () => {
    const x = (t: string) => Number(t.match(/translateX\((-?\d+)px\)/)![1]);
    expect(x(coverTransform(2))).toBeGreaterThan(x(coverTransform(1)));
    // Beyond RENDER_WINDOW the offset clamps, so spacing stops growing.
    expect(x(coverTransform(RENDER_WINDOW + 3))).toBe(x(coverTransform(RENDER_WINDOW)));
  });

  it('distant covers dim and fade, but never past the floors', () => {
    expect(coverOpacity(10)).toBe(0.5);
    expect(coverDim(10)).toBe(0.45);
    expect(coverOpacity(2)).toBe(1); // still full until distance 3
  });

  it('exposes the scaled-up cover size', () => {
    expect(COVER).toBe(240);
  });
});
