import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSubstackFeed } from '@/lib/fetchers/substack';
import { parseYoutubeFeed } from '@/lib/fetchers/youtubeRss';

const fixture = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures', name), 'utf8');

describe('parseYoutubeFeed', () => {
  it('parses a real channel feed', () => {
    const videos = parseYoutubeFeed(fixture('youtube-feed.xml'));
    expect(videos.length).toBeGreaterThan(5);
    for (const video of videos) {
      expect(video.videoId).toMatch(/^[\w-]{6,}$/);
      expect(video.title.length).toBeGreaterThan(0);
      expect(video.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns empty for non-feed XML', () => {
    expect(parseYoutubeFeed('<feed></feed>')).toEqual([]);
  });
});

describe('parseSubstackFeed', () => {
  it('parses a real substack feed with full bodies', () => {
    const articles = parseSubstackFeed(fixture('substack-feed.xml'));
    expect(articles.length).toBeGreaterThan(3);
    for (const article of articles) {
      expect(article.slug).toMatch(/^[\w-]+$/);
      expect(article.sourceUrl).toContain('dipengupta.substack.com/p/');
      expect(article.sourceUrl).not.toContain('?');
      expect(article.bodyHtml.length).toBeGreaterThan(100);
      expect(article.publishedLabel).toMatch(/^Published /);
    }
  });

  it('skips items without a /p/ link or body', () => {
    const xml = `<rss><channel>
      <item><title>no link</title><pubDate>x</pubDate></item>
    </channel></rss>`;
    expect(parseSubstackFeed(xml)).toEqual([]);
  });
});
