'use client';

import { useEffect, useRef, useState } from 'react';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './VideoView.module.css';

/** Full-screen-takeover player for YouTube videos and Instagram reels. */
export default function VideoView({ frame }: { frame: Frame }) {
  const playPauseNonce = useIpodStore((s) => s.playPauseNonce);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(true);
  const mounted = useRef(false);
  const payload = frame.payload;

  // YouTube IFrame API: wheel center / space toggles play-pause via postMessage.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!payload?.videoId || !iframeRef.current?.contentWindow) return;
    const next = !playing;
    setPlaying(next);
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: next ? 'playVideo' : 'pauseVideo', args: [] }),
      '*',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the play/pause press
  }, [playPauseNonce]);

  if (payload?.videoId) {
    return (
      <div className={styles.stage}>
        <iframe
          ref={iframeRef}
          className={styles.youtube}
          data-testid="youtube-player"
          src={`https://www.youtube.com/embed/${payload.videoId}?enablejsapi=1&autoplay=1&playsinline=1&rel=0`}
          title={payload.title ?? 'YouTube video'}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

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

  return <div className={styles.stage} />;
}
