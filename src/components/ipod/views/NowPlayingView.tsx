'use client';

import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './NowPlayingView.module.css';

/**
 * The classic audio Now Playing card (SoundCloud). The actual audio comes
 * from the persistent hidden widget in PlayersLayer; this view just shows
 * what's playing, with EQ bars that pause when playback does.
 */
export default function NowPlayingView(_props: { frame: Frame }) {
  const playback = useIpodStore((s) => s.playback);
  const track = playback.queue[playback.index];

  return (
    <div
      className={`${styles.card} ${playback.playing ? '' : styles.paused}`}
      data-testid="now-playing"
      data-playing={playback.playing || undefined}
    >
      <p className={styles.source}>SoundCloud</p>
      <p className={styles.title}>{track?.title ?? '—'}</p>
      <div className={styles.eq} aria-hidden="true">
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </div>
      <p className={styles.counter}>
        {playback.index + 1} of {playback.queue.length}
      </p>
      <p className={styles.hint}>⏮ ⏭ to skip · Space to pause</p>
    </div>
  );
}
