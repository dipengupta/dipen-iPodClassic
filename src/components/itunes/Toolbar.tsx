'use client';

import LcdStatus, { type LcdNowPlaying } from './LcdStatus';
import styles from './Toolbar.module.css';

export type GalleryMode = 'grid' | 'coverflow';

interface ToolbarProps {
  nowPlaying: LcdNowPlaying | null;
  playing: boolean;
  canPlay: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  volume: number;
  onVolume: (volume: number) => void;
  showGalleryToggle: boolean;
  galleryMode: GalleryMode;
  onGalleryMode: (mode: GalleryMode) => void;
}

// Apple-style transport glyphs (filled triangles + bars), drawn as SVG.
const ICON = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;

const PrevIcon = () => (
  <svg {...ICON}>
    <path d="M6 6h2.3v12H6z" />
    <path d="M20 6v12l-9.5-6z" />
  </svg>
);
const NextIcon = () => (
  <svg {...ICON}>
    <path d="M4 6v12l9.5-6z" />
    <path d="M15.7 6H18v12h-2.3z" />
  </svg>
);
const PlayIcon = () => (
  <svg {...ICON}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg {...ICON}>
    <path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" />
  </svg>
);
const SpeakerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 8.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** The main toolbar: transport (left), now-playing display (center), volume + view toggle (right). */
export default function Toolbar({
  nowPlaying,
  playing,
  canPlay,
  hasPrev,
  hasNext,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  volume,
  onVolume,
  showGalleryToggle,
  galleryMode,
  onGalleryMode,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar} data-testid="itunes-toolbar">
      <div className={styles.left}>
        <button type="button" className={styles.btn} onClick={onPrev} disabled={!hasPrev} aria-label="Previous">
          <PrevIcon />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.play}`}
          onClick={onPlayPause}
          disabled={!canPlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button type="button" className={styles.btn} onClick={onNext} disabled={!hasNext} aria-label="Next">
          <NextIcon />
        </button>
        <div className={styles.volume}>
          <span className={styles.speaker}>
            <SpeakerIcon />
          </span>
          <input
            type="range"
            className={styles.volRange}
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
      </div>
      <div className={styles.center}>
        <LcdStatus nowPlaying={nowPlaying} onSeek={onSeek} />
      </div>
      <div className={styles.right}>
        {showGalleryToggle && (
          <div className={styles.toggle} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.toggleBtn} ${galleryMode === 'grid' ? styles.active : ''}`}
              aria-pressed={galleryMode === 'grid'}
              onClick={() => onGalleryMode('grid')}
            >
              Grid
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${galleryMode === 'coverflow' ? styles.active : ''}`}
              aria-pressed={galleryMode === 'coverflow'}
              onClick={() => onGalleryMode('coverflow')}
            >
              Cover Flow
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
