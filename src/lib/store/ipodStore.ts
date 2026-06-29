import { create } from 'zustand';
import * as clicker from '../audio/clicker';
import type { IpodInput } from '../input/keyboard';
import { soundcloudSeekBy } from '../players/soundcloud';
import { spotifyLoad, spotifySeekBy } from '../players/spotify';
import { uggLoad, uggSeekBy } from '../players/uggVideo';
import { youtubeSeekBy } from '../players/youtube';
import { menuTree } from '../menu/tree';
import type {
  DetailPayload,
  FrameItem,
  MenuNode,
  PlaybackSource,
  PlayTrack,
  SelectSpec,
  ViewType,
} from '../menu/types';

export interface Frame {
  key: number;
  title: string;
  view: ViewType;
  node?: MenuNode;
  /** null while a dataSource is loading. */
  items: FrameItem[] | null;
  payload?: DetailPayload;
  selectedIndex: number;
  scrollOffset: number;
  /** textReader/photo: content height beyond the screen, set by the view. */
  maxScroll: number;
  /** video + fullscreen: current/total vertical crop travel, set by UggStage. */
  panOffset: number;
  maxPan: number;
  flipped: boolean;
}

export type Theme = 'silver' | 'black';

/** Logical pixels one wheel tick scrolls in text views (≈ one text line). */
export const SCROLL_STEP = 16;

/** Seconds one wheel tick seeks while the scrubber is up. */
export const SEEK_STEP_SEC = 5;

/** Logical pixels one wheel tick pans a fullscreen portrait video. */
export const PAN_STEP = 24;

function seekBy(source: PlaybackSource, seconds: number): void {
  if (source === 'youtube') youtubeSeekBy(seconds);
  else if (source === 'soundcloud') soundcloudSeekBy(seconds);
  else if (source === 'spotify') spotifySeekBy(seconds);
  else uggSeekBy(seconds);
}

let frameKey = 0;

function itemsFromChildren(node: MenuNode): FrameItem[] {
  return (node.children ?? []).map((child) => ({
    id: child.id,
    label: child.label,
    imagePath: child.previewImage,
    onSelect: { kind: 'node' as const, node: child },
  }));
}

/** Which screen a source plays on. */
function nowPlayingView(source: PlaybackSource): ViewType {
  return source === 'soundcloud' || source === 'spotify' ? 'nowPlaying' : 'video';
}

/** The detail payload for a track's now-playing frame. */
function nowPlayingPayload(source: PlaybackSource, track: PlayTrack): DetailPayload {
  return source === 'youtube'
    ? { title: track.title, videoId: track.id }
    : source === 'ugg'
      ? { title: track.title, videoSrc: track.videoSrc, caption: track.caption }
      : { title: 'Now Playing' };
}

/** Appears at the bottom of the main menu once a track is loaded (like the
 *  real Classic); jumps to the current Now Playing screen. */
const NOW_PLAYING_ITEM: FrameItem = {
  id: 'now-playing',
  label: 'Now Playing',
  onSelect: { kind: 'nowPlaying' as const },
};

function settingsItems(
  theme: Theme,
  tweetShuffle: boolean,
  videoFullscreen: boolean,
  clickSound: boolean,
): FrameItem[] {
  return [
    {
      id: 'settings.theme',
      label: 'Theme',
      sublabel: theme === 'silver' ? 'Silver' : 'Black',
      onSelect: { kind: 'action', action: 'toggleTheme' },
    },
    {
      id: 'settings.tweetShuffle',
      label: 'pennguytweets',
      sublabel: tweetShuffle ? 'Shuffled' : 'Newest First',
      onSelect: { kind: 'action', action: 'toggleTweetShuffle' },
    },
    {
      id: 'settings.videoFullscreen',
      label: 'Video Fullscreen',
      sublabel: videoFullscreen ? 'On' : 'Off',
      onSelect: { kind: 'action', action: 'toggleVideoFullscreen' },
    },
    {
      id: 'settings.clickSound',
      label: 'Click Sound',
      sublabel: clickSound ? 'On' : 'Off',
      onSelect: { kind: 'action', action: 'toggleClickSound' },
    },
  ];
}

