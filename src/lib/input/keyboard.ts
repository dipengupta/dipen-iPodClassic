export type IpodInput =
  | { type: 'scroll'; dir: 1 | -1 }
  | { type: 'select' }
  | { type: 'menu' }
  | { type: 'playPause' }
  | { type: 'prev' }
  | { type: 'next' };

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
