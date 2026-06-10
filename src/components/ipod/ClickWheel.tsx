'use client';

import { useRef } from 'react';
import { tick, unlockAudio } from '@/lib/audio/clicker';
import {
  accumulate,
  angleAt,
  angleDelta,
  createAccumulator,
  zoneAt,
  type WheelAccumulator,
  type WheelZone,
} from '@/lib/input/wheel';
import type { IpodInput } from '@/lib/input/keyboard';
import { useIpodStore } from '@/lib/store/ipodStore';
import styles from './ClickWheel.module.css';

const TAP_THRESHOLD_PX = 8;

const ZONE_INPUT: Record<WheelZone, IpodInput> = {
  menu: { type: 'menu' },
  prev: { type: 'prev' },
  next: { type: 'next' },
  playPause: { type: 'playPause' },
  center: { type: 'select' },
};

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  lastAngle: number;
  acc: WheelAccumulator;
  scrubbing: boolean;
}

export default function ClickWheel() {
  const handleInput = useIpodStore((s) => s.handleInput);
  const wheelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const geometry = () => {
    const rect = wheelRef.current!.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      wheelRadius: rect.width / 2,
      centerRadius: rect.width * 0.18,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    unlockAudio();
    const { cx, cy } = geometry();
    wheelRef.current!.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastAngle: angleAt(cx, cy, e.clientX, e.clientY),
      acc: createAccumulator(),
      scrubbing: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    if (!state.scrubbing) {
      const moved = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
      if (moved < TAP_THRESHOLD_PX) return;
      // Scrubs that start on the center button are not wheel turns.
      const { cx, cy, centerRadius } = geometry();
      if (Math.hypot(state.startX - cx, state.startY - cy) <= centerRadius) return;
      state.scrubbing = true;
    }
    const { cx, cy } = geometry();
    const angle = angleAt(cx, cy, e.clientX, e.clientY);
    const delta = angleDelta(state.lastAngle, angle);
    state.lastAngle = angle;
    const { state: acc, ticks } = accumulate(state.acc, delta);
    state.acc = acc;
    const dir = ticks > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(ticks); i++) {
      handleInput({ type: 'scroll', dir });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    drag.current = null;
    if (state.scrubbing) return;
    const { cx, cy, wheelRadius, centerRadius } = geometry();
    const zone = zoneAt(cx, cy, e.clientX, e.clientY, wheelRadius, centerRadius);
    if (zone) {
      tick();
      handleInput(ZONE_INPUT[zone]);
    }
  };

  return (
    <div
      ref={wheelRef}
      className={styles.wheel}
      data-testid="click-wheel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <span className={`${styles.label} ${styles.menu}`}>MENU</span>
      <span className={`${styles.label} ${styles.prev}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 6h2v12H7z" />
          <path d="M20 6v12l-9-6z" />
        </svg>
      </span>
      <span className={`${styles.label} ${styles.next}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15 6h2v12h-2z" />
          <path d="M4 6v12l9-6z" />
        </svg>
      </span>
      <span className={`${styles.label} ${styles.playPause}`}>
        <svg viewBox="0 0 28 24" fill="currentColor" aria-hidden="true">
          <path d="M4 5l9 7-9 7z" />
          <path d="M17 5h3v14h-3zM22 5h3v14h-3z" />
        </svg>
      </span>
      <button
        className={styles.center}
        data-testid="center-button"
        aria-label="Select"
        tabIndex={-1}
      />
    </div>
  );
}
