'use client';

import styles from './LcdStatus.module.css';

export interface LcdNowPlaying {
  title: string;
  subtitle?: string;
  position: number;
  duration: number;
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** The iTunes status "LCD": idle wordmark, or the now-playing track + scrubber. */
export default function LcdStatus({
  nowPlaying,
  onSeek,
}: {
  nowPlaying: LcdNowPlaying | null;
  onSeek?: (seconds: number) => void;
}) {
  if (!nowPlaying) {
    return (
      <div className={styles.lcd} data-idle="true">
        <span className={styles.note}>♫</span>
        <span className={styles.idle}>Dipen&apos;s iTunes</span>
      </div>
    );
  }
  const { title, subtitle, position, duration } = nowPlaying;
  return (
    <div className={styles.lcd}>
      <div className={styles.title}>{title}</div>
      <div className={styles.subRow}>
        {subtitle && <span className={styles.sub}>{subtitle}</span>}
      </div>
      <div className={styles.bar}>
        <span className={styles.time}>{fmt(position)}</span>
        <input
          type="range"
          className={styles.range}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(position, duration || 0)}
          onChange={(e) => onSeek?.(Number(e.target.value))}
          disabled={!onSeek || duration === 0}
          aria-label="Seek"
        />
        <span className={styles.time}>-{fmt(Math.max(0, duration - position))}</span>
      </div>
    </div>
  );
}
