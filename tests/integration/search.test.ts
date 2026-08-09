import { beforeAll, describe, expect, it, vi } from 'vitest';
import { GET as search } from '@/../app/api/search/route';
import { searchContent, type SearchResponse } from '@/lib/search/searchContent';
import { injectAppDb, makeTestDb } from './helpers';
import type { Db } from '@/lib/db/client';

let db: Db;

beforeAll(() => {
  db = makeTestDb({ seed: true });
  injectAppDb(db);
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
});

const groupByType = (r: SearchResponse, type: string) => r.groups.find((g) => g.type === type);

describe('searchContent', () => {
  it('ignores queries shorter than two characters', () => {
    const r = searchContent(db, 'a');
    expect(r.total).toBe(0);
    expect(r.groups).toEqual([]);
  });

  it('finds a mug by title and points at the mug section', () => {
    const r = searchContent(db, 'Montreal');
    const mugs = groupByType(r, 'mugs');
    expect(mugs).toBeDefined();
    const hit = mugs!.results.find((x) => x.title === 'Montreal');
    expect(hit).toBeDefined();
    expect(hit!.entryId).toBe('col-mugs');
    expect(hit!.id).toMatch(/^mug-\d+$/);
  });

  it('finds a tweet by its text with a tweet focus id', () => {
    const r = searchContent(db, 'merge sort');
    const tweets = groupByType(r, 'tweets');
    expect(tweets).toBeDefined();
    expect(tweets!.results.length).toBeGreaterThan(0);
    expect(tweets!.results[0].entryId).toBe('wri-tweets');
    expect(tweets!.results[0].id).toMatch(/^tweet-\d+$/);
  });

  it('is case-insensitive', () => {
    expect(searchContent(db, 'MONTREAL').total).toBe(searchContent(db, 'montreal').total);
  });

  it('never surfaces travel-map locations (no iTunes destination)', () => {
    // A term that appears in location titles/notes should not create a group.
    const r = searchContent(db, 'the');
    expect(r.groups.some((g) => g.type === 'locations')).toBe(false);
    // Every result maps to a real catalog entry id, never a location.
    for (const g of r.groups) {
      for (const res of g.results) {
        expect(res.entryId).not.toMatch(/location/i);
      }
    }
  });

  it('total equals the sum of group results', () => {
    const r = searchContent(db, 'the');
    expect(r.total).toBe(r.groups.reduce((n, g) => n + g.results.length, 0));
  });
});

describe('/api/search', () => {
  it('returns the search response as JSON', async () => {
    const res = await search(new Request('http://test.local/api/search?q=Montreal'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SearchResponse;
    expect(body.query).toBe('Montreal');
    expect(body.total).toBeGreaterThan(0);
  });
});
