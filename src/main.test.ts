import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeLayout } from './viz/heatmap';

const { drawHeatmapMock } = vi.hoisted(() => ({ drawHeatmapMock: vi.fn() }));

vi.mock('./viz/heatmap', async () => {
  const actual = await vi.importActual<typeof import('./viz/heatmap')>('./viz/heatmap');
  return { ...actual, drawHeatmap: drawHeatmapMock };
});

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
});
