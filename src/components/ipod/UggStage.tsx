'use client';

import { useEffect, useRef, useState } from 'react';
import { registerUggVideo, uggProgress } from '@/lib/players/uggVideo';
import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './UggStage.module.css';

/** How long the caption overlay / title OSD linger after the last input. */
const CAPTION_IDLE_MS = 3000;
const OSD_MS = 2000;
/** Visible caption text window (panel height minus padding), logical px. */
const CAPTION_WINDOW = 80;
/** The stage in logical px (320×240 screen minus the 20px status bar). */
const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 220;

/**
 * The persistent local-video player for UGG Chronicles episodes. Like the
 * YouTube stage, it is mounted once and only *revealed* (opacity) while the
 * top frame is the episode's video frame — behind the menu the audio keeps
 * playing. The element itself is driven through lib/players/uggVideo so the
 * store can start playback inside the user's gesture.
 */
export default function UggStage() {
  const playback = useIpodStore((s) => s.playback);
  const top = useIpodStore((s) => s.stack[s.stack.length - 1]);
  const setPlaying = useIpodStore((s) => s.setPlaying);
  const setProgress = useIpodStore((s) => s.setProgress);
  const skipTrack = useIpodStore((s) => s.skipTrack);
  const setMaxScroll = useIpodStore((s) => s.setMaxScroll);
  const setMaxPan = useIpodStore((s) => s.setMaxPan);
  const captionNonce = useIpodStore((s) => s.captionNonce);
  const videoFullscreen = useIpodStore((s) => s.videoFullscreen);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captionTextRef = useRef<HTMLDivElement>(null);
  const captionMounted = useRef(false);
  const [failed, setFailed] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [osdVisible, setOsdVisible] = useState(true);

  const track = playback.source === 'ugg' ? playback.queue[playback.index] : undefined;
  const watching = Boolean(track) && top.view === 'video' && Boolean(top.payload?.videoSrc);
  const paused = Boolean(track) && !playback.playing;

  // Flash the title OSD on every episode change.
  useEffect(() => {
    if (!track?.videoSrc) return;
    setFailed(false);
    setOsdVisible(true);
    const timer = setTimeout(() => setOsdVisible(false), OSD_MS);
    return () => clearTimeout(timer);
  }, [track?.videoSrc]);

  // Any wheel tick wakes the caption overlay; it dozes off again when idle.
  useEffect(() => {
    if (!captionMounted.current) {
      captionMounted.current = true;
      return;
    }
    setCaptionVisible(true);
    const timer = setTimeout(() => setCaptionVisible(false), CAPTION_IDLE_MS);
    return () => clearTimeout(timer);
  }, [captionNonce]);

  // Tell the store how far the caption can scroll. Only while watching —
  // that's when the top frame is the video frame the offset belongs to.
  useEffect(() => {
    if (!watching) return;
    const el = captionTextRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setMaxScroll(top.key, Math.max(0, el.scrollHeight - CAPTION_WINDOW));
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure per episode
  }, [watching, top.key, setMaxScroll, track?.videoSrc]);

  // Tell the store how much taller than the stage a width-filling crop of
  // this episode would be (0 for landscape). The persistent element may
  // already hold the metadata (same src re-opened), so measure immediately
  // too, not just on the event.
  useEffect(() => {
    if (!watching) return;
    const video = videoRef.current;
    if (!video) return;
    const measure = () => {
      const { videoWidth, videoHeight } = video;
      if (!videoWidth || !videoHeight) return;
      const renderedHeight = (STAGE_WIDTH * videoHeight) / videoWidth;
      setMaxPan(top.key, Math.max(0, Math.round(renderedHeight - STAGE_HEIGHT)));
    };
    if (video.readyState >= 1) measure();
    video.addEventListener('loadedmetadata', measure);
    return () => video.removeEventListener('loadedmetadata', measure);
  }, [watching, top.key, setMaxPan, track?.videoSrc]);

  // The store only reflects this source's state while it is the active one.
  const reportPlaying = (playing: boolean) => {
    if (useIpodStore.getState().playback.source === 'ugg') setPlaying(playing);
  };

  // Fullscreen setting + portrait episode: fill the width and crop; the wheel
  // pans the crop through frame.panOffset.
  const zoomed = videoFullscreen && watching && top.maxPan > 0;

  return (
    <div
      className={`${styles.stage} ${watching ? styles.visible : ''}`}
      data-testid="ugg-stage"
      data-watching={watching || undefined}
    >
      {/* src is managed imperatively (uggVideo.ts) so the gesture-time load
          and React renders never fight over the attribute. */}
      <video
        ref={(video) => {
          videoRef.current = video;
          registerUggVideo(video);
        }}
        className={`${styles.video} ${zoomed ? styles.videoZoomed : ''}`}
        style={zoomed ? { transform: `translateY(${-top.panOffset}px)` } : undefined}
        data-testid="ugg-player"
        preload="auto"
        playsInline
        onPlay={() => reportPlaying(true)}
        onPause={() => reportPlaying(false)}
        onTimeUpdate={() => {
          const p = uggProgress();
          if (p && useIpodStore.getState().playback.source === 'ugg') {
            setProgress(p.position, p.duration);
          }
        }}
        onEnded={() => skipTrack(1)}
        onError={() => {
          if (track) setFailed(true);
        }}
      />

      <div className={`${styles.osd} ${osdVisible || paused ? styles.osdVisible : ''}`}>
        {paused ? '❚❚ ' : '▶ '}
        {track?.title}
      </div>

      {failed && (
        <div className={styles.unavailable} data-testid="ugg-unavailable">
          Video unavailable on this device
        </div>
      )}

      {track?.caption && (
        <div
          className={`${styles.captionPanel} ${captionVisible ? styles.captionVisible : ''}`}
          data-testid="ugg-caption"
          aria-hidden={!captionVisible}
        >
          <div
            ref={captionTextRef}
            className={styles.captionText}
            style={{ transform: `translateY(${watching ? -top.scrollOffset : 0}px)` }}
          >
            {track.caption}
          </div>
        </div>
      )}
    </div>
  );
}
