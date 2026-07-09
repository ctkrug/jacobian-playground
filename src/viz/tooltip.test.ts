import { describe, expect, it } from 'vitest';
import { createEdgeTooltip, formatEdgeText, formatNodeText } from './tooltip';
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

  it('showText() reveals arbitrary text (e.g. a hovered neuron gradient)', () => {
    const tooltip = createEdgeTooltip();
    tooltip.showText(formatNodeText(-0.42), 10, 20);

    expect(tooltip.element.hidden).toBe(false);
    expect(tooltip.element.textContent).toBe(formatNodeText(-0.42));
    expect(tooltip.element.style.left).toBe('10px');
    expect(tooltip.element.style.top).toBe('20px');
  });
});

describe('formatNodeText', () => {
  it('renders the gradient to three decimal places', () => {
    expect(formatNodeText(0.4)).toBe('∂ 0.400');
    expect(formatNodeText(-1.5)).toBe('∂ -1.500');
  });
});
