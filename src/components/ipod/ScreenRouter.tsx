'use client';

import { useEffect, useRef, useState } from 'react';
import type { Frame } from '@/lib/store/ipodStore';
import { useIpodStore } from '@/lib/store/ipodStore';
import CoverFlowView from './views/CoverFlowView';
import ListView from './views/ListView';
import NowPlayingView from './views/NowPlayingView';
import PhotoView from './views/PhotoView';
import SplitMenuView from './views/SplitMenuView';
import TextReaderView from './views/TextReaderView';
import TweetView from './views/TweetView';
import VideoView from './views/VideoView';
import styles from './ScreenRouter.module.css';

const SLIDE_MS = 180;

function renderView(frame: Frame, live: boolean) {
  switch (frame.view) {
    case 'splitMenu':
      return <SplitMenuView frame={frame} />;
    case 'list':
    case 'settings':
      return <ListView frame={frame} />;
    case 'coverflow':
      return <CoverFlowView frame={frame} />;
    case 'textReader':
      return <TextReaderView frame={frame} />;
    case 'video':
      return live ? <VideoView frame={frame} /> : null;
    case 'nowPlaying':
      return live ? <NowPlayingView frame={frame} /> : null;
    case 'photo':
      return <PhotoView frame={frame} />;
    case 'tweet':
      return <TweetView frame={frame} />;
    default:
      return null;
  }
}

interface Outgoing {
  frame: Frame;
  dir: 'push' | 'pop';
}

export default function ScreenRouter() {
  const top = useIpodStore((s) => s.stack[s.stack.length - 1]);
  const [outgoing, setOutgoing] = useState<Outgoing | null>(null);
  const prevTop = useRef<Frame>(top);

  useEffect(() => {
    const prev = prevTop.current;
    prevTop.current = top;
    if (prev.key === top.key) return;
    setOutgoing({ frame: prev, dir: top.key > prev.key ? 'push' : 'pop' });
    const timer = setTimeout(() => setOutgoing(null), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [top]);

  const dir = outgoing?.dir;
  return (
    <div className={styles.viewport} data-testid="screen-view" data-view={top.view}>
      {outgoing && (
        <div
          key={`out-${outgoing.frame.key}`}
          className={`${styles.layer} ${dir === 'push' ? styles.outLeft : styles.outRight}`}
        >
          {renderView(outgoing.frame, false)}
        </div>
      )}
      <div
        key={top.key}
        className={`${styles.layer} ${
          dir === 'push' ? styles.inRight : dir === 'pop' ? styles.inLeft : ''
        }`}
      >
        {renderView(top, true)}
      </div>
    </div>
  );
}