function makeFrame(partial: Omit<Frame, 'key' | 'selectedIndex' | 'scrollOffset' | 'maxScroll' | 'panOffset' | 'maxPan' | 'flipped'>): Frame {
  return {
    key: ++frameKey,
    selectedIndex: 0,
    scrollOffset: 0,
    maxScroll: 0,
    panOffset: 0,
    maxPan: 0,
    flipped: false,
    ...partial,
  };
}

export interface PlaybackState {
  source: PlaybackSource | null;
  index: number;
  /** Actual player state, reported back by the persistent players. */
  playing: boolean;
  queue: PlayTrack[];
}

/** Seconds into / total length of the active track, reported by the players. */
export interface PlaybackProgress {
  position: number;
  duration: number;
}

export interface IpodState {
  stack: Frame[];
  theme: Theme;
  /** Settings: present the pennguytweets list in a random order. */
  tweetShuffle: boolean;
  /** Settings: crop portrait videos to fill the screen; the wheel then pans. */
  videoFullscreen: boolean;
  /** Settings: whether the wheel click sound plays. */
  clickSound: boolean;
  playback: PlaybackState;
  progress: PlaybackProgress;
  /** Scrub mode: center press on a playback screen; the wheel then seeks. */
  scrubbing: boolean;
  /** Display-off: the screen is dimmed (hold play/pause or idle). Audio plays on. */
  asleep: boolean;
  /** Bumped on play/pause press; PlayersLayer toggles the active source. */
  playPauseNonce: number;
  /** Bumped on every wheel tick over a local video; shows the caption overlay. */
  captionNonce: number;
  /** Bumped on scrub-mode activity; keeps the video scrub OSD awake. */
  scrubNonce: number;
  /** Bumped on every input; the idle-dim timer resets off it. */
  activityNonce: number;
  loadItems?: (node: MenuNode) => Promise<FrameItem[]>;

  setLoadItems: (fn: (node: MenuNode) => Promise<FrameItem[]>) => void;
  setTheme: (theme: Theme) => void;
  setTweetShuffle: (on: boolean) => void;
  setVideoFullscreen: (on: boolean) => void;
  setClickSound: (on: boolean) => void;
  pushNode: (node: MenuNode) => void;
  pushItems: (title: string, view: ViewType, items: FrameItem[]) => void;
  pushDetail: (view: ViewType, payload: DetailPayload) => void;
  playTrack: (source: PlaybackSource, queue: PlayTrack[], index: number, navigate?: boolean) => void;
  skipTrack: (delta: 1 | -1) => void;
  goToNowPlaying: () => void;
  ensureHomeNowPlaying: () => void;
  setAsleep: (on: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setProgress: (position: number, duration: number) => void;
  setScrubbing: (on: boolean) => void;
  pop: () => void;
  setFrameItems: (key: number, items: FrameItem[]) => void;
  setMaxScroll: (key: number, maxScroll: number) => void;
  setMaxPan: (key: number, maxPan: number) => void;
  handleInput: (input: IpodInput) => void;
  reset: () => void;
}

function initialStack(): Frame[] {
  return [
    makeFrame({
      title: menuTree.label,
      view: menuTree.view,
      node: menuTree,
      items: itemsFromChildren(menuTree),
    }),
  ];
}

export const useIpodStore = create<IpodState>((set, get) => ({
  stack: initialStack(),
  theme: 'silver',
  tweetShuffle: false,
  videoFullscreen: false,
  clickSound: true,
  playback: { source: null, index: -1, playing: false, queue: [] },
  progress: { position: 0, duration: 0 },
  scrubbing: false,
  asleep: false,
  playPauseNonce: 0,
  captionNonce: 0,
  scrubNonce: 0,
  activityNonce: 0,

  setLoadItems: (fn) => set({ loadItems: fn }),

  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem('ipod-theme', theme);
        document.cookie = `ipod-theme=${theme};path=/;max-age=31536000`;
      } catch {
        // Storage can be unavailable (private mode); theme just won't persist.
      }
    }
  },

  setTweetShuffle: (on) => {
    set({ tweetShuffle: on });
    if (typeof document !== 'undefined') {
      try {
        localStorage.setItem('ipod-tweet-shuffle', on ? '1' : '0');
      } catch {
        // Storage can be unavailable (private mode); the setting just won't persist.
      }
    }
  },

