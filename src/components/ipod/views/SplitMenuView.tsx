'use client';

import { useEffect, useState } from 'react';
import { loadItems } from '@/lib/menu/dataSources';
import type { DataSourceKey, FrameItem, MenuNode } from '@/lib/menu/types';
import type { Frame } from '@/lib/store/ipodStore';
import MenuRows from './MenuRows';
import styles from './SplitMenuView.module.css';

const BODY_HEIGHT = 220;

/** Image-backed coverflow sections: their preview re-rolls on every highlight. */
const RANDOM_PREVIEW_SOURCES = new Set<DataSourceKey>(['guitars', 'photos', 'kitchen']);

/** Section image pools, fetched once per session via the normal builders. */
const poolPromises = new Map<DataSourceKey, Promise<string[]>>();

function getPool(source: DataSourceKey, node: MenuNode): Promise<string[]> {
  let pool = poolPromises.get(source);
  if (!pool) {
    pool = loadItems(node)
      .then((items) =>
        items.map((item) => item.imagePath).filter((path): path is string => Boolean(path)),
      )
      .catch(() => {
        // Don't cache a failure; the next highlight retries.
        poolPromises.delete(source);
        return [];
      });
    poolPromises.set(source, pool);
  }
  return pool;
}

function randomPreviewNode(item: FrameItem | undefined): MenuNode | null {
  if (item?.onSelect?.kind !== 'node') return null;
  const node = item.onSelect.node;
  return node.dataSource && RANDOM_PREVIEW_SOURCES.has(node.dataSource) ? node : null;
}

/**
 * For image-backed coverflow rows, surprise with a random image from the
 * section instead of the one static previewImage (which stays as the
 * fallback until the pool loads).
 */
function useRandomPreview(item: FrameItem | undefined, selectedIndex: number): string | undefined {
  const [pick, setPick] = useState<{ source: DataSourceKey; path: string } | null>(null);
  const node = randomPreviewNode(item);
  const source = node?.dataSource;

  useEffect(() => {
    if (!node || !source) return;
    let cancelled = false;
    void getPool(source, node).then((pool) => {
      if (cancelled || pool.length === 0) return;
      setPick((previous) => {
        let next = pool[Math.floor(Math.random() * pool.length)];
        if (pool.length > 1 && next === previous?.path) {
          next = pool[(pool.indexOf(next) + 1) % pool.length];
        }
        return { source, path: next };
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-roll per highlight
  }, [source, node?.id, selectedIndex]);

  // Only serve a pick that belongs to the highlighted row's own section.
  return source && pick?.source === source ? pick.path : undefined;
}

/** Classic-style main menu: rows on the left, preview pane on the right. */
export default function SplitMenuView({ frame }: { frame: Frame }) {
  const selected = frame.items?.[frame.selectedIndex];
  const randomPreview = useRandomPreview(selected, frame.selectedIndex);
  const imagePath = randomPreview ?? selected?.imagePath;
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
        {imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element -- fixed-size logical screen; next/image adds nothing here
          <img src={imagePath} alt="" className={styles.previewImage} decoding="async" />
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
