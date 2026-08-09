import { useCallback, useEffect, useRef } from 'react';
import styles from './focus.module.css';

/**
 * Deep-link helper for "open the exact item" search results. A view calls this
 * with the active `focusId`, then attaches the returned ref-setter to the element
 * whose id matches. When `focusId` changes the element is scrolled into view and
 * briefly flashed. Returns the flash class too, so views can pre-apply it.
 */
export function useFocusScroll(focusId?: string) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!focusId || !el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add(styles.flash);
    const t = setTimeout(() => el.classList.remove(styles.flash), 1600);
    return () => clearTimeout(t);
  }, [focusId]);

  const setRef = useCallback((el: HTMLElement | null) => {
    ref.current = el;
  }, []);

  return setRef;
}
