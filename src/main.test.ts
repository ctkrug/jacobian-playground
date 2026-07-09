import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeLayout } from './viz/heatmap';

const { drawHeatmapMock } = vi.hoisted(() => ({ drawHeatmapMock: vi.fn() }));

vi.mock('./viz/heatmap', async () => {
  const actual = await vi.importActual<typeof import('./viz/heatmap')>('./viz/heatmap');
  return { ...actual, drawHeatmap: drawHeatmapMock };
});

/** Nudges a slider so recomputeAndDraw re-reads canvas.getBoundingClientRect() after it's stubbed. */
function forceRecompute(): void {
  const slider = document.querySelector<HTMLInputElement>('input[aria-label="x0"]');
  if (!slider) throw new Error('expected an x0 slider in the mounted controls panel');
  slider.dispatchEvent(new Event('input', { bubbles: true }));
}

function stubCanvasRect(canvas: HTMLCanvasElement, width: number, height: number): void {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  } as DOMRect);
}

describe('recomputeAndDraw ripple wiring', () => {
  beforeEach(() => {
    vi.resetModules();
    drawHeatmapMock.mockClear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a not-yet-revealed layer showing the prior frame instead of jumping straight to the new one', async () => {
    vi.useFakeTimers();

    await import('./main');
    // Drop the initial mount's render calls; there's no real "previous" frame yet to distinguish.
    drawHeatmapMock.mockClear();

    const slider = document.querySelector<HTMLInputElement>('input[aria-label="x0"]');
    if (!slider) throw new Error('expected an x0 slider in the mounted controls panel');
    slider.value = '0.9';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    // The first ripple frame should reveal only layer 0; layer 2 should still show
    // whatever was on screen before this drag, not the freshly computed value.
    vi.advanceTimersByTime(0);
    expect(drawHeatmapMock.mock.calls.length).toBeGreaterThan(0);
    const firstFrameLayers = drawHeatmapMock.mock.calls[0][1];

    vi.runAllTimers();
    const lastFrameLayers = drawHeatmapMock.mock.calls[drawHeatmapMock.mock.calls.length - 1][1];

    expect(firstFrameLayers[2]).not.toBe(lastFrameLayers[2]);
  });

  it('does not let a hover redraw jump ahead of an in-flight ripple frame', async () => {
    vi.useFakeTimers();

    await import('./main');
    drawHeatmapMock.mockClear();

    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);

    const slider = document.querySelector<HTMLInputElement>('input[aria-label="x0"]');
    if (!slider) throw new Error('expected an x0 slider in the mounted controls panel');
    slider.value = '0.9';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    // Only layer 0 is revealed after the first ripple frame.
    vi.advanceTimersByTime(0);
    const midRippleLayers = drawHeatmapMock.mock.calls[drawHeatmapMock.mock.calls.length - 1][1];

    const positions = computeLayout(400, 300, [5, 4, 3]);
    const targetNode = positions[2][0];
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: targetNode.x, clientY: targetNode.y, bubbles: true }),
    );

    const hoverFrameLayers = drawHeatmapMock.mock.calls[drawHeatmapMock.mock.calls.length - 1][1];
    // The still-unrevealed layer should stay whatever the ripple last actually drew,
    // not jump straight to the final new state just because the mouse moved.
    expect(hoverFrameLayers[2]).toBe(midRippleLayers[2]);
  });

  it('does not accumulate pending ripple timers across many rapid drags', async () => {
    vi.useFakeTimers();

    await import('./main');

    const slider = document.querySelector<HTMLInputElement>('input[aria-label="x0"]');
    if (!slider) throw new Error('expected an x0 slider in the mounted controls panel');

    for (let i = 0; i < 50; i += 1) {
      slider.value = String((i % 20) / 10 - 1);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Each recompute cancels its predecessor's pending ripple frames before
    // scheduling its own, so the timer queue should never outgrow one ripple.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(3);

    vi.runAllTimers();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('keyboard access to the neuron tooltip', () => {
  beforeEach(() => {
    vi.resetModules();
    drawHeatmapMock.mockClear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('makes the canvas focusable', async () => {
    await import('./main');
    const canvas = document.querySelector('canvas');
    expect(canvas?.tabIndex).toBe(0);
  });

  it('reveals a neuron gradient tooltip via arrow keys and dismisses it on Escape', async () => {
    await import('./main');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    const tooltip = document.querySelector<HTMLElement>('.edge-tooltip');
    expect(tooltip?.hidden).toBe(false);
    expect(tooltip?.textContent).toMatch(/∂/);

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(tooltip?.hidden).toBe(true);
  });

  it('moves the focus cursor down/up within a layer and clamps left of the first layer', async () => {
    await import('./main');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);
    const tooltip = document.querySelector<HTMLElement>('.edge-tooltip');

    // Already on layer 0; ArrowLeft should clamp rather than go out of bounds.
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    const afterLeft = tooltip?.textContent;

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const afterDown = tooltip?.textContent;
    expect(afterDown).toMatch(/∂/);
    expect(afterDown).not.toBe(afterLeft);

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(tooltip?.textContent).toBe(afterLeft);
  });

  it('ignores unrelated keys and hides the tooltip on blur', async () => {
    await import('./main');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);
    const tooltip = document.querySelector<HTMLElement>('.edge-tooltip');

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(tooltip?.hidden).toBe(true);

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tooltip?.hidden).toBe(false);

    canvas.dispatchEvent(new FocusEvent('blur'));
    expect(tooltip?.hidden).toBe(true);
  });
});

describe('mouse hover interactions', () => {
  beforeEach(() => {
    vi.resetModules();
    drawHeatmapMock.mockClear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('shows the edge tooltip when hovering a connection between two neurons', async () => {
    await import('./main');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);
    forceRecompute();

    const positions = computeLayout(400, 300, [5, 4, 3]);
    const midpoint = {
      x: (positions[0][0].x + positions[1][0].x) / 2,
      y: (positions[0][0].y + positions[1][0].y) / 2,
    };
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: midpoint.x, clientY: midpoint.y, bubbles: true }));

    const tooltip = document.querySelector<HTMLElement>('.edge-tooltip');
    expect(tooltip?.hidden).toBe(false);
    expect(tooltip?.textContent).toMatch(/w .* ∂ .* J /);
  });

  it('clears the hover highlight and tooltip once the cursor leaves every node/edge', async () => {
    await import('./main');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);
    forceRecompute();

    const positions = computeLayout(400, 300, [5, 4, 3]);
    const nodePos = positions[0][0];
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: nodePos.x, clientY: nodePos.y, bubbles: true }));
    const tooltip = document.querySelector<HTMLElement>('.edge-tooltip');
    expect(tooltip?.hidden).toBe(false);

    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 399, clientY: 299, bubbles: true }));
    expect(tooltip?.hidden).toBe(true);
  });

  it('hides the tooltip and clears the hover highlight on mouseleave', async () => {
    await import('./main');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) throw new Error('expected a canvas element');
    stubCanvasRect(canvas, 400, 300);
    forceRecompute();

    const positions = computeLayout(400, 300, [5, 4, 3]);
    const nodePos = positions[0][0];
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: nodePos.x, clientY: nodePos.y, bubbles: true }));
    const tooltip = document.querySelector<HTMLElement>('.edge-tooltip');
    expect(tooltip?.hidden).toBe(false);

    canvas.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(tooltip?.hidden).toBe(true);
  });
});
