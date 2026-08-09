'use client';

import { useMemo, useState } from 'react';
import type { TweetCard, TweetsData } from '@/lib/itunes/types';
import styles from './TweetsView.module.css';
import { useFocusScroll } from './useFocusScroll';

type Order = 'latest' | 'shuffle';

function shuffle<T>(rows: T[]): T[] {
  const out = [...rows];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A Twitter-style feed for the pennguytweets archive, with an order toggle. */
export default function TweetsView({ data, focusId }: { data: TweetsData; focusId?: string }) {
  const [order, setOrder] = useState<Order>('latest');
  const setFocusRef = useFocusScroll(focusId);
  const list = useMemo(
    () => (order === 'shuffle' ? shuffle(data.tweets) : data.tweets),
    [order, data.tweets],
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.avatar} aria-hidden="true">
          🐧
        </div>
        <div className={styles.who}>
          <span className={styles.name}>{data.displayName}</span>
          <span className={styles.handle}>@{data.handle}</span>
        </div>
        <div className={styles.toggle} role="group" aria-label="Order">
          <button
            type="button"
            className={`${styles.toggleBtn} ${order === 'latest' ? styles.active : ''}`}
            aria-pressed={order === 'latest'}
            onClick={() => setOrder('latest')}
          >
            Latest
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${order === 'shuffle' ? styles.active : ''}`}
            aria-pressed={order === 'shuffle'}
            onClick={() => setOrder('shuffle')}
          >
            Shuffle
          </button>
        </div>
      </header>
      <div className={styles.feed} data-testid="itunes-tweets">
        {list.map((t) => (
          <Tweet
            key={t.id}
            tweet={t}
            handle={data.handle}
            displayName={data.displayName}
            innerRef={t.id === focusId ? setFocusRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function Tweet({
  tweet,
  handle,
  displayName,
  innerRef,
}: {
  tweet: TweetCard;
  handle: string;
  displayName: string;
  innerRef?: (el: HTMLElement | null) => void;
}) {
  const date = fmtDate(tweet.date);
  return (
    <article className={styles.tweet} ref={innerRef}>
      <div className={styles.avatarSm} aria-hidden="true">
        🐧
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.name}>{displayName}</span>
          <span className={styles.handle}>@{handle}</span>
          {date && <span className={styles.dot}>·</span>}
          {date && <span className={styles.date}>{date}</span>}
        </div>
        <p className={styles.text}>{tweet.text}</p>
        <div className={styles.foot}>
          {tweet.number !== null && <span className={styles.num}>#{tweet.number}</span>}
          {tweet.url && (
            <a className={styles.link} href={tweet.url} target="_blank" rel="noopener noreferrer">
              View on X ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
