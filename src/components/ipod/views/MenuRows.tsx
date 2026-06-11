'use client';

import type { FrameItem } from '@/lib/menu/types';
import styles from './rows.module.css';

const ROW_HEIGHT = 22;
/** Rows rendered beyond the viewport on each side. Generous so short lists
    (≤ ~60 rows) still mount fully, while huge ones (710 tweets) stay cheap. */
const OVERSCAN = 25;

interface MenuRowsProps {
  items: FrameItem[] | null;
  selectedIndex: number;
  /** Visible height in logical px (screen body is 220). */
  height: number;
  showChevrons?: boolean;
}

/** Scrolling row list shared by ListView, SplitMenuView and settings. */
export default function MenuRows({ items, selectedIndex, height, showChevrons = true }: MenuRowsProps) {
  if (items === null) {
    return <div className={styles.empty}>Loading…</div>;
  }
  if (items.length === 0) {
    return <div className={styles.empty}>Nothing here yet.</div>;
  }

  const visibleRows = Math.floor(height / ROW_HEIGHT);
  const first = Math.max(0, Math.min(selectedIndex - visibleRows + 1, items.length - visibleRows));
  const overflows = items.length > visibleRows;
  const thumbHeight = Math.max(12, (visibleRows / items.length) * height);
  const thumbTop = items.length > 1
    ? (selectedIndex / (items.length - 1)) * (height - thumbHeight)
    : 0;

  // Window the rendered rows: only the viewport ± OVERSCAN exists in the
  // DOM; a spacer keeps the translated container's geometry identical.
  const start = Math.max(0, first - OVERSCAN);
  const end = Math.min(items.length, first + visibleRows + OVERSCAN);

  return (
    <div className={styles.list} style={{ height }}>
      <div className={styles.rows} style={{ transform: `translateY(${-first * ROW_HEIGHT}px)` }}>
        {start > 0 && <div aria-hidden style={{ height: start * ROW_HEIGHT }} />}
        {items.slice(start, end).map((item, offset) => {
          const i = start + offset;
          return (
            <div
              key={item.id}
              className={`${styles.row} ${i === selectedIndex ? styles.selected : ''}`}
              data-testid="menu-row"
              data-selected={i === selectedIndex || undefined}
              style={{ paddingRight: overflows ? 12 : 6 }}
            >
              <span className={styles.rowLabel}>{item.label}</span>
              {item.sublabel && <span className={styles.rowSub}>{item.sublabel}</span>}
              {showChevrons && item.onSelect && <span className={styles.chevron}>›</span>}
            </div>
          );
        })}
      </div>
      {overflows && (
        <div className={styles.scrollbar}>
          <div className={styles.scrollThumb} style={{ height: thumbHeight, top: thumbTop }} />
        </div>
      )}
    </div>
  );
}
