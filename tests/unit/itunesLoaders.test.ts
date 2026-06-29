import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSection } from '@/lib/itunes/loaders';
import type {
  CoverflowData,
  EmbedData,
  ExternalData,
  ReadingData,
  TracksData,
  VideoData,
} from '@/lib/itunes/types';

/** Canned API responses keyed by URL path. */
const responses: Record<string, unknown> = {
  '/api/content/recommendations': {
    items: [
      {
        id: 1,
        title: 'Indie Mix',
        service: 'spotify',
        playlistUrl: 'https://open.spotify.com/playlist/1',
        note: 'good vibes',
        tracks: [
          { trackUri: 'spotify:track:a', title: 'Song A', artist: 'Artist A', previewUrl: 'https://p/a.mp3' },
          { trackUri: 'spotify:track:b', title: 'Song B', artist: '', previewUrl: 'https://p/b.mp3' },
        ],
      },
      {
        id: 2,
        title: 'Apple Picks',
        service: 'apple',
        playlistUrl: 'https://music.apple.com/playlist/2',
        note: '',
        tracks: [],
      },
    ],
  },
  '/api/content/guitars': {
    items: [{ id: 7, name: 'Les Paul', year: '2019', imagePath: '/img/lp.webp', description: 'A classic.' }],
  },
  '/api/content/photos': {
    items: [
      { id: 3, title: 'Sunset', description: 'On the coast.', imagePath: '/img/sunset.webp' },
      { id: 4, title: 'Trail', description: '', imagePath: '/img/trail.webp' },
    ],
  },
  '/api/content/mugs': {
    items: [
      { id: 1, title: 'Texas', giftedBy: 'Mom', category: 'state', detail: '' },
      { id: 2, title: 'Tokyo', giftedBy: '', category: 'city', detail: '' },
    ],
  },
  '/api/youtube': {
    items: [
      { videoId: 'yt1', title: 'Cover One', description: 'desc', publishedAt: '2024-05-01T00:00:00Z' },
      { videoId: 'yt2', title: 'Cover Two', description: 'desc', publishedAt: '2023-02-01T00:00:00Z' },
    ],
  },
  '/api/content/ugg': {
    items: [
      { episode: 12, name: 'Finale', caption: 'cap', postedAt: '2025-01-02', year: 2025, filename: 'ugg-12.mp4' },
    ],
  },
  '/api/articles': {
    items: [
      { slug: 'hello', title: 'Hello World', publishedLabel: 'May 2024', sourceLabel: 'Substack', sourceUrl: 'https://x/y' },
    ],
  },
  '/api/content/links': {
    items: [{ id: 1, label: 'GitHub', url: 'https://github.com/dipeng' }],
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', (input: string) => {
    const path = input.replace(/^https?:\/\/[^/]+/, '');
    const body = responses[path];
    if (!body) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    return Promise.resolve({ ok: true, status: 200, json: async () => body });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('iTunes loaders', () => {
  it('photos become a cover-flow gallery (profile gallery only)', async () => {
    const data = (await loadSection('photos')) as CoverflowData;
    expect(data.kind).toBe('coverflow');
    expect(data.items.map((i) => i.label)).toEqual(['Sunset', 'Trail']);
    expect(data.items[0].imagePath).toBe('/img/sunset.webp');
    expect(data.items[0].flipText).toBe('On the coast.');
    expect(data.items[1].flipText).toBe('Trail'); // empty description falls back to the title
  });

  it('recommendations groups by playlist; Apple rows link out', async () => {
    const data = (await loadSection('recommendations')) as TracksData;
    expect(data.groups.map((g) => g.heading)).toEqual(['Indie Mix', 'Apple Picks']);
    expect(data.groups[0].rows[0].playIndex).toBe(0); // spotify is playable
    const appleRow = data.groups[1].rows[0];
    expect(appleRow.href).toBe('https://music.apple.com/playlist/2');
    expect(appleRow.playIndex).toBeUndefined();
  });

  it('mugs are grouped by category with the gifter as secondary', async () => {
    const data = (await loadSection('mugs')) as TracksData;
    expect(data.groups.map((g) => g.heading)).toEqual(['States', 'Cities']);
    expect(data.groups[0].rows[0].secondary).toBe('from Mom');
    expect(data.groups[1].rows[0].secondary).toBeUndefined(); // empty gifter
  });

  it('YouTube groups videos by year, newest first', async () => {
    const data = (await loadSection('youtube')) as VideoData;
    expect(data.groups.map((g) => g.heading)).toEqual(['YouTube · 2024', 'YouTube · 2023']);
    expect(data.groups[0].videos[0]).toMatchObject({ source: 'youtube', youtubeId: 'yt1' });
  });

  it('Instagram maps UGG episodes to the local video stream', async () => {
    const data = (await loadSection('instagram')) as VideoData;
    expect(data.groups[0].heading).toBe('UGG Chronicles · 2025');
    expect(data.groups[0].videos[0]).toMatchObject({ source: 'ugg', videoSrc: '/api/video/ugg-12.mp4' });
  });

  it('guitars become cover-flow items with a year in the flip text', async () => {
    const data = (await loadSection('guitars')) as CoverflowData;
    expect(data.kind).toBe('coverflow');
    expect(data.items[0]).toMatchObject({ label: 'Les Paul', sublabel: '2019', imagePath: '/img/lp.webp' });
    expect(data.items[0].flipText).toContain('(2019)');
  });

  it('articles list carries the slug for lazy body loading', async () => {
    const data = (await loadSection('articles')) as ReadingData;
    expect(data.entries[0]).toMatchObject({ title: 'Hello World', articleSlug: 'hello', sourceLabel: 'Substack' });
    expect(data.entries[0].text).toBeUndefined(); // body is lazy
  });

  it('links map to external rows', async () => {
    const data = (await loadSection('links')) as ExternalData;
    expect(data.rows[0]).toMatchObject({ label: 'GitHub', href: 'https://github.com/dipeng' });
    expect(data.rows[0].sublabel).toBe('github.com/dipeng');
  });

  it('soundcloud is a self-playing embed (no fetch needed)', async () => {
    const data = (await loadSection('soundcloud')) as EmbedData;
    expect(data.kind).toBe('embed');
    expect(data.src).toContain('w.soundcloud.com/player');
  });

  it('about renders the static text without hitting the network', async () => {
    const data = (await loadSection('about')) as ReadingData;
    expect(data.entries[0].text).toContain("Hi, I'm Dipen");
  });
});
