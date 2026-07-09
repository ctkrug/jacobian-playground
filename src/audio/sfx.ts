const MUTE_STORAGE_KEY = 'jacobian-playground:muted';

const memoryFallback = new Map<string, string>();

/**
 * Resolves the real localStorage, falling back to an in-memory Map when the property
 * itself is inaccessible (e.g. a sandboxed iframe or a browser blocking storage) rather
 * than letting that SecurityError take down the whole module at construction time.
 */
function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem: (key) => memoryFallback.get(key) ?? null,
      setItem: (key, value) => {
        memoryFallback.set(key, value);
      },
    };
  }
}

export function isMuted(storage: Pick<Storage, 'getItem'> = defaultStorage()): boolean {
  try {
    return storage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean, storage: Pick<Storage, 'setItem'> = defaultStorage()): void {
  try {
    storage.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch {
    // best-effort persistence only; a blocked/full store shouldn't break muting
  }
}

/** True once at least `minIntervalMs` has passed since the last play, so rapid dragging can't machine-gun a sound. */
export function shouldPlay(lastPlayedAt: number, now: number, minIntervalMs: number): boolean {
  return now - lastPlayedAt >= minIntervalMs;
}

export type SfxName = 'tick' | 'pop' | 'chime';

interface Note {
  frequency: number;
  duration: number;
  type: OscillatorType;
}

const SFX: Record<SfxName, Note[]> = {
  tick: [{ frequency: 880, duration: 0.03, type: 'sine' }],
  pop: [{ frequency: 660, duration: 0.06, type: 'triangle' }],
  chime: [
    { frequency: 523.25, duration: 0.12, type: 'sine' },
    { frequency: 659.25, duration: 0.16, type: 'sine' },
  ],
};

const TICK_THROTTLE_MS = 40;
const VOLUME = 0.05;

export interface MinimalOscillator {
  type: OscillatorType;
  frequency: { value: number };
  connect(destination: unknown): void;
  start(time: number): void;
  stop(time: number): void;
}

export interface MinimalGain {
  gain: { value: number };
  connect(destination: unknown): void;
}

export interface MinimalAudioContext {
  currentTime: number;
  destination: unknown;
  createOscillator(): MinimalOscillator;
  createGain(): MinimalGain;
}

export interface SfxEngineOptions {
  now?: () => number;
  /** Returns a fresh audio context, or null in environments without WebAudio (tests, old browsers). */
  createContext?: () => MinimalAudioContext | null;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

function defaultCreateContext(): MinimalAudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** Synthesized WebAudio SFX (no audio files) with a persisted mute toggle and lazy context creation. */
export class SfxEngine {
  private readonly now: () => number;
  private readonly createContext: () => MinimalAudioContext | null;
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>;
  private ctx: MinimalAudioContext | null = null;
  private lastTickAt = -Infinity;
  muted: boolean;

  constructor(options: SfxEngineOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.createContext = options.createContext ?? defaultCreateContext;
    this.storage = options.storage ?? defaultStorage();
    this.muted = isMuted(this.storage);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    setMuted(this.muted, this.storage);
    return this.muted;
  }

  /** Plays a synthesized SFX; a no-op when muted, throttled (tick only), or WebAudio is unavailable. */
  play(name: SfxName): void {
    if (this.muted) return;

    if (name === 'tick') {
      const now = this.now();
      if (!shouldPlay(this.lastTickAt, now, TICK_THROTTLE_MS)) return;
      this.lastTickAt = now;
    }

    if (!this.ctx) this.ctx = this.createContext();
    const ctx = this.ctx;
    if (!ctx) return;

    let startTime = ctx.currentTime;
    for (const note of SFX[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type;
      osc.frequency.value = note.frequency;
      gain.gain.value = VOLUME;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + note.duration);
      startTime += note.duration;
    }
  }
}
