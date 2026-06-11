import { describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { clearAll, isSeeded, seedDb } from '@/lib/seed/seedDb';
import { makeTestDb } from './helpers';

describe('seedDb', () => {
  it('populates every content table from the committed seed data', () => {
    const db = makeTestDb({ seed: true });
    expect(db.select().from(schema.articles).all()).toHaveLength(10);
    expect(db.select().from(schema.guitars).all()).toHaveLength(13);
    expect(db.select().from(schema.mugs).all().length).toBeGreaterThan(50);
    expect(db.select().from(schema.locations).all().length).toBeGreaterThan(20);
    expect(db.select().from(schema.timelineEntries).all()).toHaveLength(8);
    expect(db.select().from(schema.links).all()).toHaveLength(9);
    expect(db.select().from(schema.youtubeVideos).all().length).toBeGreaterThan(70);
    expect(db.select().from(schema.tweets).all()).toHaveLength(710);
    expect(db.select().from(schema.uggEpisodes).all()).toHaveLength(203);
    expect(db.select().from(schema.concerts).all().length).toBeGreaterThan(50);
    expect(db.select().from(schema.wifiNames).all()).toHaveLength(25);
  });

  it('parses article bodies into HTML', () => {
    const db = makeTestDb({ seed: true });
    for (const article of db.select().from(schema.articles).all()) {
      expect(article.bodyHtml, article.slug).toContain('<p');
      expect(article.bodyHtml, article.slug).not.toContain('{%');
      expect(article.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it('isSeeded/clearAll round-trip', () => {
    const db = makeTestDb();
    expect(isSeeded(db)).toBe(false);
    seedDb(db);
    expect(isSeeded(db)).toBe(true);
    clearAll(db);
    expect(isSeeded(db)).toBe(false);
  });
});
