import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { refreshArticlesIfStale } from '@/lib/fetchers/substack';
import { refreshSpotifyIfStale } from '@/lib/fetchers/spotify';
import { isStale, markFetched, refreshYoutubeIfStale } from '@/lib/fetchers/youtubeRss';
import { failingFetch, makeTestDb, okResponse } from './helpers';

const fixture = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures', name), 'utf8');

describe('fetch_meta staleness', () => {
  it('is stale before the first fetch and fresh right after', () => {
    const db = makeTestDb();
    expect(isStale(db, 'k', 1000)).toBe(true);
    markFetched(db, 'k');
    expect(isStale(db, 'k', 1000)).toBe(false);
    expect(isStale(db, 'k', 1000, Date.now() + 2000)).toBe(true);
  });
});

describe('refreshYoutubeIfStale', () => {
  it('upserts feed videos into the archive', async () => {
    const db = makeTestDb();
    const fetchMock = vi.fn(async () => okResponse(fixture('youtube-feed.xml')));
    await refreshYoutubeIfStale(db, fetchMock as unknown as typeof fetch);
    const videos = db.select().from(schema.youtubeVideos).all();
    expect(videos.length).toBeGreaterThan(5);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('skips the network while fresh', async () => {
    const db = makeTestDb();
    const fetchMock = vi.fn(async () => okResponse(fixture('youtube-feed.xml')));
    await refreshYoutubeIfStale(db, fetchMock as unknown as typeof fetch);
    await refreshYoutubeIfStale(db, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps the archive intact when the network fails', async () => {
    const db = makeTestDb({ seed: true });
    const before = db.select().from(schema.youtubeVideos).all().length;
    await refreshYoutubeIfStale(db, failingFetch);
    expect(db.select().from(schema.youtubeVideos).all()).toHaveLength(before);
    // Failure must not mark the feed as fetched.
    expect(isStale(db, 'youtube', 6 * 3600 * 1000)).toBe(true);
  });

  it('does not duplicate videos already in the archive', async () => {
    const db = makeTestDb();
    const fetchMock = vi.fn(async () => okResponse(fixture('youtube-feed.xml')));
    await refreshYoutubeIfStale(db, fetchMock as unknown as typeof fetch);
    const first = db.select().from(schema.youtubeVideos).all().length;
    db.delete(schema.fetchMeta).run(); // force staleness
    await refreshYoutubeIfStale(db, fetchMock as unknown as typeof fetch);
    expect(db.select().from(schema.youtubeVideos).all()).toHaveLength(first);
  });
});

describe('refreshArticlesIfStale', () => {
  it('adds only posts that are not already known (by slug, url, or title)', async () => {
    const db = makeTestDb({ seed: true });
    const before = db
      .select({ slug: schema.articles.slug })
      .from(schema.articles)
      .all()
      .map((r) => r.slug);
    await refreshArticlesIfStale(db, (async () =>
      okResponse(fixture('substack-feed.xml'))) as typeof fetch);
    const after = db.select().from(schema.articles).all();

    // The 10 seeded articles must all survive untouched.
    for (const slug of before) {
      expect(after.some((a) => a.slug === slug)).toBe(true);
    }
    // No duplicate titles (the feed cross-posts a seeded Medium article).
    const titles = after.map((a) => a.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    expect(new Set(titles).size).toBe(titles.length);
    // Substack's default inaugural post is excluded.
    expect(after.some((a) => a.slug === 'coming-soon')).toBe(false);
  });

  it('never overwrites a seeded body', async () => {
    const db = makeTestDb({ seed: true });
    const original = db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.slug, 'article10'))
      .get()!;
    await refreshArticlesIfStale(db, (async () =>
      okResponse(fixture('substack-feed.xml'))) as typeof fetch);
    const after = db
      .select()
      .from(schema.articles)
      .where(eq(schema.articles.slug, 'article10'))
      .get()!;
    expect(after.bodyHtml).toBe(original.bodyHtml);
  });

  it('survives a network failure', async () => {
    const db = makeTestDb({ seed: true });
    await refreshArticlesIfStale(db, failingFetch);
    expect(db.select().from(schema.articles).all()).toHaveLength(10);
  });
});

function spotifyEmbed(tracks: Array<{ uri: string; title: string; artist: string; preview?: string }>): string {
  const trackList = tracks.map((t) => ({
    uri: t.uri,
    title: t.title,
    subtitle: t.artist,
    ...(t.preview ? { audioPreview: { url: t.preview } } : {}),
  }));
  const payload = JSON.stringify({ props: { pageProps: { state: { data: { entity: { trackList } } } } } });
  return `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`;
}

describe('refreshSpotifyIfStale', () => {
  it('replaces a playlist\'s tracks from the keyless embed feed', async () => {
    const db = makeTestDb({ seed: true });
    const playlistCount = db
      .select()
      .from(schema.recommendations)
      .where(eq(schema.recommendations.service, 'spotify'))
      .all().length;
    const fetchMock = vi.fn(async () =>
      okResponse(spotifyEmbed([
        { uri: 'spotify:track:x', title: 'Fresh Song', artist: 'Fresh Artist', preview: 'https://p.scdn.co/mp3-preview/x' },
      ])),
    );
    await refreshSpotifyIfStale(db, fetchMock as unknown as typeof fetch);
    const tracks = db.select().from(schema.recommendationTracks).all();
    // Each seeded Spotify playlist is refreshed to the single fixture track.
    expect(fetchMock).toHaveBeenCalledTimes(playlistCount);
    expect(tracks).toHaveLength(playlistCount);
    expect(tracks.every((t) => t.title === 'Fresh Song')).toBe(true);
  });

  it('keeps the seeded tracks intact when the network fails', async () => {
    const db = makeTestDb({ seed: true });
    const before = db.select().from(schema.recommendationTracks).all().length;
    expect(before).toBeGreaterThan(0);
    await refreshSpotifyIfStale(db, failingFetch);
    expect(db.select().from(schema.recommendationTracks).all()).toHaveLength(before);
    // A full failure must not mark the feed fetched, so it retries next time.
    expect(isStale(db, 'spotify', 6 * 3600 * 1000)).toBe(true);
  });

  it('skips the network while fresh', async () => {
    const db = makeTestDb({ seed: true });
    const playlistCount = db
      .select()
      .from(schema.recommendations)
      .where(eq(schema.recommendations.service, 'spotify'))
      .all().length;
    const fetchMock = vi.fn(async () =>
      okResponse(spotifyEmbed([
        { uri: 'spotify:track:x', title: 'S', artist: 'A', preview: 'https://p.scdn.co/mp3-preview/x' },
      ])),
    );
    await refreshSpotifyIfStale(db, fetchMock as unknown as typeof fetch);
    await refreshSpotifyIfStale(db, fetchMock as unknown as typeof fetch);
    // Once per playlist on the first pass only; the second pass is fresh.
    expect(fetchMock).toHaveBeenCalledTimes(playlistCount);
  });
});
