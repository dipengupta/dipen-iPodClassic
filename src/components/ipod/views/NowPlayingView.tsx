'use client';

import { useEffect, useRef } from 'react';
import { formatRemaining, formatTime } from '@/lib/players/time';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './NowPlayingView.module.css';

const EQ_BARS = 16;

/**
 * The classic audio Now Playing card (SoundCloud). The actual audio comes
 * from the persistent hidden widget in PlayersLayer; this view shows what's
 * playing: a visualizer (simulated — the widget's audio is cross-origin, so
 * real spectrum data is unreachable) that pauses with playback, and the
 * progress bar the wheel seeks through in scrub mode.
 */
export default function NowPlayingView(_props: { frame: Frame }) {
  const playback = useIpodStore((s) => s.playback);
  const progress = useIpodStore((s) => s.progress);
  const scrubbing = useIpodStore((s) => s.scrubbing);
  const track = playback.queue[playback.index];

  // Skip animation: slide the track block in from the direction of travel.
  const prevIndex = useRef(playback.index);
  const slideClass = playback.index >= prevIndex.current ? styles.fromRight : styles.fromLeft;
  useEffect(() => {
    prevIndex.current = playback.index;
  }, [playback.index]);

  const fraction =
    progress.duration > 0 ? Math.min(1, progress.position / progress.duration) : 0;

  return (
    <div
      className={`${styles.card} ${playback.playing ? '' : styles.paused}`}
      data-testid="now-playing"
      data-playing={playback.playing || undefined}
      data-scrubbing={scrubbing || undefined}
    >
      <div className={styles.header}>
        <span className={styles.counter}>
          {playback.index + 1} of {playback.queue.length}
        </span>
        <span className={styles.source}>SoundCloud</span>
      </div>

      <div key={track?.id ?? playback.index} className={`${styles.trackBlock} ${slideClass}`}>
        <p className={styles.title}>{track?.title ?? '—'}</p>
      </div>

      <div className={styles.eq} aria-hidden="true">
        {Array.from({ length: EQ_BARS }, (_, i) => (
          <span key={i} className={styles.bar} />
        ))}
      </div>

      <div className={styles.progressRow}>
        <span className={styles.time}>{formatTime(progress.position)}</span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ transform: `scaleX(${fraction})` }} />
          {scrubbing && <div className={styles.handle} style={{ left: `${fraction * 100}%` }} />}
        </div>
        <span className={styles.time}>{formatRemaining(progress.position, progress.duration)}</span>
      </div>
    </div>
  );
}
