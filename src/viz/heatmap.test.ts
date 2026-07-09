import { describe, expect, it } from 'vitest';
import { computeLayout, gradientToColor } from './heatmap';

describe('gradientToColor', () => {
  it('returns the neutral surface color when there is no gradient signal', () => {
    expect(gradientToColor(0, 0)).toBe('rgb(22, 34, 60)');
  });

  it('leans toward the hot accent for strong positive gradients', () => {
    const color = gradientToColor(1, 1);
    expect(color).toBe('rgb(255, 180, 84)');
  });

  it('leans toward the cold accent for strong negative gradients', () => {
    const color = gradientToColor(-1, 1);
    expect(color).toBe('rgb(91, 141, 238)');
  });

  it('clamps out-of-range magnitudes to the same color as the extreme', () => {
    expect(gradientToColor(5, 1)).toBe(gradientToColor(1, 1));
    expect(gradientToColor(-5, 1)).toBe(gradientToColor(-1, 1));
  });
});

describe('computeLayout', () => {
  it('spaces layers evenly across the width, left to right', () => {
    const positions = computeLayout(400, 200, [2, 2]);
    expect(positions).toHaveLength(2);
    expect(positions[0][0].x).toBeCloseTo(400 / 3);
    expect(positions[1][0].x).toBeCloseTo((400 / 3) * 2);
  });

  it('spaces neurons within a layer evenly down the height', () => {
    const positions = computeLayout(400, 300, [3]);
    expect(positions[0]).toHaveLength(3);
    expect(positions[0][0].y).toBeCloseTo(300 / 4);
    expect(positions[0][1].y).toBeCloseTo((300 / 4) * 2);
    expect(positions[0][2].y).toBeCloseTo((300 / 4) * 3);
  });

  it('returns an empty layout for zero layers', () => {
    expect(computeLayout(400, 300, [])).toEqual([]);
  });

  it('handles a layer with a single neuron without dividing by zero', () => {
    const positions = computeLayout(400, 300, [1]);
    expect(positions[0]).toHaveLength(1);
    expect(Number.isFinite(positions[0][0].y)).toBe(true);
  });
});
