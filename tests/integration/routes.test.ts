import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GET as getArticle } from '@/../app/api/articles/[slug]/route';
import { GET as getArticles } from '@/../app/api/articles/route';
import { GET as getContent } from '@/../app/api/content/[section]/route';
import { GET as getRandomTweet } from '@/../app/api/tweets/random/route';
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
    for (const section of ['guitars', 'mugs', 'locations', 'gallery', 'photos', 'kitchen', 'concerts', 'wifi', 'timeline', 'links', 'ugg']) {
      const res = await getContent(req, params({ section }));
      expect(res.status, section).toBe(200);
      const { items } = await res.json();
      expect(items.length, section).toBeGreaterThan(0);
    }
  });

  it('splits profile photos and kitchen wins out of the gallery', async () => {
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
    const gallery = await (await getContent(req, params({ section: 'gallery' }))).json();
    expect(
      gallery.items.every((g: { category: string }) => ['vinyl', 'mug', 'magnet', 'pin'].includes(g.category)),
    ).toBe(true);
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

  it('serves UGG episodes most-recent first with playable fields', async () => {
    const { items } = await (await getContent(req, params({ section: 'ugg' }))).json();
    expect(items.length).toBe(203);
    expect(items[0].episode).toBe(204);
    expect(items[items.length - 1].episode).toBe(1);
    for (const item of items.slice(0, 5)) {
      expect(item.filename).toMatch(/^ugg-\d+\.mp4$/);
      expect(item.year).toBeGreaterThanOrEqual(2021);
      expect(typeof item.name).toBe('string');
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

describe('/api/tweets/random', () => {
  it('returns a tweet', async () => {
    const res = await getRandomTweet();
    const { tweet } = await res.json();
    expect(typeof tweet.text).toBe('string');
    expect(tweet.text.length).toBeGreaterThan(0);
  });
});
