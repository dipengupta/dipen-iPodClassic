import { describe, expect, it } from 'vitest';
import { allNodes, findNode, menuTree } from '@/lib/menu/tree';
import type { MenuNode, ViewType } from '@/lib/menu/types';

const VALID_VIEWS: ViewType[] = [
  'splitMenu', 'list', 'coverflow', 'textReader', 'video',
  'nowPlaying', 'photo', 'settings',
];

const DATA_SOURCES = [
  'articles', 'youtube', 'guitars', 'ugg', 'soundcloud',
  'mugs', 'photos', 'kitchen', 'recipes', 'concerts', 'wifi',
  'timeline', 'links', 'tweets',
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

  it('About sits on the home menu and shows the contact email', () => {
    expect(findNode('about')?.payload?.text).toContain('dipenrgupta@icloud.com');
  });

  it('Collections holds the mug coverflow and the static collection photos', () => {
    expect(findNode('collections')?.children?.map((c) => c.label)).toEqual([
      'Mug Collection', 'Vinyls', 'Travel Mugs', 'Fridge Magnets',
    ]);
  });

  it('the root title is the status-bar boot title', () => {
    expect(menuTree.label).toBe("Dipen's iPod");
  });

  it('the Misc section holds the fun sections in order', () => {
    expect(findNode('extras')?.children?.map((c) => c.label)).toEqual([
      'Photos', 'Kitchen Wins', 'Recipes', 'Concerts', 'Wi-Fi Names',
      'Links', 'pennguytweets', 'Settings',
    ]);
  });

  it('findNode resolves nested ids', () => {
    expect(findNode('music.guitars')?.view).toBe('coverflow');
    expect(findNode('nope')).toBeUndefined();
  });
});
