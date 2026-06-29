'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoverItem } from '@/lib/itunes/types';
import { COVER, RENDER_WINDOW, coverDim, coverOpacity, coverTransform } from './coverflowMath';
import styles from './CoverFlowView.module.css';

/**
 * Desktop Cover Flow — a fork of the iPod's CoverFlowView. The pure transform
 * math lives in ./coverflowMath (scaled up for the larger canvas); focus is
 * driven by local React state (click / arrow keys / wheel) instead of the iPod
 * store.
 */

export default function CoverFlowView({ items }: { items: CoverItem[] }) {
  const [focused, setFocused] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const wheelAt = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocused(0);
    setFlipped(false);
  }, [items]);

  const move = useCallback(
    (delta: number) => {
      setFlipped(false);
      setFocused((f) => Math.max(0, Math.min(items.length - 1, f + delta)));
    },
    [items.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped((v) => !v);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelAt.current < 90) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 2) return;
    wheelAt.current = now;
    move(d > 0 ? 1 : -1);
  };

  if (items.length === 0) {
    return <div className={styles.empty}>Nothing here yet.</div>;
  }

  const current = items[focused];

  return (
    <div
      className={styles.stage}
      data-testid="itunes-coverflow"
      ref={stageRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      <div className={styles.flow}>
        {items.map((item, i) => {
          const offset = i - focused;
          if (Math.abs(offset) > RENDER_WINDOW) return null;
          const isFocused = offset === 0;
          return (
            <div
              key={item.id}
              className={styles.coverSlot}
              style={{
                transform: coverTransform(offset),
                opacity: coverOpacity(offset),
                zIndex: 20 - Math.abs(offset),
                width: COVER,
                height: COVER,
                marginLeft: -COVER / 2,
              }}
              onClick={() => (isFocused ? setFlipped((v) => !v) : (setFlipped(false), setFocused(i)))}
            >
              <div
                className={`${styles.card} ${isFocused && flipped ? styles.flippedCard : ''}`}
                data-testid={isFocused ? 'itunes-focused-cover' : undefined}
              >
                <div className={styles.cardFront}>
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- committed pre-optimized WebP
                    <img src={item.imagePath} alt={item.label} className={styles.coverImage} loading="lazy" />
                  ) : (
                    <div className={styles.coverPlaceholder}>
                      <span className={styles.placeholderGlyph}>☕</span>
                      <span className={styles.placeholderLabel}>{item.label}</span>
                    </div>
                  )}
                  <div className={styles.reflection} aria-hidden="true">
                    {item.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element -- decorative reflection
                      <img src={item.imagePath} alt="" className={styles.coverImage} loading="lazy" />
                    ) : (
                      <div className={styles.coverPlaceholder} />
                    )}
                  </div>
                </div>
                <div className={styles.cardBack}>
                  <div className={styles.backText}>{item.flipText ?? item.label}</div>
                </div>
              </div>
              <div className={styles.dim} style={{ opacity: coverDim(offset) }} aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <div className={styles.caption}>
        <span className={styles.captionTitle}>{current?.label}</span>
        <span className={styles.captionIndex}>
          {focused + 1} of {items.length}
        </span>
      </div>
    </div>
  );
}