  setVideoFullscreen: (on) => {
    set({ videoFullscreen: on });
    if (typeof document !== 'undefined') {
      try {
        localStorage.setItem('ipod-video-fullscreen', on ? '1' : '0');
      } catch {
        // Storage can be unavailable (private mode); the setting just won't persist.
      }
    }
  },

  setClickSound: (on) => {
    set({ clickSound: on });
    clicker.setMuted(!on);
    if (typeof document !== 'undefined') {
      try {
        localStorage.setItem('ipod-click-sound', on ? '1' : '0');
      } catch {
        // Storage can be unavailable (private mode); the setting just won't persist.
      }
    }
  },

  pushNode: (node) => {
    const { loadItems, theme, tweetShuffle, videoFullscreen, clickSound } = get();
    let frame: Frame;
    if (node.view === 'settings') {
      frame = makeFrame({ title: node.label, view: 'settings', node, items: settingsItems(theme, tweetShuffle, videoFullscreen, clickSound) });
    } else if (node.children?.length) {
      frame = makeFrame({ title: node.label, view: node.view, node, items: itemsFromChildren(node) });
    } else if (node.dataSource) {
      frame = makeFrame({ title: node.label, view: node.view, node, items: null });
      if (loadItems) {
        const key = frame.key;
        loadItems(node)
          .then((items) => get().setFrameItems(key, items))
          .catch(() => get().setFrameItems(key, [{ id: 'error', label: 'Could not load.' }]));
      }
    } else {
      frame = makeFrame({ title: node.payload?.title ?? node.label, view: node.view, node, items: [], payload: node.payload });
    }
    set((s) => ({ stack: [...s.stack, frame] }));
  },

  pushItems: (title, view, items) => {
    set((s) => ({ stack: [...s.stack, makeFrame({ title, view, items })] }));
  },

  pushDetail: (view, payload) => {
    set((s) => ({
      stack: [...s.stack, makeFrame({ title: payload.title ?? '', view, items: [], payload })],
    }));
  },

  playTrack: (source, queue, index, navigate = true) => {
    const track = queue[index];
    if (!track) return;
    set({
      playback: { source, queue, index, playing: true },
      progress: { position: 0, duration: 0 },
      scrubbing: false,
    });
    if (source === 'ugg' && track.videoSrc) {
      // Start the persistent element NOW, while still inside the user's
      // click/keypress — Safari refuses unmuted play() from a later effect.
      uggLoad(track.videoSrc);
    } else if (source === 'spotify' && track.audioSrc) {
      // Same gesture rule as ugg: start the hidden <audio> here, not in an effect.
      spotifyLoad(track.audioSrc);
    }
    // The main menu gains a "Now Playing" entry once a track is loaded.
    get().ensureHomeNowPlaying();
    const view = nowPlayingView(source);
    const payload = nowPlayingPayload(source, track);
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (top.view === view) {
      // Already on the playback screen: swap content in place (animates a
      // skip). Scroll/pan state belongs to the previous track — reset it.
      set((s) => ({
        stack: s.stack.map((f, i) =>
          i === s.stack.length - 1
            ? { ...f, title: payload.title ?? '', payload, scrollOffset: 0, maxScroll: 0, panOffset: 0, maxPan: 0 }
            : f,
        ),
      }));
    } else if (navigate) {
      // Explicit track pick: jump to the Now Playing screen.
      get().pushDetail(view, payload);
    }
    // Background advance (navigate === false while browsing elsewhere): the
    // audio rolls on but the stack is left untouched — no focus stealing.
  },

  skipTrack: (delta) => {
    const { playback, playTrack } = get();
    if (!playback.source) return;
    const next = playback.index + delta;
    if (next < 0 || next >= playback.queue.length) return;
    // Auto-advance and transport buttons never yank you to Now Playing.
    playTrack(playback.source, playback.queue, next, false);
  },

  goToNowPlaying: () => {
    const { playback, stack } = get();
    if (!playback.source) return;
    const track = playback.queue[playback.index];
    if (!track) return;
    const view = nowPlayingView(playback.source);
    if (stack[stack.length - 1].view === view) return; // already there
    get().pushDetail(view, nowPlayingPayload(playback.source, track));
  },

