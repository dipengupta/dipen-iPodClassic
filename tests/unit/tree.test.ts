import { describe, expect, it } from 'vitest';
import { allNodes, findNode, menuTree } from '@/lib/menu/tree';
import type { MenuNode, ViewType } from '@/lib/menu/types';

const VALID_VIEWS: ViewType[] = [
  'splitMenu', 'list', 'coverflow', 'textReader', 'video',
  'nowPlaying', 'photo', 'settings',
];

const DATA_SOURCES = [
  'articles', 'youtube', 'guitars', 'ugg', 'soundcloud',
  'mugs', 'photos', 'kitchen', 'alison', 'recipes', 'spiceBlends', 'concerts', 'wifi', 'list',
  'timeline', 'links', 'tweets', 'recommendations',
];

describe('menu tree integrity', () => {
  it('has unique node ids', () => {
    const ids = allNodes().map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every node has a valid view type', () => {
    for (const node of allNodes()) {
      expect(VALID_VIEWS, `node ${node.id}`).toContain(node.view);
    }
  });

  it('dataSource keys all have a registered source', () => {
    for (const node of allNodes()) {
      if (node.dataSource) {
        expect(DATA_SOURCES, `node ${node.id}`).toContain(node.dataSource);
      }
    }
  });

  it('every node renders something: children, dataSource, payload, or a self-contained view', () => {
    const selfContained: ViewType[] = ['settings'];
    for (const node of allNodes()) {
      const renders =
        (node.children?.length ?? 0) > 0 ||
        Boolean(node.dataSource) ||
        Boolean(node.payload) ||
        selfContained.includes(node.view);
      expect(renders, `node ${node.id} would render an empty screen`).toBe(true);
    }
  });

  it('contains the six top-level sections in order', () => {
    expect(menuTree.children!.map((c: MenuNode) => c.label)).toEqual([
      'Music', 'Collections', 'Professional', 'Articles', 'About', 'Misc',
    ]);
  });

  it('About sits on the home menu, shows the contact email, and explains the controls', () => {
    const about = findNode('about')?.payload?.text;
    expect(about).toContain('dipenrgupta@icloud.com');
    expect(about).toContain('center button');
  });

  it('Collections holds the mug list, the static collection photos, recipes, spice blends, and Alison', () => {
    expect(findNode('collections')?.children?.map((c) => c.label)).toEqual([
      'Mug Collection', 'Vinyls', 'Fridge Magnets', 'Recipes', 'Spice Blends', 'Alison',
    ]);
    expect(findNode('collections.mugs')?.view).toBe('list');
    expect(findNode('collections.alison')?.view).toBe('coverflow');
  });

  it('the root title is the status-bar boot title', () => {
    expect(menuTree.label).toBe("Dipen's iPod");
  });

  it('the Misc section holds the fun sections in order', () => {
    expect(findNode('extras')?.children?.map((c) => c.label)).toEqual([
      'Photos', 'Kitchen Wins', 'Concerts Seen', 'List',
      'pennguytweets', 'Links', 'Amusing Wi-Fi Names', 'Settings',
    ]);
  });

  it('Music holds the playlists, with Recommendations just above Octavium', () => {
    expect(findNode('music')?.children?.map((c) => c.label)).toEqual([
      'Guitars', 'YouTube', 'Instagram', 'SoundCloud', 'Recommendations', 'Octavium',
    ]);
  });

  it('findNode resolves nested ids', () => {
    expect(findNode('music.guitars')?.view).toBe('coverflow');
    expect(findNode('nope')).toBeUndefined();
  });
});
