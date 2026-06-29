'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { catalog, DEFAULT_ENTRY_ID, entryById } from '@/lib/itunes/catalog';
import { loadPlaylist, loadPlaylists, loadSection } from '@/lib/itunes/loaders';
import {
  getTracks,
  initSoundcloud,
  scPause,
  scPlay,
  scResume,
  scSeekTo,
  soundcloudEmbedSrc,
  type ScTrack,
} from '@/lib/itunes/soundcloudPlayer';
import type {
  AudioTrack,
  CatalogEntry,
  PlaybackSource,
  Playlist,
  SectionData,
  TracksData,
} from '@/lib/itunes/types';
import type { LcdNowPlaying } from './LcdStatus';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import TitleBar from './TitleBar';
import Toolbar, { type GalleryMode } from './Toolbar';
import ExternalList from './views/ExternalList';
import GalleryPane from './views/GalleryPane';
import ReadingPane from './views/ReadingPane';
import StaticPhotoView from './views/StaticPhotoView';
import TrackTable from './views/TrackTable';
import TweetsView from './views/TweetsView';
import VideoPane from './views/VideoPane';
import styles from './ItunesApp.module.css';

interface AudioState {
  source: PlaybackSource;
  queue: AudioTrack[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
}

const NO_AUDIO: AudioState = {
  source: 'spotify',
  queue: [],
  index: -1,
  playing: false,
  position: 0,
  duration: 0,
};

const SOUNDCLOUD_ID = 'mus-soundcloud';
const MIN_SIDEBAR = 150;
const MAX_SIDEBAR = 460;

function playlistEntry(p: Playlist): CatalogEntry {
  return {
    id: `pl-${p.id}`,
    label: p.title,
    icon: p.service === 'apple' ? '🍎' : '🎶',
    group: 'PLAYLISTS',
    view: p.service === 'spotify' ? 'tracks' : 'external',
    href: p.service === 'apple' ? p.playlistUrl : undefined,
    unit: 'song',
  };
}

/** Build the SoundCloud track table (plays through the hidden widget). */
function soundcloudData(tracks: ScTrack[]): TracksData {
  return {
    kind: 'tracks',
    columns: { name: 'Track' },
    source: 'soundcloud',
    queue: tracks.map((t) => ({ id: `sc-${t.id}`, title: t.title, scIndex: t.id })),
    groups: [{ rows: tracks.map((t, i) => ({ id: `sc-${t.id}`, name: t.title, playIndex: i })) }],
  };
}

export default function ItunesApp() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(DEFAULT_ENTRY_ID);
  const [data, setData] = useState<SectionData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [audio, setAudio] = useState<AudioState>(NO_AUDIO);
  const [volume, setVolume] = useState(1);
  const [galleryMode, setGalleryMode] = useState<GalleryMode>('grid');
  const [imageScale, setImageScale] = useState(1);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  /** undefined while the widget resolves; [] if it failed. */
  const [scTracks, setScTracks] = useState<ScTrack[] | undefined>(undefined);

  const audioRef = useRef<HTMLAudioElement>(null);
  const scIframeRef = useRef<HTMLIFrameElement>(null);
  const sourceRef = useRef<PlaybackSource>('spotify');
  const advanceRef = useRef<() => void>(() => {});

