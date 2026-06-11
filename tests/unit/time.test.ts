import { describe, expect, it } from 'vitest';
import { formatRemaining, formatTime } from '@/lib/players/time';

describe('playback time formatting', () => {
  it('renders m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(754)).toBe('12:34');
  });

  it('floors fractional seconds and clamps junk to 0:00', () => {
    expect(formatTime(89.9)).toBe('1:29');
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });

  it('renders the remaining countdown', () => {
    expect(formatRemaining(65, 180)).toBe('-1:55');
    expect(formatRemaining(0, 0)).toBe('-0:00');
    expect(formatRemaining(200, 180)).toBe('-0:00'); // never negative-negative
  });
});
