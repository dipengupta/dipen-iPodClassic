import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { clearAll, isSeeded, seedDb, syncSeed } from '@/lib/seed/seedDb';
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
    expect(db.select().from(schema.tweets).all()).toHaveLength(768);
    expect(db.select().from(schema.uggEpisodes).all()).toHaveLength(203);
    expect(db.select().from(schema.concerts).all().length).toBeGreaterThan(50);
    expect(db.select().from(schema.wifiNames).all()).toHaveLength(25);
    // Gallery items split by category: 10 profile + 10 kitchen + 95 alison.
    expect(
      db.select().from(schema.galleryItems).where(eq(schema.galleryItems.category, 'alison')).all(),
    ).toHaveLength(95);
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

describe('syncSeed (per-table, deploy-time)', () => {
  const tmpDirs: string[] = [];
  function tmpSeedDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipod-seed-'));
    tmpDirs.push(dir);
    return dir;
  }
  afterEach(() => {
    while (tmpDirs.length) fs.rmSync(tmpDirs.pop()!, { recursive: true, force: true });
  });

  it('seeds a table the first time and skips it when unchanged', () => {
    const db = makeTestDb();
    const seedDir = tmpSeedDir();
    fs.writeFileSync(path.join(seedDir, 'wifi.json'), JSON.stringify(['Net A', 'Net B']));

    const first = syncSeed(db, seedDir);
    expect(first).toContain('wifi');
    expect(db.select().from(schema.wifiNames).all()).toHaveLength(2);

    // Nothing changed on disk, so a second run is a no-op for every table.
    expect(syncSeed(db, seedDir)).toEqual([]);
    expect(db.select().from(schema.wifiNames).all()).toHaveLength(2);
  });

  it('re-seeds only the table whose seed source changed', () => {
    const db = makeTestDb();
    const seedDir = tmpSeedDir();
    fs.writeFileSync(path.join(seedDir, 'wifi.json'), JSON.stringify(['Net A', 'Net B']));
    fs.writeFileSync(path.join(seedDir, 'list.json'), JSON.stringify([{ category: 'right', items: ['Costco'] }]));
    syncSeed(db, seedDir);

    // Edit just wifi; list.json is untouched.
    fs.writeFileSync(path.join(seedDir, 'wifi.json'), JSON.stringify(['Net A', 'Net B', 'Net C']));
    const changed = syncSeed(db, seedDir);
    expect(changed).toEqual(['wifi']);
    expect(db.select().from(schema.wifiNames).all()).toHaveLength(3); // cleared + reinserted, no dupes
    expect(db.select().from(schema.listItems).all()).toHaveLength(1);
  });

  it('leaves a table untouched when its seed source is absent', () => {
    const db = makeTestDb();
    const seedDir = tmpSeedDir();
    fs.writeFileSync(path.join(seedDir, 'wifi.json'), JSON.stringify(['Net A']));

    // No recipes.json in this seed dir — the recipes table must stay empty
    // rather than being cleared/seeded.
    const changed = syncSeed(db, seedDir);
    expect(changed).toContain('wifi');
    expect(changed).not.toContain('recipes');
    expect(db.select().from(schema.recipes).all()).toHaveLength(0);
  });
});
