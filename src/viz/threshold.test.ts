import { describe, expect, it } from 'vitest';
import { hasGradientSignFlip } from './threshold';
import type { Value } from '../autodiff/value';

function fakeNeuron(grad: number): Value {
  return { grad } as Value;
}

describe('hasGradientSignFlip', () => {
  it('returns false when no neuron changes sign', () => {
    const prev = [{ neurons: [fakeNeuron(0.5), fakeNeuron(-0.3)] }];
    const next = [{ neurons: [fakeNeuron(0.2), fakeNeuron(-0.9)] }];

    expect(hasGradientSignFlip(prev, next)).toBe(false);
  });

  it('returns true when a neuron flips from positive to negative', () => {
    const prev = [{ neurons: [fakeNeuron(0.5)] }];
    const next = [{ neurons: [fakeNeuron(-0.1)] }];

    expect(hasGradientSignFlip(prev, next)).toBe(true);
  });

  it('returns true when a neuron flips from negative to positive', () => {
    const prev = [{ neurons: [fakeNeuron(-0.5)] }];
    const next = [{ neurons: [fakeNeuron(0.1)] }];

    expect(hasGradientSignFlip(prev, next)).toBe(true);
  });

  it('does not count landing on exactly zero as a flip', () => {
    const prev = [{ neurons: [fakeNeuron(0.5)] }];
    const next = [{ neurons: [fakeNeuron(0)] }];

    expect(hasGradientSignFlip(prev, next)).toBe(false);
  });

  it('returns false when there is no prior frame (first render)', () => {
    const next = [{ neurons: [fakeNeuron(0.5)] }];

    expect(hasGradientSignFlip([], next)).toBe(false);
  });

  it('checks every layer, not just the first', () => {
    const prev = [{ neurons: [fakeNeuron(0.1)] }, { neurons: [fakeNeuron(0.2)] }];
    const next = [{ neurons: [fakeNeuron(0.1)] }, { neurons: [fakeNeuron(-0.2)] }];

    expect(hasGradientSignFlip(prev, next)).toBe(true);
  });
});
