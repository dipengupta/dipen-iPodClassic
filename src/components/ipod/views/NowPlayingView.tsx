'use client';

import { useEffect, useRef } from 'react';
import { useIpodStore, type Frame } from '@/lib/store/ipodStore';
import styles from './NowPlayingView.module.css';

declare global {
  interface Window {
    SC?: {
      Widget: ((iframe: HTMLIFrameElement) => ScWidget) & { Events: { READY: string } };
    };
  }
}

interface ScWidget {
  bind: (event: string, cb: () => void) => void;
  toggle: () => void;
}

const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js';

function loadWidgetApi(): Promise<void> {
  if (window.SC?.Widget) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${WIDGET_API_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = WIDGET_API_SRC;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** SoundCloud playlist player inside the screen; space/center toggles play. */
export default function NowPlayingView({ frame }: { frame: Frame }) {
  const playPauseNonce = useIpodStore((s) => s.playPauseNonce);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<ScWidget | null>(null);
  const readyRef = useRef(false);
  const pendingToggles = useRef(0);
  const mounted = useRef(false);

  const trackUrl = frame.payload?.trackUrl ?? 'https://soundcloud.com/dipen-gupta/tracks';
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=%231f64d2&inverse=false&show_user=true&buying=false&sharing=false`;

  useEffect(() => {
    let cancelled = false;
    loadWidgetApi()
      .then(() => {
        if (cancelled || !iframeRef.current || !window.SC) return;
        const widget = window.SC.Widget(iframeRef.current);
        // Commands sent before READY are dropped by the widget; queue them.
        widget.bind(window.SC.Widget.Events.READY, () => {
          readyRef.current = true;
          widgetRef.current = widget;
          while (pendingToggles.current > 0) {
            pendingToggles.current--;
            widget.toggle();
          }
        });
      })
      .catch(() => {
        // Widget API blocked/offline: the bare iframe still renders its own UI.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (readyRef.current && widgetRef.current) {
      widgetRef.current.toggle();
    } else {
      pendingToggles.current++;
    }
  }, [playPauseNonce]);

  return (
    <div className={styles.stage}>
      <iframe
        ref={iframeRef}
        className={styles.widget}
        data-testid="soundcloud-player"
        src={src}
        title="SoundCloud — The Side Project"
        allow="autoplay"
      />
    </div>
  );
}
