import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { drawHeatmapMock } = vi.hoisted(() => ({ drawHeatmapMock: vi.fn() }));

vi.mock('./viz/heatmap', async () => {
  const actual = await vi.importActual<typeof import('./viz/heatmap')>('./viz/heatmap');
  return { ...actual, drawHeatmap: drawHeatmapMock };
});

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
});
