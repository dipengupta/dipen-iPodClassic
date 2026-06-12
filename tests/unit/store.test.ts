import { beforeEach, describe, expect, it } from 'vitest';
import type { FrameItem, PlayTrack } from '@/lib/menu/types';
import { findNode, menuTree } from '@/lib/menu/tree';
import { PAN_STEP, SCROLL_STEP, SEEK_STEP_SEC, useIpodStore } from '@/lib/store/ipodStore';

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

describe('media inputs', () => {
  it('select on a video frame toggles the scrubber, not play/pause', () => {
    store().pushDetail('video', { videoId: 'x' });
    const before = store().playPauseNonce;
    store().handleInput({ type: 'select' });
    expect(store().scrubbing).toBe(true);
    expect(store().playPauseNonce).toBe(before);
    store().handleInput({ type: 'select' });
    expect(store().scrubbing).toBe(false);
  });

  it('the play/pause input still bumps the nonce on playback frames', () => {
    store().pushDetail('video', { videoId: 'x' });
    const before = store().playPauseNonce;
    store().handleInput({ type: 'playPause' });
    expect(store().playPauseNonce).toBe(before + 1);
  });

  it('MENU exits scrub mode before popping', () => {
    store().pushDetail('video', { videoId: 'x' });
    const depth = store().stack.length;
    store().handleInput({ type: 'select' }); // scrubber up
    store().handleInput({ type: 'menu' });
    expect(store().scrubbing).toBe(false);
    expect(store().stack).toHaveLength(depth); // still on the video
    store().handleInput({ type: 'menu' });
    expect(store().stack).toHaveLength(depth - 1);
  });
});

describe('playback', () => {
  const queue: PlayTrack[] = [
    { id: 'vid-a', title: 'First video' },
    { id: 'vid-b', title: 'Second video' },
    { id: 'vid-c', title: 'Third video' },
  ];

  it('playTrack sets the queue and pushes a now-playing frame', () => {
    store().playTrack('youtube', queue, 1);
    expect(store().playback).toMatchObject({ source: 'youtube', index: 1, playing: true });
    const top = store().stack[store().stack.length - 1];
    expect(top.view).toBe('video');
    expect(top.payload?.videoId).toBe('vid-b');
  });

  it('skipTrack replaces the now-playing frame in place and clamps at the ends', () => {
    store().playTrack('youtube', queue, 0);
    const depth = store().stack.length;
    const key = store().stack[depth - 1].key;
    store().skipTrack(1);
    expect(store().playback.index).toBe(1);
    expect(store().stack).toHaveLength(depth);
    expect(store().stack[depth - 1].key).toBe(key);
    store().skipTrack(-1);
    store().skipTrack(-1); // already at 0
    expect(store().playback.index).toBe(0);
    store().playTrack('youtube', queue, 2);
    store().skipTrack(1); // already at the end
    expect(store().playback.index).toBe(2);
  });

  it('prev/next act as transport controls while media is loaded', () => {
    store().playTrack('youtube', queue, 0);
    store().handleInput({ type: 'menu' }); // back to the menu, media keeps playing
    store().handleInput({ type: 'next' });
    expect(store().playback.index).toBe(1);
    // The skip re-opened the now-playing frame on top.
    expect(store().stack[store().stack.length - 1].view).toBe('video');
  });

  it('soundcloud playback pushes the nowPlaying card', () => {
    const scQueue: PlayTrack[] = [{ id: '4', title: 'Old jam' }];
    store().playTrack('soundcloud', scQueue, 0);
    expect(store().stack[store().stack.length - 1].view).toBe('nowPlaying');
    expect(store().playback.source).toBe('soundcloud');
  });

  it('setPlaying reflects player state without touching the queue', () => {
    store().playTrack('youtube', queue, 0);
    store().setPlaying(false);
    expect(store().playback).toMatchObject({ playing: false, index: 0, source: 'youtube' });
  });
});