  ensureHomeNowPlaying: () => {
    set((s) => {
      const root = s.stack[0];
      if (root.items?.some((it) => it.id === 'now-playing')) return s;
      const items = [...(root.items ?? itemsFromChildren(menuTree)), NOW_PLAYING_ITEM];
      return { stack: s.stack.map((f, i) => (i === 0 ? { ...f, items } : f)) };
    });
  },

  setAsleep: (on) => set((s) => (s.asleep === on ? s : { asleep: on })),

  setPlaying: (playing) => {
    set((s) =>
      s.playback.playing === playing ? s : { playback: { ...s.playback, playing } },
    );
  },

  setProgress: (position, duration) => {
    set({ progress: { position, duration } });
  },

  setScrubbing: (on) => {
    set((s) => (s.scrubbing === on ? s : { scrubbing: on }));
  },

  pop: () => {
    set((s) =>
      s.stack.length > 1 ? { stack: s.stack.slice(0, -1), scrubbing: false } : s,
    );
  },

  setFrameItems: (key, items) => {
    set((s) => ({
      stack: s.stack.map((f) => (f.key === key ? { ...f, items } : f)),
    }));
  },

  setMaxPan: (key, maxPan) => {
    set((s) => ({
      stack: s.stack.map((f) =>
        f.key === key
          ? {
              ...f,
              maxPan,
              // Re-measure (or first measure) recenters the crop.
              panOffset: f.maxPan === maxPan ? Math.min(f.panOffset, maxPan) : Math.round(maxPan / 2),
            }
          : f,
      ),
    }));
  },

  setMaxScroll: (key, maxScroll) => {
    set((s) => ({
      stack: s.stack.map((f) =>
        f.key === key
          ? { ...f, maxScroll, scrollOffset: Math.min(f.scrollOffset, maxScroll) }
          : f,
      ),
    }));
  },

  handleInput: (input) => {
    // A dimmed screen wakes on the first input and swallows it (like the
    // real iPod's backlight wake) — nothing else acts on that press.
    if (get().asleep) {
      set((s) => ({ asleep: false, activityNonce: s.activityNonce + 1 }));
      return;
    }
    // Every input resets the idle-dim timer.
    set((s) => ({ activityNonce: s.activityNonce + 1 }));
    const { stack } = get();
    const top = stack[stack.length - 1];

    const updateTop = (patch: Partial<Frame>) =>
      set((s) => ({
        stack: s.stack.map((f, i) => (i === s.stack.length - 1 ? { ...f, ...patch } : f)),
      }));

    switch (input.type) {
      case 'scroll': {
        if ((top.view === 'video' || top.view === 'nowPlaying') && get().scrubbing) {
          // Scrub mode: the wheel seeks the active player. Progress is also
          // nudged optimistically so the bar tracks the ticks instantly.
          const { playback, progress } = get();
          if (playback.source) {
            seekBy(playback.source, input.dir * SEEK_STEP_SEC);
            const target = progress.position + input.dir * SEEK_STEP_SEC;
            const position = Math.max(
              0,
              progress.duration > 0 ? Math.min(progress.duration, target) : target,
            );
            set((s) => ({
              progress: { ...s.progress, position },
              scrubNonce: s.scrubNonce + 1,
            }));
            clicker.tick();
          }
          break;
        }
        if (top.view === 'video' && top.payload?.videoSrc) {
          if (get().videoFullscreen && top.maxPan > 0) {
            // Fullscreen portrait video: the wheel pans the crop. The caption
            // stays asleep — toggle Fullscreen off to read it.
            const next = Math.max(0, Math.min(top.maxPan, top.panOffset + input.dir * PAN_STEP));
            if (next !== top.panOffset) {
              updateTop({ panOffset: next });
              clicker.tick();
            }
            break;
          }
          // Local video: the wheel reveals/scrolls the caption overlay. The
          // nonce fires on every tick so the overlay wakes even when the
          // caption is too short to scroll.
          set((s) => ({ captionNonce: s.captionNonce + 1 }));
          const next = Math.max(0, Math.min(top.maxScroll, top.scrollOffset + input.dir * SCROLL_STEP));
          if (next !== top.scrollOffset) {
            updateTop({ scrollOffset: next });
            clicker.tick();
          }
          break;
        }
        const textual =
          top.view === 'textReader' || top.view === 'photo' ||
          (top.view === 'coverflow' && top.flipped);
        if (textual) {
          const next = Math.max(0, Math.min(top.maxScroll, top.scrollOffset + input.dir * SCROLL_STEP));
          if (next !== top.scrollOffset) {
            updateTop({ scrollOffset: next });
            clicker.tick();
          }
        } else if (top.items && top.items.length > 0) {
          const next = Math.max(0, Math.min(top.items.length - 1, top.selectedIndex + input.dir));
          if (next !== top.selectedIndex) {
            updateTop({ selectedIndex: next });
            clicker.tick();
          }
        }
        break;
      }

      case 'prev':
      case 'next': {
        // Transport controls while media is loaded (like the real iPod);
        // otherwise they step the selection in browsing views.
        if (get().playback.source) {
          get().skipTrack(input.type === 'next' ? 1 : -1);
        } else if (top.view === 'coverflow' || top.view === 'list' || top.view === 'splitMenu') {
          get().handleInput({ type: 'scroll', dir: input.type === 'next' ? 1 : -1 });
        }
        break;
      }

      case 'select': {
        clicker.vibrate(10);
        if (top.view === 'coverflow') {
          updateTop({ flipped: !top.flipped, scrollOffset: 0 });
          break;
        }
        if (top.view === 'video' || top.view === 'nowPlaying') {
          // Like the real iPod: center summons the scrubber; the dedicated
          // play/pause control (Space / bottom wheel zone) pauses.
          set((s) => ({ scrubbing: !s.scrubbing, scrubNonce: s.scrubNonce + 1 }));
          break;
        }
        const item = top.items?.[top.selectedIndex];
        if (item?.onSelect) {
          executeSelect(get(), item.onSelect);
        } else if (top.payload?.sourceUrl && top.view === 'textReader') {
          // Detail text frames: center press follows "View Original".
          window.open(top.payload.sourceUrl, '_blank', 'noopener');
        }
        break;
      }

      case 'menu': {
        clicker.vibrate(10);
        if (get().scrubbing) {
          set({ scrubbing: false });
        } else if (top.flipped) {
          updateTop({ flipped: false, scrollOffset: 0 });
        } else {
          get().pop();
        }
        break;
      }

      case 'playPause': {
        set((s) => ({ playPauseNonce: s.playPauseNonce + 1 }));
        break;
      }

      case 'holdSelect': {
        // Press-and-hold the center button: jump straight to Now Playing.
        get().goToNowPlaying();
        break;
      }

      case 'holdPlayPause': {
        // Press-and-hold play/pause: sleep the screen (audio keeps playing).
        get().setAsleep(true);
        break;
      }
    }
  },

