'use client';

import { useEffect, useRef } from 'react';
import {
  initSoundcloud,
  soundcloudPause,
  soundcloudPlay,
  soundcloudPlayerSrc,
  soundcloudToggle,
} from '@/lib/players/soundcloud';
import {
  initSpotify,
  spotifyPause,
  spotifyToggle,
} from '@/lib/players/spotify';
import { uggPause, uggToggle } from '@/lib/players/uggVideo';
import {
  initYoutube,
  youtubeLoad,
  youtubePause,
  youtubeProgress,
  youtubeToggle,
} from '@/lib/players/youtube';
import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './PlayersLayer.module.css';
import ScrubOsd from './ScrubOsd';
import UggStage from './UggStage';

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
  const setProgress = useIpodStore((s) => s.setProgress);
  const skipTrack = useIpodStore((s) => s.skipTrack);

  const scIframeRef = useRef<HTMLIFrameElement>(null);
  const spotifyAudioRef = useRef<HTMLAudioElement>(null);
  const nonceMounted = useRef(false);
  const lastStarted = useRef<string>('');

  useEffect(() => {
    initYoutube(YT_ELEMENT_ID, { onPlaying: setPlaying, onEnded: () => skipTrack(1) });
    if (scIframeRef.current) {
      void initSoundcloud(scIframeRef.current, setPlaying, (position, duration) => {
        if (useIpodStore.getState().playback.source === 'soundcloud') {
          setProgress(position, duration);
        }
      });
    }
    initSpotify(
      spotifyAudioRef.current,
      setPlaying,
      (position, duration) => {
        if (useIpodStore.getState().playback.source === 'spotify') {
          setProgress(position, duration);
        }
      },
      () => skipTrack(1),
    );
  }, [setPlaying, setProgress, skipTrack]);

  // The IFrame API has no progress event; poll while a YouTube video plays.
  useEffect(() => {
    if (playback.source !== 'youtube' || !playback.playing) return;
    const poll = setInterval(() => {
      const p = youtubeProgress();
      if (p) setProgress(p.position, p.duration);
    }, 500);
    return () => clearInterval(poll);
  }, [playback.source, playback.playing, setProgress]);

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
      spotifyPause();
      uggPause();
      youtubeLoad(track.id);
    } else if (playback.source === 'soundcloud') {
      youtubePause();
      spotifyPause();
      uggPause();
      soundcloudPlay(Number(track.id));
    } else if (playback.source === 'spotify') {
      // Spotify preview: the store already started the hidden <audio> inside
      // the user's gesture (spotifyLoad); just silence the other sources.
      youtubePause();
      soundcloudPause();
      uggPause();
    } else {
      // Local (ugg) video: the store already started it inside the user's
      // gesture (uggLoad); just silence the other sources.
      youtubePause();
      soundcloudPause();
      spotifyPause();
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
    else if (source === 'spotify') spotifyToggle();
    else if (source === 'ugg') uggToggle();
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
      <UggStage />
      <ScrubOsd />
      <div className={styles.hiddenPlayers} aria-hidden="true">
        <iframe
          ref={scIframeRef}
          src={soundcloudPlayerSrc()}
          title="SoundCloud audio player"
          allow="autoplay"
          data-testid="sc-widget"
        />
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- audio-only preview engine */}
        {/* preload metadata so the track length is known (and shown) even if
            autoplay is blocked and the track sits paused. */}
        <audio ref={spotifyAudioRef} preload="metadata" data-testid="spotify-audio" />
      </div>
    </>
  );
}