  // Desktop-only: phones / coarse-pointer devices go to the iPod.
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) {
      router.replace('/');
    }
  }, [router]);

  // The PLAYLISTS sidebar section is built from the Recommendations feed.
  useEffect(() => {
    loadPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]));
  }, []);

  const advance = useCallback(
    () =>
      setAudio((p) => {
        const next = p.index + 1;
        if (next >= p.queue.length) return { ...p, playing: false };
        return { ...p, index: next, position: 0, duration: 0 };
      }),
    [],
  );
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);
  useEffect(() => {
    sourceRef.current = audio.source;
  }, [audio.source]);

  // Init the hidden SoundCloud widget once and resolve its track list.
  useEffect(() => {
    const iframe = scIframeRef.current;
    if (!iframe) return;
    initSoundcloud(
      iframe,
      (playing) => sourceRef.current === 'soundcloud' && setAudio((p) => ({ ...p, playing })),
      (position, duration) =>
        sourceRef.current === 'soundcloud' && setAudio((p) => ({ ...p, position, duration })),
      () => sourceRef.current === 'soundcloud' && advanceRef.current(),
    ).catch(() => {});
    getTracks()
      .then((t) => setScTracks(t ?? []))
      .catch(() => setScTracks([]));
  }, []);

  const entries = useMemo<CatalogEntry[]>(
    () => [...catalog, ...playlists.map(playlistEntry)],
    [playlists],
  );
  const entry = entries.find((e) => e.id === selectedId) ?? entryById(selectedId);

  // Load the selected sidebar entry's content; reset gallery to Grid.
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setData(null);
    setGalleryMode('grid');

    // SoundCloud: live widget tracks (preferred), else the link-out fallback.
    if (selectedId === SOUNDCLOUD_ID) {
      if (scTracks === undefined) return; // still resolving — effect reruns when set
      if (scTracks.length > 0) {
        setData(soundcloudData(scTracks));
        setStatus('ready');
        return;
      }
      loadSection('soundcloud')
        .then((d) => !cancelled && (setData(d), setStatus('ready')))
        .catch(() => !cancelled && setStatus('error'));
      return () => {
        cancelled = true;
      };
    }

    const run = selectedId.startsWith('pl-')
      ? loadPlaylist(Number(selectedId.slice(3)))
      : (() => {
          const e = entryById(selectedId);
          return e?.loader ? loadSection(e.loader) : null;
        })();
    if (!run) {
      setStatus('error');
      return;
    }
    run
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
  }, [selectedId, scTracks]);

  const onSelect = useCallback((e: CatalogEntry) => {
    if (e.href) return; // link entries (DEVICES / Apple playlists) are anchors
    setSelectedId(e.id);
  }, []);

  // --- Audio transport -----------------------------------------------------
  const currentTrack = audio.queue[audio.index] ?? null;

  const playFromQueue = useCallback(
    (queue: AudioTrack[], index: number, source: PlaybackSource = 'spotify') => {
      const prevSource = sourceRef.current;
      setAudio((prev) => {
        const sameTrack =
          prev.source === source &&
          prev.queue === queue &&
          prev.queue[prev.index]?.id === queue[index]?.id;
        if (sameTrack) return { ...prev, playing: !prev.playing };
        return { source, queue, index, playing: true, position: 0, duration: 0 };
      });
      // Switching engines: stop the other one.
      if (source !== prevSource) {
        if (source === 'spotify') scPause();
        else audioRef.current?.pause();
      }
    },
    [],
  );
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
  const seek = useCallback((seconds: number) => {
    if (sourceRef.current === 'soundcloud') scSeekTo(seconds);
    else if (audioRef.current) audioRef.current.currentTime = seconds;
    setAudio((p) => ({ ...p, position: seconds }));
  }, []);
  const pauseAudio = useCallback(() => setAudio((p) => ({ ...p, playing: false })), []);

  // Track-change: load + start the right engine for the current track.
  useEffect(() => {
    if (audio.source === 'spotify') {
      const a = audioRef.current;
      if (!a) return;
      if (!currentTrack) {
        a.removeAttribute('src');
        a.load();
        return;
      }
      if (a.src !== currentTrack.audioSrc) {
        a.src = currentTrack.audioSrc ?? '';
        a.load();
      }
      if (audio.playing) void a.play().catch(() => {});
    } else if (currentTrack?.scIndex != null) {
      scPlay(currentTrack.scIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play/pause handled in its own effect
  }, [currentTrack, audio.source]);

  // Reflect play/pause intent onto the active engine.
  useEffect(() => {
    if (!currentTrack) return;
    if (audio.source === 'spotify') {
      const a = audioRef.current;
      if (!a) return;
      if (audio.playing) void a.play().catch(() => {});
      else a.pause();
    } else if (audio.playing) {
      scResume();
    } else {
      scPause();
    }
  }, [audio.playing, audio.source, currentTrack]);

  // Apply volume to the (persistent) <audio> element (Spotify previews).
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const nowPlaying: LcdNowPlaying | null = currentTrack
    ? {
        title: currentTrack.title,
        subtitle: audio.source === 'soundcloud' ? 'SoundCloud' : 'Spotify preview',
        position: audio.position,
        duration: audio.duration,
      }
    : null;

  const isGallery = entry?.view === 'coverflow';

  // --- Sidebar drag-resize -------------------------------------------------
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onDividerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startW: sidebarWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDividerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setSidebarWidth(Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, d.startW + (e.clientX - d.startX))));
  };
  const onDividerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

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
        showGalleryToggle={Boolean(isGallery) && status === 'ready'}
        galleryMode={galleryMode}
        onGalleryMode={setGalleryMode}
      />
      <div className={styles.body}>
        <Sidebar entries={entries} selectedId={selectedId} onSelect={onSelect} width={sidebarWidth} />
        <div
          className={styles.divider}
          data-testid="itunes-sidebar-divider"
          role="separator"
          aria-orientation="vertical"
          onPointerDown={onDividerDown}
          onPointerMove={onDividerMove}
          onPointerUp={onDividerUp}
        />
        <main className={styles.main} data-testid="itunes-main">
          {status === 'loading' && <div className={styles.state}>Loading…</div>}
          {status === 'error' && <div className={styles.state}>Could not load this section.</div>}
          {status === 'ready' &&
            data &&
            renderView(data, {
              currentTrackId: currentTrack?.id,
              playing: audio.playing,
              onPlay: playFromQueue,
              onTogglePlay: togglePlay,
              pauseAudio,
              galleryMode,
              imageScale,
            })}
        </main>
      </div>
      <StatusBar
        data={data}
        label={entry?.label ?? ''}
        unit={entry?.unit}
        loading={status !== 'ready'}
        showImageSlider={Boolean(isGallery) && status === 'ready'}
        imageScale={imageScale}
        onImageScale={setImageScale}
      />
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setAudio((p) => (p.source === 'spotify' ? { ...p, position: a.currentTime, duration: a.duration || p.duration } : p));
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration || 0;
          setAudio((p) => (p.source === 'spotify' ? { ...p, duration: d } : p));
        }}
        onEnded={advance}
      />
      {/* Hidden, iTunes-local SoundCloud widget — plays full tracks via the transport. */}
      <iframe
        ref={scIframeRef}
        className={styles.scHidden}
        src={soundcloudEmbedSrc()}
        title="SoundCloud player"
        allow="autoplay; encrypted-media"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

interface ViewHandlers {
  currentTrackId?: string;
  playing: boolean;
  onPlay: (queue: AudioTrack[], index: number, source: PlaybackSource) => void;
  onTogglePlay: () => void;
  pauseAudio: () => void;
  galleryMode: GalleryMode;
  imageScale: number;
}

function renderView(data: SectionData, h: ViewHandlers) {
  switch (data.kind) {
    case 'coverflow':
      return <GalleryPane data={data} mode={h.galleryMode} scale={h.imageScale} />;
    case 'tracks':
      return (
        <TrackTable
          data={data}
          currentTrackId={h.currentTrackId}
          playing={h.playing}
          onPlay={h.onPlay}
          onTogglePlay={h.onTogglePlay}
        />
      );
    case 'video':
      return <VideoPane data={data} onPlay={h.pauseAudio} />;
    case 'reading':
      return <ReadingPane data={data} />;
    case 'tweets':
      return <TweetsView data={data} />;
    case 'staticPhoto':
      return <StaticPhotoView data={data} />;
    case 'external':
      return <ExternalList data={data} />;
    default:
      return null;
  }
}
