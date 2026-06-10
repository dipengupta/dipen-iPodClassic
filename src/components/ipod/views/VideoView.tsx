'use client';

import type { Frame } from '@/lib/store/ipodStore';
import styles from './VideoView.module.css';

/**
 * YouTube videos play in the persistent PlayersLayer stage that covers this
 * frame, so the YT branch is just a black backdrop for the slide animation.
 * Instagram reels render here directly (no persistence needed).
 */
export default function VideoView({ frame }: { frame: Frame }) {
  const payload = frame.payload;

  if (payload?.reelShortcode) {
    return (
      <div className={styles.stage}>
        {/* Instagram's embed has a ~326px min width; render native-size and scale to fit. */}
        <div className={styles.reelScaler}>
          <iframe
            className={styles.reel}
            data-testid="reel-player"
            src={`https://www.instagram.com/reel/${payload.reelShortcode}/embed/`}
            title={payload.title ?? 'Instagram reel'}
            allow="encrypted-media"
          />
        </div>
        <a
          className={styles.openLink}
          href={`https://www.instagram.com/reel/${payload.reelShortcode}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Instagram ↗
        </a>
      </div>
    );
  }

  return <div className={styles.stage} data-testid="video-backdrop" />;
}
