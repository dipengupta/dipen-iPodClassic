import { describe, expect, it } from 'vitest';
import { allNodes, findNode, menuTree } from '@/lib/menu/tree';
import type { MenuNode, ViewType } from '@/lib/menu/types';

const VALID_VIEWS: ViewType[] = [
  'splitMenu', 'list', 'coverflow', 'textReader', 'video',
  'nowPlaying', 'photo', 'settings', 'tweet',
];

const DATA_SOURCES = [
  'articles', 'youtube', 'guitars', 'reels', 'soundcloud',
  'locations', 'mugs', 'gallery', 'timeline', 'links',
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
    const selfContained: ViewType[] = ['tweet', 'settings'];
    for (const node of allNodes()) {
      const renders =
        (node.children?.length ?? 0) > 0 ||
        Boolean(node.dataSource) ||
        Boolean(node.payload) ||
        selfContained.includes(node.view);
      expect(renders, `node ${node.id} would render an empty screen`).toBe(true);
    }
  });

  it('contains the five top-level sections in order', () => {
    expect(menuTree.children!.map((c: MenuNode) => c.label)).toEqual([
      'Music', 'Articles', 'Collections', 'Professional', 'Extras',
    ]);
  });

  it('findNode resolves nested ids', () => {
    expect(findNode('music.guitars')?.view).toBe('coverflow');
    expect(findNode('nope')).toBeUndefined();
  });
});
