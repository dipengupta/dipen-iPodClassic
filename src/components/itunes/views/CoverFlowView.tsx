'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoverItem } from '@/lib/itunes/types';
import { COVER, RENDER_WINDOW, coverDim, coverOpacity, coverTransform } from './coverflowMath';
import styles from './CoverFlowView.module.css';

/**
 * Desktop Cover Flow — a fork of the iPod's CoverFlowView. The pure transform
 * math lives in ./coverflowMath; focus is driven by local React state (click /
 * arrow keys / wheel / the horizontal scrubber). The focused item's caption +
 * description fill the space below the covers. The image-size slider enlarges
 * the covers in place (the perspective is fixed — not a scene zoom).
 */

export default function CoverFlowView({ items, scale = 1, focusId }: { items: CoverItem[]; scale?: number; focusId?: string }) {
  const [focused, setFocused] = useState(0);
  const wheelAt = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocused(0);
  }, [items]);

  // A search result deep-links to a specific cover — center it.
  useEffect(() => {
    if (!focusId) return;
    const i = items.findIndex((item) => item.id === focusId);
    if (i >= 0) setFocused(i);
  }, [focusId, items]);

  const move = useCallback(
    (delta: number) => setFocused((f) => Math.max(0, Math.min(items.length - 1, f + delta))),
    [items.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
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
  const cover = COVER * scale;

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
                transform: coverTransform(offset, scale),
                opacity: coverOpacity(offset),
                zIndex: 20 - Math.abs(offset),
                width: cover,
                height: cover,
                marginLeft: -cover / 2,
                marginTop: -cover / 2,
              }}
              onClick={() => !isFocused && setFocused(i)}
            >
              <div className={styles.card} data-testid={isFocused ? 'itunes-focused-cover' : undefined}>
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
              <div className={styles.dim} style={{ opacity: coverDim(offset) }} aria-hidden="true" />
            </div>
          );
        })}
      </div>
      {items.length > 1 && (
        <input
          type="range"
          className={styles.scroll}
          data-testid="itunes-coverflow-scroll"
          min={0}
          max={items.length - 1}
          step={1}
          value={focused}
          onChange={(e) => setFocused(Number(e.target.value))}
          aria-label="Scroll covers"
        />
      )}
      <div className={styles.caption} data-testid="itunes-coverflow-caption">
        <span className={styles.captionTitle}>{current?.label}</span>
        {current?.flipText && <p className={styles.captionDesc}>{current.flipText}</p>}
        <span className={styles.captionIndex}>
          {focused + 1} of {items.length}
        </span>
      </div>
    </div>
  );
}
