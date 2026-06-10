'use client';

import { useEffect, useRef, useState } from 'react';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './TextReaderView.module.css';

const VIEW_HEIGHT = 220;

export default function TextReaderView({ frame }: { frame: Frame }) {
  const setMaxScroll = useIpodStore((s) => s.setMaxScroll);
  const contentRef = useRef<HTMLDivElement>(null);
  const payload = frame.payload;
  const [html, setHtml] = useState<string | null>(payload?.html ?? null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!payload?.articleSlug || html) return;
    let cancelled = false;
    fetch(`/api/articles/${payload.articleSlug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { article: { bodyHtml: string } }) => {
        if (!cancelled) setHtml(data.article.bodyHtml);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payload?.articleSlug, html]);

  const hasFooter = Boolean(payload?.sourceUrl);
  const bodyHeight = hasFooter ? VIEW_HEIGHT - 22 : VIEW_HEIGHT;

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      setMaxScroll(frame.key, Math.max(0, content.scrollHeight - bodyHeight));
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [frame.key, bodyHeight, setMaxScroll, html]);

  const loading = payload?.articleSlug && html === null && !error;

  return (
    <div className={styles.reader}>
      <div className={styles.window} style={{ height: bodyHeight }}>
        <div
          ref={contentRef}
          className={styles.content}
          data-testid="reader-content"
          data-scroll={frame.scrollOffset}
          data-max-scroll={frame.maxScroll}
          style={{ transform: `translateY(${-frame.scrollOffset}px)` }}
        >
          {payload?.publishedLabel && <p className={styles.muted}>{payload.publishedLabel}</p>}
          {loading && <p className={styles.muted}>Loading…</p>}
          {error && <p className={styles.muted}>Could not load this article.</p>}
          {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
          {!payload?.articleSlug && payload?.text && (
            <div className={styles.plain}>{payload.text}</div>
          )}
        </div>
      </div>
      {hasFooter && (
        <a
          className={styles.footer}
          href={payload!.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="view-original"
        >
          {payload!.sourceLabel ?? 'View Original'} ↗
        </a>
      )}
    </div>
  );
}