describe('local (ugg) video playback', () => {
  const uggQueue: PlayTrack[] = [
    { id: '204', title: 'Ep. 204 · A', videoSrc: '/api/video/ugg-204.mp4', caption: 'latest' },
    { id: '203', title: 'Ep. 203 · B', videoSrc: '/api/video/ugg-203.mp4', caption: 'older' },
  ];

  it('playTrack pushes a video frame carrying the file and caption', () => {
    store().playTrack('ugg', uggQueue, 0);
    const top = store().stack[store().stack.length - 1];
    expect(top.view).toBe('video');
    expect(top.payload?.videoSrc).toBe('/api/video/ugg-204.mp4');
    expect(top.payload?.caption).toBe('latest');
    expect(store().playback.source).toBe('ugg');
  });

  it('keeps playing behind the menu; prev/next stay transport controls', () => {
    store().pushNode(findNode('music')!);
    store().playTrack('ugg', uggQueue, 0);
    store().handleInput({ type: 'menu' }); // back to the menu, audio keeps going
    expect(store().playback).toMatchObject({ source: 'ugg', index: 0 });
    store().handleInput({ type: 'next' });
    expect(store().playback.index).toBe(1);
    // The skip re-opened the now-playing frame on top.
    const top = store().stack[store().stack.length - 1];
    expect(top.view).toBe('video');
    expect(top.payload?.videoSrc).toBe('/api/video/ugg-203.mp4');
  });

  it('wheel ticks wake the caption overlay and scroll within bounds', () => {
    store().playTrack('ugg', uggQueue, 0);
    const top = () => store().stack[store().stack.length - 1];
    store().setMaxScroll(top().key, SCROLL_STEP);
    const nonce = store().captionNonce;
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().captionNonce).toBe(nonce + 1);
    expect(top().scrollOffset).toBe(SCROLL_STEP);
    // Clamped at the end, but the overlay still wakes.
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().captionNonce).toBe(nonce + 2);
    expect(top().scrollOffset).toBe(SCROLL_STEP);
  });

  it('episode skips reset the caption scroll in place', () => {
    store().playTrack('ugg', uggQueue, 0);
    const top = () => store().stack[store().stack.length - 1];
    const key = top().key;
    store().setMaxScroll(key, 64);
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(top().scrollOffset).toBe(SCROLL_STEP);
    store().skipTrack(1);
    expect(top().key).toBe(key); // same frame, no slide
    expect(top().payload?.videoSrc).toBe('/api/video/ugg-203.mp4');
    expect(top().scrollOffset).toBe(0);
  });

  it('wheel ticks seek instead of scrolling the caption while scrubbing', () => {
    store().playTrack('ugg', uggQueue, 0);
    const top = () => store().stack[store().stack.length - 1];
    store().setMaxScroll(top().key, SCROLL_STEP);
    store().setProgress(30, 100);
    store().handleInput({ type: 'select' }); // scrubber up
    const captionNonce = store().captionNonce;
    const scrubNonce = store().scrubNonce;
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().progress.position).toBe(30 + SEEK_STEP_SEC);
    expect(store().scrubNonce).toBe(scrubNonce + 1);
    expect(store().captionNonce).toBe(captionNonce); // caption stayed asleep
    expect(top().scrollOffset).toBe(0);
    // Optimistic position clamps to the known duration.
    store().setProgress(98, 100);
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().progress.position).toBe(100);
    store().setProgress(2, 100);
    store().handleInput({ type: 'scroll', dir: -1 });
    expect(store().progress.position).toBe(0);
  });

  it('playTrack and skips reset progress and scrub mode', () => {
    store().playTrack('ugg', uggQueue, 0);
    store().setProgress(42, 100);
    store().handleInput({ type: 'select' }); // scrubber up
    store().skipTrack(1);
    expect(store().scrubbing).toBe(false);
    expect(store().progress).toEqual({ position: 0, duration: 0 });
  });
});

