/**
 * The iPod wheel clicker: a ~4ms synthesized tick (no audio asset needed)
 * plus a tiny vibration where the platform supports it (Android Chrome;
 * iOS Safari has no vibration API, so the sound is the feedback there).
 */

let ctx: AudioContext | null = null;
let muted = false;
/** Multiplies every vibration duration; 0 disables haptics. Set from Settings. */
let hapticScale = 1;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/**
 * Browsers create AudioContexts suspended until a user gesture; call this
 * from the first pointer/key handler so later ticks are audible (esp. iOS).
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') {
    void c.resume();
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function setHapticScale(value: number): void {
  hapticScale = value;
}

export function tick(): void {
  vibrate(5);
  if (muted) return;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t = c.currentTime;
  // Short high blip with a fast decay reads as a mechanical click.
  osc.type = 'square';
  osc.frequency.setValueAtTime(1800, t);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.015);
}

export function vibrate(ms: number): void {
  if (hapticScale <= 0) return;
  // Clamp non-zero results up to a small floor so the lightest setting is
  // still felt on a phone (a 2–3ms buzz reads as nothing on a Pixel).
  const scaled = Math.max(4, Math.round(ms * hapticScale));
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(scaled);
    } catch {
      // Some browsers throw on vibrate without user activation; feedback is best-effort.
    }
  }
}
