'use client';

import type { SearchData } from '@/lib/itunes/types';
import styles from './SearchResults.module.css';

/** Split `text` on `query` (case-insensitive) and wrap matches in <mark>. */
function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  for (;;) {
    const at = lower.indexOf(needle, i);
    if (at < 0) {
      out.push(text.slice(i));
      break;
    }
    if (at > i) out.push(text.slice(i, at));
    out.push(
      <mark key={key++} className={styles.mark}>
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    i = at + needle.length;
  }
  return out;
}

interface Props {
  data: SearchData;
  onOpen: (entryId: string, focusId: string) => void;
}

export default function SearchResults({ data, onOpen }: Props) {
  if (data.total === 0) {
    return (
      <div className={styles.empty} data-testid="itunes-search-empty">
        No results for “{data.query}”.
      </div>
    );
  }

  return (
    <div className={styles.results} data-testid="itunes-search-results">
      <p className={styles.summary}>
        {data.total} result{data.total === 1 ? '' : 's'} for “{data.query}”
      </p>
      {data.groups.map((group) => (
        <section key={group.type} className={styles.group}>
          <h3 className={styles.heading}>
            {group.label} <span className={styles.count}>{group.results.length}</span>
          </h3>
          <ul className={styles.list}>
            {group.results.map((r) => (
              <li key={`${r.entryId}:${r.id}`}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => onOpen(r.entryId, r.id)}
                  data-testid="itunes-search-result"
                >
                  <span className={styles.title}>{highlight(r.title, data.query)}</span>
                  {r.snippet && <span className={styles.snippet}>{highlight(r.snippet, data.query)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
