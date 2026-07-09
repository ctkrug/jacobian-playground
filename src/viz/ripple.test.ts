import { describe, expect, it, vi } from 'vitest';
import { buildHybridLayers, computeLayerDelays, scheduleRipple } from './ripple';
import type { Value } from '../autodiff/value';

function fakeNeuron(grad: number): Value {
  return { grad } as Value;
}

describe('computeLayerDelays', () => {
  it('returns a single zero delay for zero or one layer', () => {
    expect(computeLayerDelays(0, 50, 300)).toEqual([]);
    expect(computeLayerDelays(1, 50, 300)).toEqual([0]);
  });

  it('staggers each layer by staggerMs when well under the total cap', () => {
    expect(computeLayerDelays(3, 50, 300)).toEqual([0, 50, 100]);
  });

  it('compresses the stagger so the last layer never exceeds maxTotalMs', () => {
    const delays = computeLayerDelays(10, 50, 300);
    expect(delays[delays.length - 1]).toBeLessThanOrEqual(300);
    expect(delays[0]).toBe(0);
  });
});

describe('scheduleRipple', () => {
  it('schedules one render call per layer with increasing delays', () => {
    const calls: Array<[() => void, number]> = [];
    const schedule = vi.fn((fn: () => void, delay: number) => {
      calls.push([fn, delay]);
    });
    const render = vi.fn();

    scheduleRipple(3, render, { staggerMs: 50, maxTotalMs: 300, schedule });

    expect(calls.map((c) => c[1])).toEqual([0, 50, 100]);
    calls.forEach(([fn], i) => {
      fn();
      expect(render).toHaveBeenNthCalledWith(i + 1, i);
    });
  });

  it('renders instantly with no stagger under reduced motion', () => {
    const schedule = vi.fn();
    const render = vi.fn();

    scheduleRipple(4, render, { reducedMotion: true, schedule });

    expect(schedule).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(3);
  });

  it('renders instantly for a single layer regardless of reducedMotion', () => {
    const schedule = vi.fn();
    const render = vi.fn();

    scheduleRipple(1, render, { schedule });

    expect(schedule).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(0);
  });

  it('cancel() invokes every scheduled step cancel function', () => {
    const cancelFns = [vi.fn(), vi.fn(), vi.fn()];
    let i = 0;
    const schedule = vi.fn(() => cancelFns[i++]);

    const handle = scheduleRipple(3, vi.fn(), { schedule });
    handle.cancel();

    cancelFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce());
  });
});

describe('buildHybridLayers', () => {
  it('shows next values for revealed layers and prev values for unrevealed ones', () => {
    const prev = [{ neurons: [fakeNeuron(-1)] }, { neurons: [fakeNeuron(-2)] }];
    const next = [{ neurons: [fakeNeuron(1)] }, { neurons: [fakeNeuron(2)] }];

    const hybrid = buildHybridLayers(prev, next, 0);

    expect(hybrid[0]).toBe(next[0]);
    expect(hybrid[1]).toBe(prev[1]);
  });

  it('shows next values everywhere once revealedThrough covers the last layer', () => {
    const prev = [{ neurons: [fakeNeuron(-1)] }, { neurons: [fakeNeuron(-2)] }];
    const next = [{ neurons: [fakeNeuron(1)] }, { neurons: [fakeNeuron(2)] }];

    const hybrid = buildHybridLayers(prev, next, 1);

    expect(hybrid).toEqual(next);
  });

  it('falls back to next values when there is no prior frame (e.g. first render)', () => {
    const next = [{ neurons: [fakeNeuron(1)] }, { neurons: [fakeNeuron(2)] }];

    const hybrid = buildHybridLayers([], next, 0);

    expect(hybrid).toEqual(next);
  });
});
