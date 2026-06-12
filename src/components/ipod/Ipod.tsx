'use client';

import { useEffect } from 'react';
import { unlockAudio } from '@/lib/audio/clicker';
import { inputForKey } from '@/lib/input/keyboard';
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const input = inputForKey(e.key);
      if (!input) return;
      e.preventDefault();
      unlockAudio();
      handleInput(input);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleInput]);

  return (
    <div className={styles.stage}>
      <div className={styles.device} data-testid="ipod">
        <Screen />
        <ClickWheel />
      </div>
      <p className={styles.hints} aria-hidden="true">
        ↑↓ scroll · Enter select · Esc menu · Space play/pause
      </p>
      <a className={styles.itunesLink} href="/itunes">
        iTunes view →
      </a>
    </div>
  );
}
