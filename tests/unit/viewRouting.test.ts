import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPinnedView, pinView, preferredView } from '@/lib/device/viewRouting';

/** Stub window.matchMedia so each media query returns the given boolean. */
function stubMedia(matches: Record<string, boolean>) {
  vi.stubGlobal('window', {
    matchMedia: (q: string) => ({ matches: matches[q] ?? false }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('preferredView', () => {
  it('desktop (fine pointer, wide) → iTunes', () => {
    stubMedia({ '(pointer: coarse)': false, '(max-width: 767px)': false, '(orientation: landscape)': true });
    expect(preferredView()).toBe('itunes');
  });

  it('portrait phone → iPod', () => {
    stubMedia({ '(pointer: coarse)': true, '(max-width: 767px)': true, '(orientation: landscape)': false });
    expect(preferredView()).toBe('ipod');
  });

  it('landscape phone → iTunes (the tilt feature)', () => {
    stubMedia({ '(pointer: coarse)': true, '(max-width: 767px)': false, '(orientation: landscape)': true });
    expect(preferredView()).toBe('itunes');
  });

  it('narrow non-touch window → iPod (only coarse-landscape opts into iTunes)', () => {
    stubMedia({ '(pointer: coarse)': false, '(max-width: 767px)': true, '(orientation: landscape)': true });
    expect(preferredView()).toBe('ipod');
  });
});

describe('pinned choice', () => {
  it('round-trips through localStorage and ignores junk values', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
    expect(getPinnedView()).toBeNull();
    pinView('itunes');
    expect(getPinnedView()).toBe('itunes');
    store['ipod-view-pref'] = 'nonsense';
    expect(getPinnedView()).toBeNull();
  });
});
