'use client';

import { useEffect, useRef } from 'react';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './CoverFlowView.module.css';

/** Covers rendered either side of focus; the rest stay unmounted. */
const RENDER_WINDOW = 5;
const FLIP_TEXT_HEIGHT = 124;

function coverTransform(offset: number): string {
  if (offset === 0) {
    return 'translateX(0) translateZ(70px) rotateY(0deg)';
  }
  const side = Math.sign(offset);
  const x = side * (62 + Math.min(Math.abs(offset), RENDER_WINDOW) * 26);
  return `translateX(${x}px) translateZ(-46px) rotateY(${-side * 62}deg)`;
}

function coverOpacity(offset: number): number {
  const distance = Math.abs(offset);
  return distance >= 3 ? Math.max(0.55, 1 - (distance - 2) * 0.15) : 1;
}

export default function CoverFlowView({ frame }: { frame: Frame }) {
  const setMaxScroll = useIpodStore((s) => s.setMaxScroll);
  const backTextRef = useRef<HTMLDivElement>(null);
  const items = frame.items;
  const focused = frame.selectedIndex;

  useEffect(() => {
    const el = backTextRef.current;
    if (!frame.flipped || !el) {
      setMaxScroll(frame.key, 0);
      return;
    }
    setMaxScroll(frame.key, Math.max(0, el.scrollHeight - FLIP_TEXT_HEIGHT));
  }, [frame.flipped, frame.key, focused, setMaxScroll]);

  if (items === null) {
    return <div className={styles.empty}>Loading…</div>;
  }
  if (items.length === 0) {
    return <div className={styles.empty}>Nothing here yet.</div>;
  }

  const current = items[focused];

  return (
    <div className={styles.stage} data-testid="coverflow" data-flipped={frame.flipped || undefined}>
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
                zIndex: 10 - Math.abs(offset),
                willChange: Math.abs(offset) <= 2 ? 'transform' : undefined,
              }}
            >
              <div
                className={`${styles.card} ${isFocused && frame.flipped ? styles.flippedCard : ''}`}
                data-testid={isFocused ? 'focused-cover' : undefined}
              >
                <div className={styles.cardFront}>
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- fixed-size logical screen
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
                <div className={styles.cardBack} data-testid={isFocused ? 'cover-back' : undefined}>
                  <div className={styles.backWindow}>
                    <div
                      ref={isFocused ? backTextRef : undefined}
                      className={styles.backText}
                      style={{ transform: `translateY(${-frame.scrollOffset}px)` }}
                    >
                      {item.flipText ?? item.label}
                    </div>
                  </div>
                </div>
              </div>
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
