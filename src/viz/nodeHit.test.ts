import { describe, expect, it } from 'vitest';
import { findNearestNode } from './nodeHit';

describe('findNearestNode', () => {
  it('finds the neuron at an exact position match', () => {
    const positions = [[{ x: 10, y: 10 }], [{ x: 50, y: 50 }]];
    const hit = findNearestNode(positions, 50, 50);
    expect(hit).toEqual({ layerIndex: 1, neuronIndex: 0, position: { x: 50, y: 50 } });
  });

  it('finds a neuron within maxDistance of the point', () => {
    const positions = [[{ x: 10, y: 10 }]];
    expect(findNearestNode(positions, 15, 10, 10)).not.toBeNull();
  });

  it('returns null when nothing is within maxDistance', () => {
    const positions = [[{ x: 10, y: 10 }]];
    expect(findNearestNode(positions, 100, 100, 10)).toBeNull();
  });

  it('returns the closest neuron when several layers are in range', () => {
    const positions = [
      [{ x: 0, y: 0 }],
      [{ x: 5, y: 0 }],
    ];
    const hit = findNearestNode(positions, 4, 0, 20);
    expect(hit?.layerIndex).toBe(1);
  });

  it('returns null for an empty layout', () => {
    expect(findNearestNode([], 0, 0)).toBeNull();
  });
});
