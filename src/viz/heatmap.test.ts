import { describe, expect, it } from 'vitest';
import { gradientToColor } from './heatmap';

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
