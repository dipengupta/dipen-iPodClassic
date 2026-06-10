'use client';

import type { Frame } from '@/lib/store/ipodStore';
import MenuRows from './MenuRows';
import styles from './SplitMenuView.module.css';

const BODY_HEIGHT = 220;

/** Classic-style main menu: rows on the left, preview pane on the right. */
export default function SplitMenuView({ frame }: { frame: Frame }) {
  const selected = frame.items?.[frame.selectedIndex];
  return (
    <div className={styles.split}>
      <div className={styles.left}>
        <MenuRows
          items={frame.items}
          selectedIndex={frame.selectedIndex}
          height={BODY_HEIGHT}
        />
      </div>
      <div className={styles.preview}>
        {selected?.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element -- fixed-size logical screen; next/image adds nothing here
          <img src={selected.imagePath} alt="" className={styles.previewImage} />
        ) : (
          <div className={styles.previewFallback}>
            <span className={styles.previewGlyph}>♫</span>
            <span className={styles.previewLabel}>{selected?.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
