'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReadingData, ReadingEntry } from '@/lib/itunes/types';
import styles from './ReadingPane.module.css';

interface ArticleResponse {
  article: { bodyHtml: string };
}

export default function ReadingPane({ data }: { data: ReadingData }) {
  const entries = data.entries;
  const [selectedId, setSelectedId] = useState(entries[0]?.id);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  // Reset selection when the section changes (entries identity changes).
  useEffect(() => {
    setSelectedId(entries[0]?.id);
  }, [entries]);

  const selected = entries.find((e) => e.id === selectedId);

  useEffect(() => {
    if (!selected?.articleSlug || bodies[selected.id] !== undefined) return;
    const id = ++reqId.current;
    setLoading(true);
    fetch(`/api/articles/${selected.articleSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: ArticleResponse) => {
        if (id === reqId.current) setBodies((b) => ({ ...b, [selected.id]: json.article.bodyHtml }));
      })
      .catch(() => {
        if (id === reqId.current) setBodies((b) => ({ ...b, [selected.id]: '' }));
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [selected, bodies]);

  const grouped = useMemo(() => groupByHeading(entries), [entries]);

  return (
    <div className={styles.wrap}>
      <nav className={styles.list} aria-label="Entries">
        {grouped.map((group) => (
          <div key={group.heading ?? '_'} className={styles.group}>
            {group.heading && <p className={styles.groupHeading}>{group.heading}</p>}
            {group.entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`${styles.item} ${entry.id === selectedId ? styles.selected : ''}`}
                aria-current={entry.id === selectedId || undefined}
                onClick={() => setSelectedId(entry.id)}
              >
                <span className={styles.itemTitle}>{entry.title}</span>
                {entry.subtitle && <span className={styles.itemSub}>{entry.subtitle}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <article className={styles.reader}>
        {selected ? (
          <ReaderBody entry={selected} html={bodies[selected.id]} loading={loading} />
        ) : (
          <p className={styles.empty}>Nothing here yet.</p>
        )}
      </article>
    </div>
  );
}

function ReaderBody({
  entry,
  html,
  loading,
}: {
  entry: ReadingEntry;
  html: string | undefined;
  loading: boolean;
}) {
  return (
    <>
      <header className={styles.readerHead}>
        <h1 className={styles.readerTitle}>{entry.title}</h1>
        {entry.subtitle && <p className={styles.readerSub}>{entry.subtitle}</p>}
      </header>
      {entry.articleSlug ? (
        loading && html === undefined ? (
          <p className={styles.muted}>Loading…</p>
        ) : html ? (
          <div
            className={styles.articleHtml}
            // Article bodies are the committed/Substack scrape the iPod already renders.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className={styles.muted}>Could not load this article.</p>
        )
      ) : (
        <div className={styles.text}>{entry.text}</div>
      )}
      {entry.sourceUrl && (
        <a className={styles.source} href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
          View original{entry.sourceLabel ? ` on ${entry.sourceLabel}` : ''} ↗
        </a>
      )}
    </>
  );
}

function groupByHeading(entries: ReadingEntry[]): Array<{ heading?: string; entries: ReadingEntry[] }> {
  const out: Array<{ heading?: string; entries: ReadingEntry[] }> = [];
  for (const entry of entries) {
    const last = out[out.length - 1];
    if (last && last.heading === entry.heading) last.entries.push(entry);
    else out.push({ heading: entry.heading, entries: [entry] });
  }
  return out;
}
