'use client';

import { useEffect } from 'react';
import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './SleepLayer.module.css';

/** The backlight times out and the screen dims after this much idle. */
const IDLE_MS = 60000;

/**
 * Display-off / sleep. Holding play/pause sets `asleep` (in the store); here we
 * also auto-dim after idle — like the Classic's backlight timeout — and render
 * the dim overlay. Audio keeps playing; any input wakes it (the store swallows
 * that first press). An active video never dims out from under you.
 */
export default function SleepLayer() {
  const asleep = useIpodStore((s) => s.asleep);
  const activityNonce = useIpodStore((s) => s.activityNonce);
  const topView = useIpodStore((s) => s.stack[s.stack.length - 1].view);
  const setAsleep = useIpodStore((s) => s.setAsleep);

  useEffect(() => {
    if (asleep || topView === 'video') return;
    const timer = setTimeout(() => setAsleep(true), IDLE_MS);
    return () => clearTimeout(timer);
  }, [asleep, topView, activityNonce, setAsleep]);

  return (
    <div
      className={`${styles.overlay} ${asleep ? styles.asleep : ''}`}
      data-testid="sleep-overlay"
      data-asleep={asleep || undefined}
      aria-hidden={!asleep}
      onPointerDown={asleep ? () => setAsleep(false) : undefined}
    />
  );
}
