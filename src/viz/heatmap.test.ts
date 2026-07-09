import { describe, expect, it, vi } from 'vitest';
import { computeLayout, drawHeatmap, fitCanvasToContainer, gradientToColor } from './heatmap';
import type { Value } from '../autodiff/value';

function fakeNeuron(grad: number): Value {
  return { grad } as Value;
}

/** Records every call made against a minimal stand-in for CanvasRenderingContext2D. */
function fakeContext(): { ctx: CanvasRenderingContext2D; calls: string[] } {
  const calls: string[] = [];
  const ctx = {
    setTransform: (...args: unknown[]) => calls.push(`setTransform(${args.join(',')})`),
    clearRect: (...args: unknown[]) => calls.push(`clearRect(${args.join(',')})`),
    beginPath: () => calls.push('beginPath'),
    moveTo: (...args: unknown[]) => calls.push(`moveTo(${args.join(',')})`),
    lineTo: (...args: unknown[]) => calls.push(`lineTo(${args.join(',')})`),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    arc: (...args: unknown[]) => calls.push(`arc(${args.join(',')})`),
    set strokeStyle(v: string) {
      calls.push(`strokeStyle=${v}`);
    },
    set lineWidth(v: number) {
      calls.push(`lineWidth=${v}`);
    },
    set fillStyle(v: string) {
      calls.push(`fillStyle=${v}`);
    },
    set shadowColor(v: string) {
      calls.push(`shadowColor=${v}`);
    },
    set shadowBlur(v: number) {
      calls.push(`shadowBlur=${v}`);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function stubCanvas(width: number, height: number): { canvas: HTMLCanvasElement; calls: string[] } {
  const canvas = document.createElement('canvas');
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
  const { ctx, calls } = fakeContext();
  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);
  return { canvas, calls };
}

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

describe('fitCanvasToContainer', () => {
  it('sizes the backing store to devicePixelRatio and applies the matching transform', () => {
    const { canvas, calls } = stubCanvas(200, 100);
    vi.stubGlobal('devicePixelRatio', 2);

    fitCanvasToContainer(canvas);

    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(200);
    expect(calls).toContain('setTransform(2,0,0,2,0,0)');

    vi.unstubAllGlobals();
  });

  it('throws when the 2d context is unavailable', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);

    expect(() => fitCanvasToContainer(canvas)).toThrow('2d canvas context unavailable');
  });

  it('does not reassign the backing store when it already matches (avoids an implicit clear)', () => {
    const { canvas } = stubCanvas(200, 100);
    vi.stubGlobal('devicePixelRatio', 1);

    fitCanvasToContainer(canvas);
    const widthSetter = vi.spyOn(canvas, 'width', 'set');
    const heightSetter = vi.spyOn(canvas, 'height', 'set');

    fitCanvasToContainer(canvas);

    expect(widthSetter).not.toHaveBeenCalled();
    expect(heightSetter).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe('drawHeatmap', () => {
  it('clears and draws the grid even with no layers', () => {
    const { canvas, calls } = stubCanvas(320, 160);

    drawHeatmap(canvas, []);

    expect(calls).toContain('clearRect(0,0,320,160)');
    expect(calls.some((c) => c.startsWith('moveTo'))).toBe(true);
  });

  it('draws one arc per neuron across all layers', () => {
    const { canvas, calls } = stubCanvas(320, 160);
    const layers = [{ neurons: [fakeNeuron(0.5)] }, { neurons: [fakeNeuron(-0.5), fakeNeuron(0)] }];

    drawHeatmap(canvas, layers);

    const arcCalls = calls.filter((c) => c.startsWith('arc'));
    expect(arcCalls).toHaveLength(3);
  });

  it('draws a larger, glowing arc for the hovered neuron', () => {
    const { canvas, calls } = stubCanvas(320, 160);
    const layers = [{ neurons: [fakeNeuron(0.2)] }];

    drawHeatmap(canvas, layers, { hoveredNode: { layerIndex: 0, neuronIndex: 0 } });

    expect(calls).toContain('shadowBlur=20');
    expect(calls.some((c) => c.startsWith('arc') && c.includes('18.2'))).toBe(true); // nodeRadius(14) * 1.3
  });

  it('skips the shadow glow for near-zero gradients', () => {
    const { canvas, calls } = stubCanvas(320, 160);
    const layers = [{ neurons: [fakeNeuron(0)] }];

    drawHeatmap(canvas, layers);

    expect(calls).toContain('shadowBlur=0');
    expect(calls).not.toContain('shadowBlur=20');
  });
});
