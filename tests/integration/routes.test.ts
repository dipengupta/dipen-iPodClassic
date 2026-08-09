import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GET as getArticle } from '@/../app/api/articles/[slug]/route';
import { GET as getArticles } from '@/../app/api/articles/route';
import { GET as getContent } from '@/../app/api/content/[section]/route';
import { GET as getYoutube } from '@/../app/api/youtube/route';
import { injectAppDb, makeTestDb } from './helpers';

const params = <T extends object>(value: T) => ({ params: Promise.resolve(value) });
const req = new Request('http://test.local/');

beforeAll(() => {
  injectAppDb(makeTestDb({ seed: true }));
  // Routes trigger live refreshes; keep tests offline.
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
});

describe('/api/content/[section]', () => {
  it('serves every registered section', async () => {
    for (const section of ['guitars', 'mugs', 'photos', 'kitchen', 'alison', 'recipes', 'concerts', 'wifi', 'list', 'timeline', 'links', 'ugg', 'tweets', 'recommendations']) {
      const res = await getContent(req, params({ section }));
      expect(res.status, section).toBe(200);
      const { items } = await res.json();
      expect(items.length, section).toBeGreaterThan(0);
    }
  });

  it('splits profile photos and kitchen wins out of the gallery items', async () => {
    const photos = await (await getContent(req, params({ section: 'photos' }))).json();
    expect(photos.items).toHaveLength(10);
    for (const item of photos.items) {
      expect(item.category).toBe('profile');
    }
    const kitchen = await (await getContent(req, params({ section: 'kitchen' }))).json();
    expect(kitchen.items).toHaveLength(10);
    for (const item of kitchen.items) {
      expect(item.category).toBe('kitchen');
    }
    const alison = await (await getContent(req, params({ section: 'alison' }))).json();
    expect(alison.items).toHaveLength(95);
    for (const item of alison.items) {
      expect(item.category).toBe('alison');
    }
    // The vinyl/mug/magnet rows moved into static tree nodes; the section is gone.
    const gallery = await getContent(req, params({ section: 'gallery' }));
    expect(gallery.status).toBe(404);
  });

  it('serves concerts in year groups and the wifi list', async () => {
    const concerts = await (await getContent(req, params({ section: 'concerts' }))).json();
    expect(concerts.items.length).toBeGreaterThan(50);
    expect(concerts.items[0].year).toBe('2010/2011');
    expect(concerts.items.some((c: { name: string }) => c.name === 'lol')).toBe(true);
    const wifi = await (await getContent(req, params({ section: 'wifi' }))).json();
    expect(wifi.items).toHaveLength(25);
    expect(wifi.items[0].name).toBe('Martin Router King');
  });

  it('serves the List split into its two groups', async () => {
    const { items } = await (await getContent(req, params({ section: 'list' }))).json();
    const categories = new Set(items.map((r: { category: string }) => r.category));
    expect([...categories].sort()).toEqual(['right', 'ruining']);
    expect(items[0]).toMatchObject({ category: 'ruining', name: 'Garlic ice cream' });
    expect(items.some((r: { name: string }) => r.name === "Buc-ee's")).toBe(true);
    expect(items.some((r: { name: string }) => r.name === 'Costco')).toBe(true);
  });

  it('serves recipes across the four categories with bodies and source links', async () => {
    const { items } = await (await getContent(req, params({ section: 'recipes' }))).json();
    expect(items).toHaveLength(39);
    const categories = new Set(items.map((r: { category: string }) => r.category));
    expect([...categories].sort()).toEqual(['baking', 'drinks', 'food', 'tips']);
    // Every recipe reads as text; link-backed ones keep the original URL.
    expect(items.every((r: { body: string }) => r.body.length > 0)).toBe(true);
    const tiramisu = items.find((r: { title: string }) => r.title === 'Tiramisu');
    expect(tiramisu.sourceUrl).toContain('tastesbetterfromscratch.com');
  });

  it('serves UGG episodes most-recent first with playable fields', async () => {
    const { items } = await (await getContent(req, params({ section: 'ugg' }))).json();
    expect(items.length).toBe(217);
    expect(items[0].episode).toBe(218);
    expect(items[items.length - 1].episode).toBe(1);
    for (const item of items.slice(0, 5)) {
      expect(item.filename).toMatch(/^ugg-\d+\.mp4$/);
      expect(item.year).toBeGreaterThanOrEqual(2021);
      expect(typeof item.name).toBe('string');
    }
  });

  it('serves the scraped tweets newest first', async () => {
    const { items } = await (await getContent(req, params({ section: 'tweets' }))).json();
    expect(items).toHaveLength(768);
    expect(items[0].number).toBe(768);
    expect(items[items.length - 1].number).toBe(1);
    expect(items[0].isSample).toBe(false);
    // The last few scraped tweets have no URL; everything still serves.
    expect(items.every((t: { text: string }) => t.text.length > 0)).toBe(true);
    // Dates are mandatory — every tweet carries a postedAt (recent ones are
    // backfilled with their commit date).
    expect(items.every((t: { postedAt: string | null }) => Boolean(t.postedAt))).toBe(true);
  });

  it('serves recommendations with Spotify tracks nested', async () => {
    // The offline fetch stub makes the live Spotify refresh a no-op, so this
    // exercises the seeded fallback — nothing blanks.
    const { items } = await (await getContent(req, params({ section: 'recommendations' }))).json();
    expect(items.length).toBeGreaterThan(0);
    // Every Spotify playlist carries playable tracks with a preview MP3.
    const spotify = items.filter((r: { service: string }) => r.service === 'spotify');
    expect(spotify.length).toBe(items.length);
    for (const rec of spotify) {
      expect(rec.tracks.length).toBeGreaterThan(0);
      expect(rec.tracks[0].previewUrl).toMatch(/^https?:\/\//);
    }
    // Any Apple Music playlist (none seeded today) deep-links out with no tracks.
    for (const rec of items.filter((r: { service: string }) => r.service === 'apple')) {
      expect(rec.tracks).toHaveLength(0);
      expect(rec.playlistUrl).toContain('music.apple.com');
    }
  });

  it('404s unknown sections', async () => {
    const res = await getContent(req, params({ section: 'nope' }));
    expect(res.status).toBe(404);
  });
});

describe('/api/articles', () => {
  it('lists newest first even when the live refresh fails', async () => {
    const res = await getArticles();
    const { items } = await res.json();
    expect(items).toHaveLength(10);
    expect(items[0].slug).toBe('article10');
    expect(items[9].slug).toBe('article1');
  });

  it('serves one article body by slug', async () => {
    const res = await getArticle(req, params({ slug: 'article1' }));
    const { article } = await res.json();
    expect(article.bodyHtml).toContain('<p>');
  });

  it('404s a missing slug', async () => {
    const res = await getArticle(req, params({ slug: 'missing' }));
    expect(res.status).toBe(404);
  });
});

describe('/api/youtube', () => {
  it('serves the archive when the feed is unreachable', async () => {
    const res = await getYoutube();
    const { items } = await res.json();
    expect(items.length).toBeGreaterThan(70);
    expect(items[0].publishedAt >= items[items.length - 1].publishedAt).toBe(true);
  });
});

