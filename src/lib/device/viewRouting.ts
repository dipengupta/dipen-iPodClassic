'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Device-aware selection between the two front-ends:
 *   - iPod  (`/`)        — small / touch screens, portrait phones
 *   - iTunes (`/itunes`) — large screens, and phones rotated to landscape
 *
 * This module is the authoritative copy of the selection rule. The same rule is
 * also inlined as a pre-hydration <script> in `app/layout.tsx` (which can't
 * import) to avoid a flash on first load — keep the two in sync.
 */

export type View = 'ipod' | 'itunes';

/** localStorage key holding an explicit, sticky user choice. */
export const VIEW_PREF_KEY = 'ipod-view-pref';

const ROUTE: Record<View, string> = { ipod: '/', itunes: '/itunes' };

/**
 * Which view this device should show, ignoring any pinned choice.
 *   - landscape + coarse pointer → iTunes (the tilt feature)
 *   - otherwise coarse / narrow  → iPod
 *   - otherwise (desktop)        → iTunes
 */
export function preferredView(): View {
  if (typeof window === 'undefined' || !window.matchMedia) return 'ipod';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.matchMedia('(max-width: 767px)').matches;
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  if (coarse && landscape) return 'itunes';
  if (coarse || small) return 'ipod';
  return 'itunes';
}

/** The user's pinned choice, or null if they've never explicitly switched. */
export function getPinnedView(): View | null {
  try {
    const v = localStorage.getItem(VIEW_PREF_KEY);
    return v === 'ipod' || v === 'itunes' ? v : null;
  } catch {
    return null;
  }
}

/** Persist an explicit choice so a deliberate switch sticks across reloads. */
export function pinView(v: View): void {
  try {
    localStorage.setItem(VIEW_PREF_KEY, v);
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
}

/**
 * Persist an explicit choice carried as a `?view=` query param, then keep the
 * route in step with a live device rotation.
 *
 * Cross-links navigate to `/?view=ipod` or `/itunes?view=itunes`: the intent
 * rides in the URL so it survives the navigation regardless of hydration timing
 * (an `onClick` handler can race the click). This hook reads the param, pins it,
 * and cleans the URL.
 *
 * Load-time routing (desktop → iTunes, portrait/narrow → iPod) is handled by the
 * pre-hydration script in `app/layout.tsx`; the only redirect this hook owns is
 * the live two-way tilt — while nothing is pinned, switch between iPod (portrait)
 * and iTunes (landscape) as the orientation changes. A pinned choice suppresses
 * it so an explicit switch is never undone.
 */
export function useViewSync(current: View): void {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('view');
    if (q === 'ipod' || q === 'itunes') {
      pinView(q);
      params.delete('view');
      const qs = params.toString();
      router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }

    const mql = window.matchMedia('(orientation: landscape)');
    const onChange = () => {
      if (getPinnedView()) return;
      const want = preferredView();
      if (want !== current) router.replace(ROUTE[want]);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [current, router]);
}
