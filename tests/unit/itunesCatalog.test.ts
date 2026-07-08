import { describe, expect, it } from 'vitest';
import { catalog, DEFAULT_ENTRY_ID, entryById, SIDEBAR_GROUPS } from '@/lib/itunes/catalog';
import type { LoaderKey, ViewKind } from '@/lib/itunes/types';

const VIEW_KINDS: ViewKind[] = [
  'coverflow', 'tracks', 'video', 'reading', 'tweets', 'staticPhoto', 'external',
];

/**
 * Every piece of iPod content must be reachable from the iTunes sidebar. This
 * maps each iPod dataSource / static section to the loader(s) that surface it;
 * the guard below fails if a future iPod section is added without an iTunes home.
 * (recommendations is surfaced dynamically by the PLAYLISTS section — see the
 * loadPlaylists/loadPlaylist tests in itunesLoaders.test.ts.)
 */
const IPOD_CONTENT_TO_LOADER: Record<string, LoaderKey> = {
  // dataSource-backed sections
  articles: 'articles',
  youtube: 'youtube',
  guitars: 'guitars',
  ugg: 'instagram',
  soundcloud: 'soundcloud',
  mugs: 'mugs',
  photos: 'photos',
  kitchen: 'kitchen',
  alison: 'alison',
  recipes: 'recipes',
  concerts: 'concerts',
  wifi: 'wifi',
  list: 'list',
  timeline: 'professional',
  links: 'links',
  tweets: 'tweets',
  // static (tree.ts payload) sections
  about: 'about',
  octavium: 'octavium',
  vinyls: 'vinyls',
  magnets: 'magnets',
};

describe('iTunes catalog integrity', () => {
  it('has unique entry ids', () => {
    const ids = catalog.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a valid view kind', () => {
    for (const entry of catalog) {
      expect(VIEW_KINDS, `entry ${entry.id}`).toContain(entry.view);
    }
  });

  it('every non-device entry has a loader; device entries link out', () => {
    for (const entry of catalog) {
      if (entry.group === 'DEVICES') {
        expect(entry.href, `device ${entry.id}`).toBeTruthy();
      } else {
        expect(entry.loader, `entry ${entry.id}`).toBeTruthy();
      }
    }
  });

  it('only uses the declared sidebar groups', () => {
    for (const entry of catalog) {
      expect(SIDEBAR_GROUPS, `entry ${entry.id}`).toContain(entry.group);
    }
  });

  it('keeps DEVICES → the iPod link back to /', () => {
    const ipod = catalog.find((e) => e.group === 'DEVICES');
    expect(ipod?.href).toBe('/');
  });

  it('groups items into the themed sections', () => {
    const music = catalog.filter((e) => e.group === 'MUSIC').map((e) => e.label);
    expect(music).toEqual(['Guitars', 'YouTube', 'Instagram', 'SoundCloud', 'Octavium']);
    expect(catalog.filter((e) => e.group === 'COLLECTIONS').map((e) => e.label)).toEqual([
      'Mug Collection', 'Vinyls', 'Fridge Magnets', 'Recipes', 'Alison',
    ]);
    // Concerts Seen now lives under Odds & Ends (moved out of Music).
    expect(catalog.filter((e) => e.group === 'ODDS & ENDS').map((e) => e.label)).toEqual([
      'Concerts Seen', 'List', 'Amusing Wi-Fi Names', 'Links',
    ]);
  });

  it('PLAYLISTS sits directly above ODDS & ENDS and is filled dynamically', () => {
    expect(SIDEBAR_GROUPS).toContain('PLAYLISTS');
    expect(SIDEBAR_GROUPS.indexOf('PLAYLISTS')).toBe(SIDEBAR_GROUPS.indexOf('ODDS & ENDS') - 1);
    // No static catalog rows — playlists are injected at runtime from the feed.
    expect(catalog.some((e) => e.group === 'PLAYLISTS')).toBe(false);
  });

  it('surfaces every iPod content section (regression guard)', () => {
    const loadersInUse = new Set(catalog.map((e) => e.loader).filter(Boolean));
    for (const [section, loader] of Object.entries(IPOD_CONTENT_TO_LOADER)) {
      expect(loadersInUse.has(loader), `iPod section "${section}" is missing from iTunes`).toBe(true);
    }
  });

  it('default entry exists and loads content', () => {
    const entry = entryById(DEFAULT_ENTRY_ID);
    expect(entry).toBeDefined();
    expect(entry?.loader).toBeTruthy();
  });

  it('MUSIC leads and DEVICES is last, matching SIDEBAR_GROUPS order', () => {
    const firstIndex = (g: string) => catalog.findIndex((e) => e.group === g);
    expect(SIDEBAR_GROUPS[0]).toBe('MUSIC');
    expect(SIDEBAR_GROUPS[SIDEBAR_GROUPS.length - 1]).toBe('DEVICES');
    // Static rows are laid out in the declared group order (PLAYLISTS is dynamic,
    // so it has no static rows to position).
    const groupFirsts = SIDEBAR_GROUPS.map(firstIndex).filter((i) => i >= 0);
    expect(groupFirsts).toEqual([...groupFirsts].sort((a, b) => a - b));
  });
});
