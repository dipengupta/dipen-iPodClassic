'use client';

import { useEffect, useRef } from 'react';
import {
  initSoundcloud,
  soundcloudPause,
  soundcloudPlay,
  soundcloudPlayerSrc,
  soundcloudToggle,
} from '@/lib/players/soundcloud';
import { initYoutube, youtubeLoad, youtubePause, youtubeToggle } from '@/lib/players/youtube';
import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './PlayersLayer.module.css';

const YT_ELEMENT_ID = 'ipod-yt-player';

/**
 * The persistent players. Both live here for the whole session: the YouTube
 * player is revealed (opacity) only on its now-playing frame so audio keeps
 * playing while browsing; the SoundCloud widget is permanently off-screen.
 */
export default function PlayersLayer() {
  const playback = useIpodStore((s) => s.playback);
  const playPauseNonce = useIpodStore((s) => s.playPauseNonce);
  const top = useIpodStore((s) => s.stack[s.stack.length - 1]);
  const setPlaying = useIpodStore((s) => s.setPlaying);
  const skipTrack = useIpodStore((s) => s.skipTrack);

  const scIframeRef = useRef<HTMLIFrameElement>(null);
  const nonceMounted = useRef(false);
  const lastStarted = useRef<string>('');

  useEffect(() => {
    initYoutube(YT_ELEMENT_ID, { onPlaying: setPlaying, onEnded: () => skipTrack(1) });
    if (scIframeRef.current) {
      void initSoundcloud(scIframeRef.current, setPlaying);
    }
  }, [setPlaying, skipTrack]);

  // Start/refresh playback whenever the selected source+track changes.
  useEffect(() => {
    if (!playback.source || playback.index < 0) return;
    const track = playback.queue[playback.index];
    if (!track) return;
    const startKey = `${playback.source}:${playback.index}:${track.id}`;
    if (lastStarted.current === startKey) return;
    lastStarted.current = startKey;
    if (playback.source === 'youtube') {
      soundcloudPause();
      youtubeLoad(track.id);
    } else {
      youtubePause();
      soundcloudPlay(Number(track.id));
    }
  }, [playback.source, playback.index, playback.queue]);

  // Space / center press toggles whichever source is active.
  useEffect(() => {
    if (!nonceMounted.current) {
      nonceMounted.current = true;
      return;
    }
    const { source } = useIpodStore.getState().playback;
    if (source === 'youtube') youtubeToggle();
    else if (source === 'soundcloud') soundcloudToggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire only on the press
  }, [playPauseNonce]);

  const watching =
    top.view === 'video' && Boolean(top.payload?.videoId) && playback.source === 'youtube';

  return (
    <>
      <div
        className={`${styles.ytStage} ${watching ? styles.visible : ''}`}
        data-testid="yt-stage"
        data-watching={watching || undefined}
      >
        <div id={YT_ELEMENT_ID} />
      </div>
      <div className={styles.hiddenPlayers} aria-hidden="true">
        <iframe
          ref={scIframeRef}
          src={soundcloudPlayerSrc()}
          title="SoundCloud audio player"
          allow="autoplay"
          data-testid="sc-widget"
        />
      </div>
    </>
  );
}
