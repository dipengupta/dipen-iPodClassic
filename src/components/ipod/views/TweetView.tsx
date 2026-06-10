'use client';

import { useEffect, useState } from 'react';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './TweetView.module.css';

interface Tweet {
  text: string;
  postedAt: string | null;
  url: string | null;
  isSample: boolean;
}

/** A random pennguytweet; center press shuffles to another. */
export default function TweetView(_props: { frame: Frame }) {
  const tweetNonce = useIpodStore((s) => s.tweetNonce);
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch('/api/tweets/random')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { tweet: Tweet }) => {
        if (!cancelled) setTweet(data.tweet);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tweetNonce]);

  return (
    <div className={styles.stage} data-testid="tweet-view">
      <div className={styles.card}>
        <p className={styles.handle}>@20swithepennguy</p>
        {error && <p className={styles.text}>Could not load a tweet.</p>}
        {!error && <p className={styles.text}>{tweet ? tweet.text : 'Loading…'}</p>}
        {tweet?.postedAt && <p className={styles.date}>{tweet.postedAt}</p>}
      </div>
      <p className={styles.hint}>Press the center button for another</p>
    </div>
  );
}
