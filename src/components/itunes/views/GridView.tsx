'use client';

import { useState } from 'react';
import type { CoverItem } from '@/lib/itunes/types';
import styles from './GridView.module.css';
import { useFocusScroll } from './useFocusScroll';

/** iTunes "grid" / album view: a wall of artwork with flip-to-read backs. */
export default function GridView({ items, scale = 1, focusId }: { items: CoverItem[]; scale?: number; focusId?: string }) {
  const [flipped, setFlipped] = useState<string | null>(null);
  const setFocusRef = useFocusScroll(focusId);
  return (
    <div className={styles.wrap} data-testid="itunes-grid">
      <div className={styles.grid} style={{ ['--tile' as string]: `${Math.round(150 * scale)}px` }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            ref={item.id === focusId ? setFocusRef : undefined}
            className={styles.cell}
            onClick={() => setFlipped((f) => (f === item.id ? null : item.id))}
          >
            <div className={`${styles.card} ${flipped === item.id ? styles.flipped : ''}`}>
              <div className={styles.front}>
                {item.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element -- committed pre-optimized WebP
                  <img src={item.imagePath} alt={item.label} className={styles.image} loading="lazy" decoding="async" />
                ) : (
                  <div className={styles.placeholder}>☕</div>
                )}
              </div>
              <div className={styles.back}>
                <p className={styles.backText}>{item.flipText ?? item.label}</p>
              </div>
            </div>
            <span className={styles.caption}>{item.label}</span>
            {item.sublabel && <span className={styles.sub}>{item.sublabel}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
