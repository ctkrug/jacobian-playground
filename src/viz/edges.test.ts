import { describe, expect, it } from 'vitest';
import { findNearestEdge, type EdgeInfo } from './edges';

function edge(x1: number, y1: number, x2: number, y2: number, jacobianEntry = 0): EdgeInfo {
  return { from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, weight: 1, upstreamGrad: 1, jacobianEntry };
}

describe('findNearestEdge', () => {
  it('finds an edge when the point sits exactly on the segment', () => {
    const horizontal = edge(0, 0, 100, 0);
    expect(findNearestEdge([horizontal], 50, 0)).toBe(horizontal);
  });

  it('finds an edge when the point is near it, within maxDistance', () => {
    const horizontal = edge(0, 0, 100, 0);
    expect(findNearestEdge([horizontal], 50, 5)).toBe(horizontal);
  });

  it('returns null when the point is farther than maxDistance from every edge', () => {
    const horizontal = edge(0, 0, 100, 0);
    expect(findNearestEdge([horizontal], 50, 20)).toBeNull();
  });

  it('returns the closest edge when several are within range', () => {
    const near = edge(0, 0, 100, 0);
    const far = edge(0, 10, 100, 10);
    expect(findNearestEdge([near, far], 50, 3)).toBe(near);
  });

  it('measures distance to the nearest endpoint beyond the segment ends', () => {
    const horizontal = edge(0, 0, 100, 0);
    // (150, 0) is past the segment's end at x=100, so distance is to that endpoint.
    expect(findNearestEdge([horizontal], 150, 0, 60)).toBe(horizontal);
    expect(findNearestEdge([horizontal], 200, 0, 60)).toBeNull();
  });

  it('returns null for an empty edge list', () => {
    expect(findNearestEdge([], 0, 0)).toBeNull();
  });

  it('handles a zero-length edge (identical endpoints) as a point distance', () => {
    const point = edge(10, 10, 10, 10);
    expect(findNearestEdge([point], 10, 10)).toBe(point);
    expect(findNearestEdge([point], 100, 100)).toBeNull();
  });
});
