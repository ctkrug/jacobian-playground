import { describe, expect, it } from 'vitest';
import { createEdgeTooltip, formatEdgeText } from './tooltip';
import type { EdgeInfo } from './edges';

function edge(weight: number, upstreamGrad: number): EdgeInfo {
  return { from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, weight, upstreamGrad, jacobianEntry: weight * upstreamGrad };
}

describe('formatEdgeText', () => {
  it('includes the weight, gradient, and their product to three decimal places', () => {
    const text = formatEdgeText(edge(0.5, -0.25));
    expect(text).toContain('0.500');
    expect(text).toContain('-0.250');
    expect(text).toContain((-0.125).toFixed(3));
  });
});

describe('createEdgeTooltip', () => {
  it('starts hidden', () => {
    const tooltip = createEdgeTooltip();
    expect(tooltip.element.hidden).toBe(true);
  });

  it('show() reveals the tooltip, positions it, and renders the edge text', () => {
    const tooltip = createEdgeTooltip();
    tooltip.show(edge(1, 2), 120, 80);

    expect(tooltip.element.hidden).toBe(false);
    expect(tooltip.element.style.left).toBe('120px');
    expect(tooltip.element.style.top).toBe('80px');
    expect(tooltip.element.textContent).toBe(formatEdgeText(edge(1, 2)));
  });

  it('hide() re-hides the tooltip', () => {
    const tooltip = createEdgeTooltip();
    tooltip.show(edge(1, 2), 0, 0);
    tooltip.hide();

    expect(tooltip.element.hidden).toBe(true);
  });
});
