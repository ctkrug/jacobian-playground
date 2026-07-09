import { describe, expect, it } from 'vitest';
import { MLP } from './network';

// Deterministic pseudo-random sequence so tests aren't flaky.
function seededRand(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe('MLP', () => {
  it('produces one output Value per neuron in the final layer', () => {
    const net = new MLP(3, [4, 2], seededRand(1));
    const trace = net.forward([0.5, -0.2, 0.1]);
    expect(trace.outputs).toHaveLength(2);
    expect(trace.layerActivations).toHaveLength(2);
    expect(trace.layerActivations[0]).toHaveLength(4);
  });

  it('uses tanh for hidden layers and linear for the final output layer', () => {
    const net = new MLP(3, [4, 2, 5], seededRand(1));

    expect(net.layers[0].neurons.every((n) => n.activation === 'tanh')).toBe(true);
    expect(net.layers[1].neurons.every((n) => n.activation === 'tanh')).toBe(true);
    expect(net.layers[2].neurons.every((n) => n.activation === 'linear')).toBe(true);
  });

  it('throws when given the wrong number of inputs', () => {
    const net = new MLP(3, [4, 2], seededRand(1));
    expect(() => net.forward([0.1, 0.2])).toThrow();
  });

  it('backward() from one output sets nonzero gradient on upstream inputs and hidden neurons', () => {
    const net = new MLP(3, [4, 2], seededRand(2));
    const trace = net.forward([0.5, -0.2, 0.1]);
    trace.outputs[0].backward();

    for (const input of trace.inputs) {
      expect(input.grad).not.toBe(0);
    }
    for (const neuron of trace.layerActivations[0]) {
      expect(neuron.grad).not.toBe(0);
    }
  });

  it('gives different inputs different gradient signatures on the same output', () => {
    const net = new MLP(2, [3, 1], seededRand(3));
    const trace = net.forward([1, 0.2]);
    trace.outputs[0].backward();

    const grads = trace.inputs.map((v) => v.grad);
    // With random weights it would be a near-zero-probability coincidence
    // for two independent input gradients to match exactly.
    expect(grads[0]).not.toBeCloseTo(grads[1], 10);
  });

  it('randomize() draws new weights that differ from the originals', () => {
    const net = new MLP(3, [4, 2], seededRand(1));
    const before = net.parameters().map((p) => p.data);

    net.randomize(seededRand(999));
    const after = net.parameters().map((p) => p.data);

    expect(after).not.toEqual(before);
  });

  it('randomize() with the construction seed reproduces the original weights (reset)', () => {
    const netA = new MLP(3, [4, 2], seededRand(7));
    const original = netA.parameters().map((p) => p.data);

    netA.randomize(seededRand(123)); // scramble first
    netA.randomize(seededRand(7)); // "reset" by replaying the original seed
    const restored = netA.parameters().map((p) => p.data);

    expect(restored).toEqual(original);
  });

  it('randomize() zeroes every parameter gradient', () => {
    const net = new MLP(2, [3, 1], seededRand(2));
    const trace = net.forward([0.3, -0.4]);
    trace.outputs[0].backward();
    expect(net.parameters().some((p) => p.grad !== 0)).toBe(true);

    net.randomize(seededRand(5));
    expect(net.parameters().every((p) => p.grad === 0)).toBe(true);
  });
});
