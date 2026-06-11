'use client';

import { useEffect } from 'react';
import { formatRemaining, formatTime } from '@/lib/players/time';
import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './ScrubOsd.module.css';

/** Scrub mode dozes off (and the bar fades) after this much idle time. */
const SCRUB_IDLE_MS = 3000;

/**
 * The wheel-seek bar summoned by a center press on a playback screen. It
 * overlays both video stages (rendered by PlayersLayer, above them); the
 * Now Playing card draws its own bar and only borrows the idle timer here.
 */
export default function ScrubOsd() {
  const top = useIpodStore((s) => s.stack[s.stack.length - 1]);
  const scrubbing = useIpodStore((s) => s.scrubbing);
  const scrubNonce = useIpodStore((s) => s.scrubNonce);
  const progress = useIpodStore((s) => s.progress);
  const setScrubbing = useIpodStore((s) => s.setScrubbing);

  // Auto-exit scrub mode when the wheel goes quiet (any playback screen).
  useEffect(() => {
    if (!scrubbing) return;
    const timer = setTimeout(() => setScrubbing(false), SCRUB_IDLE_MS);
    return () => clearTimeout(timer);
  }, [scrubbing, scrubNonce, setScrubbing]);

  const visible = scrubbing && top.view === 'video';
  const fraction =
    progress.duration > 0 ? Math.min(1, progress.position / progress.duration) : 0;

  return (
    <div
      className={`${styles.osd} ${visible ? styles.visible : ''}`}
      data-testid="scrub-osd"
      aria-hidden={!visible}
    >
      <span className={styles.time}>{formatTime(progress.position)}</span>
      <div className={styles.track}>
        <div className={styles.fill} style={{ transform: `scaleX(${fraction})` }} />
        <div className={styles.handle} style={{ left: `${fraction * 100}%` }} />
      </div>
      <span className={styles.time}>{formatRemaining(progress.position, progress.duration)}</span>
    </div>
  );
}
