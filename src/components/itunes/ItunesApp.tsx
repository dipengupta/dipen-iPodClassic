'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_ENTRY_ID, entryById } from '@/lib/itunes/catalog';
import { loadSection } from '@/lib/itunes/loaders';
import type { AudioTrack, CatalogEntry, SectionData } from '@/lib/itunes/types';
import type { LcdNowPlaying } from './LcdStatus';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import TitleBar from './TitleBar';
import Toolbar, { type GalleryMode } from './Toolbar';
import EmbedView from './views/EmbedView';
import ExternalList from './views/ExternalList';
import GalleryPane from './views/GalleryPane';
import ReadingPane from './views/ReadingPane';
import StaticPhotoView from './views/StaticPhotoView';
import TrackTable from './views/TrackTable';
import VideoPane from './views/VideoPane';
import styles from './ItunesApp.module.css';

interface AudioState {
  queue: AudioTrack[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
}

const NO_AUDIO: AudioState = { queue: [], index: -1, playing: false, position: 0, duration: 0 };

export default function ItunesApp() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(DEFAULT_ENTRY_ID);
  const [data, setData] = useState<SectionData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [audio, setAudio] = useState<AudioState>(NO_AUDIO);
  const [volume, setVolume] = useState(1);
  const [galleryMode, setGalleryMode] = useState<GalleryMode>('grid');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Desktop-only: phones / coarse-pointer devices go to the iPod.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) {
      router.replace('/');
    }
  }, [router]);

  // Load the selected sidebar entry's content; reset gallery to Grid.
  useEffect(() => {
    const entry = entryById(selectedId);
    if (!entry?.loader) return;
    let cancelled = false;
    setStatus('loading');
    setData(null);
    setGalleryMode('grid');
    loadSection(entry.loader)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const onSelect = useCallback((entry: CatalogEntry) => {
    if (entry.href) return; // device links are <Link>s, handled by the sidebar
    setSelectedId(entry.id);
  }, []);

  // --- Audio transport (the <audio> element lives below) -------------------
  const currentTrack = audio.queue[audio.index] ?? null;

  const playFromQueue = useCallback((queue: AudioTrack[], index: number) => {
    setAudio((prev) => {
      const sameTrack = prev.queue === queue && prev.queue[prev.index]?.id === queue[index]?.id;
      if (sameTrack) return { ...prev, playing: !prev.playing };
      return { queue, index, playing: true, position: 0, duration: 0 };
    });
  }, []);
  const togglePlay = useCallback(() => setAudio((p) => ({ ...p, playing: !p.playing })), []);
  const skip = useCallback(
    (delta: 1 | -1) =>
      setAudio((p) => {
        const next = p.index + delta;
        if (next < 0 || next >= p.queue.length) return p;
        return { ...p, index: next, playing: true, position: 0, duration: 0 };
      }),
    [],
  );
  const onEnded = useCallback(
    () =>
      setAudio((p) => {
        const next = p.index + 1;
        if (next >= p.queue.length) return { ...p, playing: false };
        return { ...p, index: next, position: 0, duration: 0 };
      }),
    [],
  );
  const seek = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = seconds;
    setAudio((p) => ({ ...p, position: seconds }));
  }, []);
  const pauseAudio = useCallback(() => setAudio((p) => ({ ...p, playing: false })), []);

  // Load a new track's source (and start it if we're meant to be playing).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!currentTrack) {
      a.removeAttribute('src');
      a.load();
      return;
    }
    if (a.src !== currentTrack.audioSrc) {
      a.src = currentTrack.audioSrc;
      a.load();
    }
    if (audio.playing) void a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `playing` handled in its own effect
  }, [currentTrack]);

  // Reflect play/pause intent onto the element.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (audio.playing) void a.play().catch(() => {});
    else a.pause();
  }, [audio.playing, currentTrack]);

  // Apply volume to the (persistent) audio element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const nowPlaying: LcdNowPlaying | null = currentTrack
    ? {
        title: currentTrack.title,
        subtitle: 'Spotify preview',
        position: audio.position,
        duration: audio.duration,
      }
    : null;

  const entry = entryById(selectedId);
  const isGallery = entry?.view === 'coverflow';

  return (
    <div className={styles.window} data-testid="itunes-window">
      <TitleBar />
      <Toolbar
        nowPlaying={nowPlaying}
        playing={audio.playing}
        canPlay={Boolean(currentTrack)}
        hasPrev={audio.index > 0}
        hasNext={audio.index >= 0 && audio.index < audio.queue.length - 1}
        onPlayPause={togglePlay}
        onPrev={() => skip(-1)}
        onNext={() => skip(1)}
        onSeek={seek}
        volume={volume}
        onVolume={setVolume}
        showGalleryToggle={isGallery && status === 'ready'}
        galleryMode={galleryMode}
        onGalleryMode={setGalleryMode}
      />
      <div className={styles.body}>
        <Sidebar selectedId={selectedId} onSelect={onSelect} />
        <main className={styles.main} data-testid="itunes-main">
          {status === 'loading' && <div className={styles.state}>Loading…</div>}
          {status === 'error' && <div className={styles.state}>Could not load this section.</div>}
          {status === 'ready' &&
            data &&
            renderView(data, {
              currentTrackId: currentTrack?.id,
              playing: audio.playing,
              onPlay: playFromQueue,
              pauseAudio,
              galleryMode,
            })}
        </main>
      </div>
      <StatusBar data={data} label={entry?.label ?? ''} unit={entry?.unit} loading={status !== 'ready'} />
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setAudio((p) => ({ ...p, position: a.currentTime, duration: a.duration || p.duration }));
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration || 0;
          setAudio((p) => ({ ...p, duration: d }));
        }}
        onEnded={onEnded}
      />
    </div>
  );
}

interface ViewHandlers {
  currentTrackId?: string;
  playing: boolean;
  onPlay: (queue: AudioTrack[], index: number) => void;
  pauseAudio: () => void;
  galleryMode: GalleryMode;
}

function renderView(data: SectionData, h: ViewHandlers) {
  switch (data.kind) {
    case 'coverflow':
      return <GalleryPane data={data} mode={h.galleryMode} />;
    case 'tracks':
      return (
        <TrackTable
          data={data}
          currentTrackId={h.currentTrackId}
          playing={h.playing}
          onPlay={h.onPlay}
        />
      );
    case 'video':
      return <VideoPane data={data} onPlay={h.pauseAudio} />;
    case 'reading':
      return <ReadingPane data={data} />;
    case 'staticPhoto':
      return <StaticPhotoView data={data} />;
    case 'external':
      return <ExternalList data={data} />;
    case 'embed':
      return <EmbedView data={data} />;
    default:
      return null;
  }
}
