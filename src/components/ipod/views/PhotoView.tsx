'use client';

import { useEffect, useRef } from 'react';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './PhotoView.module.css';

const VIEW_HEIGHT = 220;

/** A photo with optional caption text below it (Octavium, gallery items). */
export default function PhotoView({ frame }: { frame: Frame }) {
  const setMaxScroll = useIpodStore((s) => s.setMaxScroll);
  const contentRef = useRef<HTMLDivElement>(null);
  const payload = frame.payload;

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      setMaxScroll(frame.key, Math.max(0, content.scrollHeight - VIEW_HEIGHT));
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [frame.key, setMaxScroll]);

  return (
    <div className={styles.window}>
      <div
        ref={contentRef}
        className={styles.content}
        style={{ transform: `translateY(${-frame.scrollOffset}px)` }}
      >
        {payload?.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element -- fixed-size logical screen
          <img src={payload.imagePath} alt={payload.title ?? ''} className={styles.photo} />
        )}
        {payload?.text && <p className={styles.caption}>{payload.text}</p>}
      </div>
    </div>
  );
}
