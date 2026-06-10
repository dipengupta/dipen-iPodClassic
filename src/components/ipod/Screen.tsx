'use client';

import { useEffect, useRef } from 'react';
import ScreenRouter from './ScreenRouter';
import StatusBar from './StatusBar';
import styles from './Screen.module.css';

export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 240;

/**
 * The screen renders at a fixed 320x240 logical resolution (the real
 * Classic's) and is scaled to fit the physical cutout, so every view's CSS
 * is written once in logical pixels.
 */
export default function Screen() {
  const cutoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cutout = cutoutRef.current!;
    const observer = new ResizeObserver(([entry]) => {
      const scale = entry.contentRect.width / LOGICAL_WIDTH;
      cutout.style.setProperty('--screen-scale', String(scale));
    });
    observer.observe(cutout);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.bezel}>
      <div ref={cutoutRef} className={styles.cutout} data-testid="screen">
        <div className={styles.logical}>
          <StatusBar />
          <ScreenRouter />
        </div>
      </div>
    </div>
  );
}
