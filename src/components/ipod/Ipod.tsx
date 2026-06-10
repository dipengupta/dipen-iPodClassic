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

  useEffect(() => {
    setLoadItems(loadItems);
    // Adopt whatever the pre-hydration script put on <html>.
    const docTheme = document.documentElement.dataset.theme;
    if (docTheme === 'black' || docTheme === 'silver') {
      setTheme(docTheme);
    }
  }, [setLoadItems, setTheme]);

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
