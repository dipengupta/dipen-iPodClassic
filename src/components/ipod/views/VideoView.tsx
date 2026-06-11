'use client';

import styles from './VideoView.module.css';

/**
 * Both video sources play in persistent layers that cover this frame —
 * YouTube in PlayersLayer's IFrame stage, UGG episodes in UggStage — so the
 * frame itself is just a black backdrop for the slide animation.
 */
export default function VideoView() {
  return <div className={styles.stage} data-testid="video-backdrop" />;
}
