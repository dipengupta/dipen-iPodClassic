import { beforeEach, describe, expect, it } from 'vitest';
import type { FrameItem } from '@/lib/menu/types';
import { findNode, menuTree } from '@/lib/menu/tree';
import { SCROLL_STEP, useIpodStore } from '@/lib/store/ipodStore';

const store = () => useIpodStore.getState();

beforeEach(() => {
  useIpodStore.getState().reset();
});

describe('navigation stack', () => {
  it('boots on the main menu with the tree root', () => {
    const { stack } = store();
    expect(stack).toHaveLength(1);
    expect(stack[0].view).toBe('splitMenu');
    expect(stack[0].items?.map((i) => i.label)).toEqual(
      menuTree.children!.map((c) => c.label),
    );
  });

  it('push/pop walk the stack and never pop the root', () => {
    store().pushNode(findNode('music')!);
    expect(store().stack).toHaveLength(2);
    store().handleInput({ type: 'menu' });
    expect(store().stack).toHaveLength(1);
    store().handleInput({ type: 'menu' });
    expect(store().stack).toHaveLength(1);
  });

  it('select opens the highlighted child node', () => {
    store().handleInput({ type: 'select' });
    expect(store().stack[1].title).toBe('Music');
    expect(store().stack[1].items?.[0].label).toBe('Guitars');
  });
});

describe('scrolling', () => {
  it('clamps selection to the list bounds', () => {
    store().handleInput({ type: 'scroll', dir: -1 });
    expect(store().stack[0].selectedIndex).toBe(0);
    const count = store().stack[0].items!.length;
    for (let i = 0; i < count + 5; i++) {
      store().handleInput({ type: 'scroll', dir: 1 });
    }
    expect(store().stack[0].selectedIndex).toBe(count - 1);
  });

  it('scrolls text views by lines and clamps to maxScroll', () => {
    store().pushDetail('textReader', { title: 'T', text: 'hello' });
    const key = store().stack[1].key;
    store().setMaxScroll(key, 40);
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().stack[1].scrollOffset).toBe(SCROLL_STEP);
    store().handleInput({ type: 'scroll', dir: 1 });
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().stack[1].scrollOffset).toBe(40);
    store().handleInput({ type: 'scroll', dir: -1 });
    store().handleInput({ type: 'scroll', dir: -1 });
    store().handleInput({ type: 'scroll', dir: -1 });
    expect(store().stack[1].scrollOffset).toBe(0);
  });
});

describe('coverflow', () => {
  const covers: FrameItem[] = [
    { id: 'a', label: 'A', flipText: 'about A' },
    { id: 'b', label: 'B', flipText: 'about B' },
  ];

  it('center press flips, menu unflips before popping', () => {
    store().pushItems('Covers', 'coverflow', covers);
    store().handleInput({ type: 'select' });
    expect(store().stack[1].flipped).toBe(true);
    store().handleInput({ type: 'menu' });
    expect(store().stack[1].flipped).toBe(false);
    expect(store().stack).toHaveLength(2);
    store().handleInput({ type: 'menu' });
    expect(store().stack).toHaveLength(1);
  });

  it('next/prev buttons step covers', () => {
    store().pushItems('Covers', 'coverflow', covers);
    store().handleInput({ type: 'next' });
    expect(store().stack[1].selectedIndex).toBe(1);
    store().handleInput({ type: 'prev' });
    expect(store().stack[1].selectedIndex).toBe(0);
  });
});

describe('media + tweet inputs', () => {
  it('select on a video frame toggles play/pause instead of selecting', () => {
    store().pushDetail('video', { videoId: 'x' });
    const before = store().playPauseNonce;
    store().handleInput({ type: 'select' });
    expect(store().playPauseNonce).toBe(before + 1);
  });

  it('select on the tweet view shuffles', () => {
    store().pushNode(findNode('extras.tweets')!);
    const before = store().tweetNonce;
    store().handleInput({ type: 'select' });
    expect(store().tweetNonce).toBe(before + 1);
  });
});

describe('settings', () => {
  it('toggles the theme and updates the row sublabel', () => {
    store().pushNode(findNode('extras.settings')!);
    expect(store().theme).toBe('silver');
    expect(store().stack[1].items?.[0].sublabel).toBe('Silver');
    store().handleInput({ type: 'select' });
    expect(store().theme).toBe('black');
    expect(store().stack[1].items?.[0].sublabel).toBe('Black');
  });
});
