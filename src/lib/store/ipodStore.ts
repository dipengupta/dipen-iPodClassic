import { create } from 'zustand';
import * as clicker from '../audio/clicker';
import type { IpodInput } from '../input/keyboard';
import { uggLoad } from '../players/uggVideo';
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
  flipped: boolean;
}

export type Theme = 'silver' | 'black';

/** Logical pixels one wheel tick scrolls in text views (≈ one text line). */
export const SCROLL_STEP = 16;

let frameKey = 0;

function itemsFromChildren(node: MenuNode): FrameItem[] {
  return (node.children ?? []).map((child) => ({
    id: child.id,
    label: child.label,
    imagePath: child.previewImage,
    onSelect: { kind: 'node' as const, node: child },
  }));
}

function settingsItems(theme: Theme): FrameItem[] {
  return [
    {
      id: 'settings.theme',
      label: 'Theme',
      sublabel: theme === 'silver' ? 'Silver' : 'Black',
      onSelect: { kind: 'action', action: 'toggleTheme' },
    },
  ];
}

function makeFrame(partial: Omit<Frame, 'key' | 'selectedIndex' | 'scrollOffset' | 'maxScroll' | 'flipped'>): Frame {
  return {
    key: ++frameKey,
    selectedIndex: 0,
    scrollOffset: 0,
    maxScroll: 0,
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

export interface IpodState {
  stack: Frame[];
  theme: Theme;
  playback: PlaybackState;
  /** Bumped on play/pause press; PlayersLayer toggles the active source. */
  playPauseNonce: number;
  /** Bumped on every wheel tick over a local video; shows the caption overlay. */
  captionNonce: number;
  loadItems?: (node: MenuNode) => Promise<FrameItem[]>;

  setLoadItems: (fn: (node: MenuNode) => Promise<FrameItem[]>) => void;
  setTheme: (theme: Theme) => void;
  pushNode: (node: MenuNode) => void;
  pushItems: (title: string, view: ViewType, items: FrameItem[]) => void;
  pushDetail: (view: ViewType, payload: DetailPayload) => void;
  playTrack: (source: PlaybackSource, queue: PlayTrack[], index: number) => void;
  skipTrack: (delta: 1 | -1) => void;
  setPlaying: (playing: boolean) => void;
  pop: () => void;
  setFrameItems: (key: number, items: FrameItem[]) => void;
  setMaxScroll: (key: number, maxScroll: number) => void;
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
  playback: { source: null, index: -1, playing: false, queue: [] },
  playPauseNonce: 0,
  captionNonce: 0,

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

  pushNode: (node) => {
    const { loadItems, theme } = get();
    let frame: Frame;
    if (node.view === 'settings') {
      frame = makeFrame({ title: node.label, view: 'settings', node, items: settingsItems(theme) });
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

  playTrack: (source, queue, index) => {
    const track = queue[index];
    if (!track) return;
    set({ playback: { source, queue, index, playing: true } });
    if (source === 'ugg' && track.videoSrc) {
      // Start the persistent element NOW, while still inside the user's
      // click/keypress — Safari refuses unmuted play() from a later effect.
      uggLoad(track.videoSrc);
    }
    const view: ViewType = source === 'soundcloud' ? 'nowPlaying' : 'video';
    const payload: DetailPayload =
      source === 'youtube'
        ? { title: track.title, videoId: track.id }
        : source === 'ugg'
          ? { title: track.title, videoSrc: track.videoSrc, caption: track.caption }
          : { title: 'Now Playing' };
    const { stack } = get();
    const top = stack[stack.length - 1];
    if (top.view === view) {
      // Track-to-track skip: swap content in place, no slide animation.
      // Scroll state belongs to the previous track's caption — reset it.
      set((s) => ({
        stack: s.stack.map((f, i) =>
          i === s.stack.length - 1
            ? { ...f, title: payload.title ?? '', payload, scrollOffset: 0, maxScroll: 0 }
            : f,
        ),
      }));
    } else {
      get().pushDetail(view, payload);
    }
  },

  skipTrack: (delta) => {
    const { playback, playTrack } = get();
    if (!playback.source) return;
    const next = playback.index + delta;
    if (next < 0 || next >= playback.queue.length) return;
    playTrack(playback.source, playback.queue, next);
  },

  setPlaying: (playing) => {
    set((s) =>
      s.playback.playing === playing ? s : { playback: { ...s.playback, playing } },
    );
  },

  pop: () => {
    set((s) => (s.stack.length > 1 ? { stack: s.stack.slice(0, -1) } : s));
  },

  setFrameItems: (key, items) => {
    set((s) => ({
      stack: s.stack.map((f) => (f.key === key ? { ...f, items } : f)),
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
    const { stack } = get();
    const top = stack[stack.length - 1];

    const updateTop = (patch: Partial<Frame>) =>
      set((s) => ({
        stack: s.stack.map((f, i) => (i === s.stack.length - 1 ? { ...f, ...patch } : f)),
      }));

    switch (input.type) {
      case 'scroll': {
        if (top.view === 'video' && top.payload?.videoSrc) {
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
          set((s) => ({ playPauseNonce: s.playPauseNonce + 1 }));
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
        if (top.flipped) {
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
    }
  },

  reset: () =>
    set({
      stack: initialStack(),
      playback: { source: null, index: -1, playing: false, queue: [] },
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
    case 'action':
      if (spec.action === 'toggleTheme') {
        const next = state.theme === 'silver' ? 'black' : 'silver';
        state.setTheme(next);
        // Refresh the visible settings row's sublabel.
        const top = state.stack[state.stack.length - 1];
        if (top.view === 'settings') {
          state.setFrameItems(top.key, settingsItems(next));
        }
      }
      break;
  }
}
