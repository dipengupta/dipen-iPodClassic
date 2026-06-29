'use client';

import { useEffect, useRef } from 'react';
import { unlockAudio } from '@/lib/audio/clicker';
import { HOLD_MS, holdInputFor, inputForKey } from '@/lib/input/keyboard';
import { loadItems } from '@/lib/menu/dataSources';
import { useIpodStore } from '@/lib/store/ipodStore';
import ClickWheel from './ClickWheel';
import Screen from './Screen';
import styles from './Ipod.module.css';

export default function Ipod() {
  const handleInput = useIpodStore((s) => s.handleInput);
  const setLoadItems = useIpodStore((s) => s.setLoadItems);
  const setTheme = useIpodStore((s) => s.setTheme);
  const setTweetShuffle = useIpodStore((s) => s.setTweetShuffle);
  const setVideoFullscreen = useIpodStore((s) => s.setVideoFullscreen);
  // Tracks a held center/play-pause key so we can tell a tap from a hold.
  const hold = useRef<{ key: string; timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);

  useEffect(() => {
    setLoadItems(loadItems);
    // Adopt whatever the pre-hydration script put on <html>.
    const docTheme = document.documentElement.dataset.theme;
    if (docTheme === 'black' || docTheme === 'silver') {
      setTheme(docTheme);
    }
    try {
      if (localStorage.getItem('ipod-tweet-shuffle') === '1') setTweetShuffle(true);
      if (localStorage.getItem('ipod-video-fullscreen') === '1') setVideoFullscreen(true);
    } catch {
      // Storage can be unavailable (private mode); the settings just won't restore.
    }
  }, [setLoadItems, setTheme, setTweetShuffle, setVideoFullscreen]);

  useEffect(() => {
    const clearHold = () => {
      if (hold.current) clearTimeout(hold.current.timer);
      hold.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const input = inputForKey(e.key);
      if (!input) return;
      e.preventDefault();
      unlockAudio();
      const holdInput = holdInputFor(input);
      if (holdInput) {
        // Holdable keys (Enter/Space) fire on key-up so we can detect a hold;
        // ignore auto-repeat while the key is down.
        if (e.repeat || hold.current?.key === e.key) return;
        hold.current = {
          key: e.key,
          fired: false,
          timer: setTimeout(() => {
            if (hold.current) hold.current.fired = true;
            handleInput(holdInput);
          }, HOLD_MS),
        };
        return;
      }
      handleInput(input);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const held = hold.current;
      if (!held || held.key !== e.key) return;
      clearTimeout(held.timer);
      hold.current = null;
      // A quick tap (the hold never fired) is the normal short press.
      if (!held.fired) {
        const input = inputForKey(e.key);
        if (input) handleInput(input);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHold);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHold);
      clearHold();
    };
  }, [handleInput]);

  return (
    <div className={styles.stage}>
      <div className={styles.device} data-testid="ipod">
        <Screen />
        <ClickWheel />
      </div>
      <p className={styles.hints} aria-hidden="true">
        ↑↓ scroll · Enter select · Esc menu · Space play/pause · hold Enter: Now Playing · hold Space: sleep
      </p>
      <a className={styles.itunesLink} href="/itunes">
        iTunes view →
      </a>
    </div>
  );
}
