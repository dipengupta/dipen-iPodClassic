import { describe, expect, it } from 'vitest';
import {
  buildSeedRows,
  episodeName,
  fixMojibake,
  parseEpisodeFromTitle,
  resolveTimestamps,
  videoFilename,
  type CaptionEntry,
  type ExportItem,
} from '../../scripts/ugg-lib';

describe('fixMojibake', () => {
  it('repairs UTF-8 read as latin-1', () => {
    expect(fixMojibake('Recorded ~Nov â19')).toBe('Recorded ~Nov ’19');
    expect(fixMojibake('Itâs')).toBe('It’s');
  });

  it('leaves clean strings alone', () => {
    expect(fixMojibake('UGG Chronicles Ep. 1 | TLT')).toBe('UGG Chronicles Ep. 1 | TLT');
  });

  it('never corrupts text that is already proper Unicode', () => {
    expect(fixMojibake('I’ve done it 🎸')).toBe('I’ve done it 🎸');
  });
});

describe('parseEpisodeFromTitle', () => {
  it('reads the episode from a full title', () => {
    expect(parseEpisodeFromTitle('UGG Chronicles Ep. 42 | Some Song')).toBe(42);
  });

  it('reads truncated export titles (ep 203)', () => {
    expect(parseEpisodeFromTitle('hronicles Ep. 203 | Kaisi Paheli')).toBe(203);
  });

  it('ignores bare "Ep. N" mentions inside caption bodies', () => {
    expect(parseEpisodeFromTitle('Throwback to Ep. 59, good times')).toBeNull();
  });
});

describe('episodeName', () => {
  it('takes the text after the pipe', () => {
    expect(episodeName('UGG Chronicles Ep. 7 | Zostel Jams')).toBe('Zostel Jams');
  });

  it('falls back to the whole title without a pipe', () => {
    expect(episodeName('Just a jam')).toBe('Just a jam');
  });
});

describe('resolveTimestamps', () => {
  const captions: CaptionEntry[] = [
    { episode: 1, title: 'UGG Chronicles Ep. 1 | A', caption: 'x'.repeat(60) },
    { episode: 2, title: 'UGG Chronicles Ep. 2 | B', caption: 'a long caption body that only episode two has, well over forty chars' },
  ];

  it('matches by title first, then by caption body', () => {
    const items: ExportItem[] = [
      { title: 'UGG Chronicles Ep. 1 | A', creationTimestamp: 100 },
      // 2021 IGTV style: caption body in the title field.
      { title: 'a long caption body that only episode two has, well over forty chars', creationTimestamp: 200 },
    ];
    const { timestamps, unresolved } = resolveTimestamps(captions, items);
    expect(timestamps.get(1)).toBe(100);
    expect(timestamps.get(2)).toBe(200);
    expect(unresolved).toEqual([]);
  });

  it('reports unresolved episodes instead of guessing', () => {
    const { timestamps, unresolved } = resolveTimestamps(captions, [
      { title: 'UGG Chronicles Ep. 1 | A', creationTimestamp: 100 },
    ]);
    expect(timestamps.has(2)).toBe(false);
    expect(unresolved).toEqual([2]);
  });
});

describe('buildSeedRows', () => {
  it('derives year, name and filename per episode', () => {
    const captions: CaptionEntry[] = [
      { episode: 5, title: 'UGG Chronicles Ep. 5 | Besaurus', caption: 'fun' },
    ];
    const rows = buildSeedRows(
      captions,
      new Map([[5, Date.UTC(2023, 5, 15) / 1000]]),
      new Map([[5, 42]]),
    );
    expect(rows).toEqual([
      {
        episode: 5,
        title: 'UGG Chronicles Ep. 5 | Besaurus',
        name: 'Besaurus',
        caption: 'fun',
        postedAt: '2023-06-15T00:00:00.000Z',
        year: 2023,
        filename: videoFilename(5),
        durationSec: 42,
      },
    ]);
  });

  it('refuses to build rows with a missing timestamp', () => {
    const captions: CaptionEntry[] = [
      { episode: 9, title: 'UGG Chronicles Ep. 9 | X', caption: '' },
    ];
    expect(() => buildSeedRows(captions, new Map(), new Map())).toThrow(/episode 9/);
  });
});
