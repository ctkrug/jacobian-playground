import { describe, expect, it, vi } from 'vitest';
import { isMuted, SfxEngine, setMuted, shouldPlay } from './sfx';
import type { MinimalAudioContext, MinimalGain, MinimalOscillator } from './sfx';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

function fakeContext(): { ctx: MinimalAudioContext; oscillatorsCreated: number } {
  let oscillatorsCreated = 0;
  const oscillator: MinimalOscillator = {
    type: 'sine',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain: MinimalGain = { gain: { value: 0 }, connect: vi.fn() };
  const ctx: MinimalAudioContext = {
    currentTime: 0,
    destination: {},
    createOscillator: () => {
      oscillatorsCreated += 1;
      return { ...oscillator };
    },
    createGain: () => ({ ...gain }),
  };
  return {
    ctx,
    get oscillatorsCreated() {
      return oscillatorsCreated;
    },
  } as { ctx: MinimalAudioContext; oscillatorsCreated: number };
}

describe('isMuted / setMuted', () => {
  it('defaults to unmuted when nothing has been stored', () => {
    expect(isMuted(fakeStorage())).toBe(false);
  });

  it('persists and reads back the muted flag', () => {
    const storage = fakeStorage();
    setMuted(true, storage);
    expect(isMuted(storage)).toBe(true);

    setMuted(false, storage);
    expect(isMuted(storage)).toBe(false);
  });

  it('treats a storage that throws on read as unmuted rather than crashing', () => {
    const throwing: Pick<Storage, 'getItem'> = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(isMuted(throwing)).toBe(false);
  });

  it('swallows a storage that throws on write instead of propagating', () => {
    const throwing: Pick<Storage, 'setItem'> = {
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(() => setMuted(true, throwing)).not.toThrow();
  });
});

describe('shouldPlay', () => {
  it('allows playing once the minimum interval has elapsed', () => {
    expect(shouldPlay(0, 40, 40)).toBe(true);
    expect(shouldPlay(0, 100, 40)).toBe(true);
  });

  it('throttles plays inside the minimum interval', () => {
    expect(shouldPlay(0, 39, 40)).toBe(false);
    expect(shouldPlay(0, 0, 40)).toBe(false);
  });
});

describe('SfxEngine', () => {
  it('does not create an audio context when muted', () => {
    const storage = fakeStorage();
    const createContext = vi.fn(() => fakeContext().ctx);
    const engine = new SfxEngine({ storage, createContext });
    engine.muted = true;

    engine.play('pop');

    expect(createContext).not.toHaveBeenCalled();
  });

  it('plays a non-tick sound immediately when unmuted', () => {
    const { ctx } = fakeContext();
    const createOscillator = vi.spyOn(ctx, 'createOscillator');
    const engine = new SfxEngine({ storage: fakeStorage(), createContext: () => ctx });

    engine.play('pop');

    expect(createOscillator).toHaveBeenCalledTimes(1);
  });

  it('plays both notes of the chime', () => {
    const { ctx } = fakeContext();
    const createOscillator = vi.spyOn(ctx, 'createOscillator');
    const engine = new SfxEngine({ storage: fakeStorage(), createContext: () => ctx });

    engine.play('chime');

    expect(createOscillator).toHaveBeenCalledTimes(2);
  });

  it('throttles rapid tick calls but allows a tick after the interval', () => {
    const { ctx } = fakeContext();
    const createOscillator = vi.spyOn(ctx, 'createOscillator');
    let now = 0;
    const engine = new SfxEngine({ storage: fakeStorage(), createContext: () => ctx, now: () => now });

    engine.play('tick');
    now = 10;
    engine.play('tick'); // inside the 40ms throttle window
    now = 41;
    engine.play('tick'); // past the throttle window

    expect(createOscillator).toHaveBeenCalledTimes(2);
  });

  it('does not throw when WebAudio is unavailable', () => {
    const engine = new SfxEngine({ storage: fakeStorage(), createContext: () => null });
    expect(() => engine.play('pop')).not.toThrow();
  });

  it('toggleMute flips and persists the muted flag', () => {
    const storage = fakeStorage();
    const engine = new SfxEngine({ storage, createContext: () => null });
    expect(engine.muted).toBe(false);

    const nowMuted = engine.toggleMute();

    expect(nowMuted).toBe(true);
    expect(engine.muted).toBe(true);
    expect(isMuted(storage)).toBe(true);
  });

  it('does not throw when window.localStorage itself is inaccessible (e.g. blocked storage)', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    try {
      expect(() => new SfxEngine()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('still persists mute state through an in-memory fallback when localStorage is blocked', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });

    try {
      const engine = new SfxEngine();
      expect(engine.muted).toBe(false);

      const nowMuted = engine.toggleMute();
      expect(nowMuted).toBe(true);

      // A second engine instance reads the same fallback store, so the
      // muted flag survives even though real localStorage is unreachable.
      const engineTwo = new SfxEngine();
      expect(engineTwo.muted).toBe(true);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('constructs a real AudioContext via the default factory when the browser provides one', () => {
    const created: unknown[] = [];
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      constructor() {
        created.push(this);
      }
      createOscillator(): MinimalOscillator {
        return { type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      }
      createGain(): MinimalGain {
        return { gain: { value: 0 }, connect: vi.fn() };
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const engine = new SfxEngine({ storage: fakeStorage() });
    engine.play('pop');

    expect(created).toHaveLength(1);

    vi.unstubAllGlobals();
  });
});
