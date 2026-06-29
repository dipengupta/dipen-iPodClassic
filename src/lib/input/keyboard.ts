export type IpodInput =
  | { type: 'scroll'; dir: 1 | -1 }
  | { type: 'select' }
  | { type: 'menu' }
  | { type: 'playPause' }
  | { type: 'prev' }
  | { type: 'next' }
  /** Press-and-hold the center button → jump to Now Playing. */
  | { type: 'holdSelect' }
  /** Press-and-hold play/pause → sleep the display. */
  | { type: 'holdPlayPause' };

/** How long the center / play-pause button must be held to fire its gesture. */
export const HOLD_MS = 500;

/** The hold-gesture variant of a holdable short input, or null if not holdable. */
export function holdInputFor(input: IpodInput): IpodInput | null {
  if (input.type === 'select') return { type: 'holdSelect' };
  if (input.type === 'playPause') return { type: 'holdPlayPause' };
  return null;
}

/** Maps a keyboard event to an iPod input, or null if the key is unbound. */
export function inputForKey(key: string): IpodInput | null {
  switch (key) {
    case 'ArrowDown':
      return { type: 'scroll', dir: 1 };
    case 'ArrowUp':
      return { type: 'scroll', dir: -1 };
    case 'ArrowRight':
      return { type: 'next' };
    case 'ArrowLeft':
      return { type: 'prev' };
    case 'Enter':
      return { type: 'select' };
    case 'Escape':
    case 'Backspace':
    case 'm':
    case 'M':
      return { type: 'menu' };
    case ' ':
      return { type: 'playPause' };
    default:
      return null;
  }
}