  reset: () =>
    set({
      stack: initialStack(),
      playback: { source: null, index: -1, playing: false, queue: [] },
      progress: { position: 0, duration: 0 },
      scrubbing: false,
      asleep: false,
    }),
}));

function executeSelect(state: IpodState, spec: SelectSpec): void {
  switch (spec.kind) {
    case 'node':
      state.pushNode(spec.node);
      break;
    case 'items':
      state.pushItems(spec.title, spec.view, spec.items);
      break;
    case 'detail':
      state.pushDetail(spec.view, spec.payload);
      break;
    case 'external':
      window.open(spec.href, '_blank', 'noopener');
      break;
    case 'play':
      state.playTrack(spec.source, spec.queue, spec.index);
      break;
    case 'nowPlaying':
      state.goToNowPlaying();
      break;
    case 'action': {
      if (spec.action === 'toggleTheme') {
        state.setTheme(state.theme === 'silver' ? 'black' : 'silver');
      } else if (spec.action === 'toggleTweetShuffle') {
        state.setTweetShuffle(!state.tweetShuffle);
      } else if (spec.action === 'toggleVideoFullscreen') {
        state.setVideoFullscreen(!state.videoFullscreen);
      } else if (spec.action === 'toggleClickSound') {
        state.setClickSound(!state.clickSound);
      }
      // Refresh the visible settings rows' sublabels.
      const { stack, theme, tweetShuffle, videoFullscreen, clickSound } = useIpodStore.getState();
      const top = stack[stack.length - 1];
      if (top.view === 'settings') {
        useIpodStore.getState().setFrameItems(top.key, settingsItems(theme, tweetShuffle, videoFullscreen, clickSound));
      }
      break;
    }
  }
}