describe('fullscreen video panning', () => {
  const uggQueue: PlayTrack[] = [
    { id: '204', title: 'Ep. 204 · A', videoSrc: '/api/video/ugg-204.mp4', caption: 'latest' },
    { id: '203', title: 'Ep. 203 · B', videoSrc: '/api/video/ugg-203.mp4', caption: 'older' },
  ];
  const top = () => store().stack[store().stack.length - 1];

  it('setMaxPan starts the crop centered and clamps on re-measure', () => {
    store().playTrack('ugg', uggQueue, 0);
    store().setMaxPan(top().key, 200);
    expect(top().panOffset).toBe(100);
    store().setMaxPan(top().key, 40); // new measurement recenters
    expect(top().panOffset).toBe(20);
  });

  it('wheel pans the crop instead of the caption while fullscreen', () => {
    store().setVideoFullscreen(true);
    store().playTrack('ugg', uggQueue, 0);
    store().setMaxScroll(top().key, SCROLL_STEP);
    store().setMaxPan(top().key, PAN_STEP * 2);
    const nonce = store().captionNonce;
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(top().panOffset).toBe(PAN_STEP * 2); // centered + one step
    expect(top().scrollOffset).toBe(0); // caption untouched
    expect(store().captionNonce).toBe(nonce); // caption stays asleep
    // Clamped at both ends.
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(top().panOffset).toBe(PAN_STEP * 2);
    for (let i = 0; i < 4; i++) store().handleInput({ type: 'scroll', dir: -1 });
    expect(top().panOffset).toBe(0);
    store().setVideoFullscreen(false);
  });

  it('scrub mode still wins over panning', () => {
    store().setVideoFullscreen(true);
    store().playTrack('ugg', uggQueue, 0);
    store().setMaxPan(top().key, 200);
    store().setProgress(30, 100);
    store().handleInput({ type: 'select' }); // scrubber up
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().progress.position).toBe(30 + SEEK_STEP_SEC);
    expect(top().panOffset).toBe(100); // crop did not move
    store().setVideoFullscreen(false);
  });

  it('landscape episodes (maxPan 0) keep caption scrolling even when fullscreen', () => {
    store().setVideoFullscreen(true);
    store().playTrack('ugg', uggQueue, 0);
    store().setMaxScroll(top().key, SCROLL_STEP);
    const nonce = store().captionNonce;
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(store().captionNonce).toBe(nonce + 1);
    expect(top().scrollOffset).toBe(SCROLL_STEP);
    store().setVideoFullscreen(false);
  });

  it('fullscreen off leaves caption scrolling untouched on portrait episodes', () => {
    store().setVideoFullscreen(false);
    store().playTrack('ugg', uggQueue, 0);
    store().setMaxScroll(top().key, SCROLL_STEP);
    store().setMaxPan(top().key, 200);
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(top().scrollOffset).toBe(SCROLL_STEP);
    expect(top().panOffset).toBe(100); // crop stays centered
  });

  it('episode skips reset the pan in place', () => {
    store().setVideoFullscreen(true);
    store().playTrack('ugg', uggQueue, 0);
    const key = top().key;
    store().setMaxPan(key, 200);
    store().handleInput({ type: 'scroll', dir: 1 });
    expect(top().panOffset).toBe(100 + PAN_STEP);
    store().skipTrack(1);
    expect(top().key).toBe(key); // same frame, no slide
    expect(top().maxPan).toBe(0);
    expect(top().panOffset).toBe(0);
    store().setVideoFullscreen(false);
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

  it('toggles tweet shuffle and updates the row sublabel', () => {
    store().pushNode(findNode('extras.settings')!);
    expect(store().tweetShuffle).toBe(false);
    expect(store().stack[1].items?.[1].label).toBe('pennguytweets');
    expect(store().stack[1].items?.[1].sublabel).toBe('Newest First');
    store().handleInput({ type: 'scroll', dir: 1 }); // down to the tweets row
    store().handleInput({ type: 'select' });
    expect(store().tweetShuffle).toBe(true);
    expect(store().stack[1].items?.[1].sublabel).toBe('Shuffled');
    store().handleInput({ type: 'select' });
    expect(store().tweetShuffle).toBe(false);
    expect(store().stack[1].items?.[1].sublabel).toBe('Newest First');
  });

  it('toggles video fullscreen and updates the row sublabel', () => {
    store().pushNode(findNode('extras.settings')!);
    expect(store().videoFullscreen).toBe(false);
    expect(store().stack[1].items?.[2].label).toBe('Video Fullscreen');
    expect(store().stack[1].items?.[2].sublabel).toBe('Off');
    store().handleInput({ type: 'scroll', dir: 1 });
    store().handleInput({ type: 'scroll', dir: 1 }); // down to the fullscreen row
    store().handleInput({ type: 'select' });
    expect(store().videoFullscreen).toBe(true);
    expect(store().stack[1].items?.[2].sublabel).toBe('On');
    store().handleInput({ type: 'select' });
    expect(store().videoFullscreen).toBe(false);
    expect(store().stack[1].items?.[2].sublabel).toBe('Off');
  });
});
