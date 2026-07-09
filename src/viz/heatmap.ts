import type { Value } from '../autodiff/value';

export interface HeatmapLayer {
  /** Post-activation Value for each neuron in this layer (grad populated after backward()). */
  neurons: Value[];
}

const COLD = { r: 0x5b, g: 0x8d, b: 0xee }; // --accent-cold
const NEUTRAL = { r: 0x16, g: 0x22, b: 0x3c }; // --surface-2
const HOT = { r: 0xff, g: 0xb4, b: 0x54 }; // --accent-heat

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Maps a signed gradient to a diverging cold -> neutral -> hot color, per docs/DESIGN.md. */
export function gradientToColor(grad: number, maxAbsGrad: number): string {
  if (maxAbsGrad <= 0) {
    return `rgb(${NEUTRAL.r}, ${NEUTRAL.g}, ${NEUTRAL.b})`;
  }
  const t = Math.max(-1, Math.min(1, grad / maxAbsGrad));
  const target = t >= 0 ? HOT : COLD;
  const mag = Math.abs(t);
  const r = Math.round(lerp(NEUTRAL.r, target.r, mag));
  const g = Math.round(lerp(NEUTRAL.g, target.g, mag));
  const b = Math.round(lerp(NEUTRAL.b, target.b, mag));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Sizes a canvas's backing store to devicePixelRatio while keeping its CSS size fixed. */
export function fitCanvasToContainer(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const step = 32;
  ctx.strokeStyle = 'rgba(79, 209, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
}

export interface NodePosition {
  x: number;
  y: number;
}

/** Computes each neuron's canvas position for a given viewport size and per-layer neuron counts. */
export function computeLayout(width: number, height: number, layerSizes: number[]): NodePosition[][] {
  const colWidth = width / (layerSizes.length + 1);
  return layerSizes.map((count, li) => {
    const x = colWidth * (li + 1);
    const rowHeight = height / (count + 1);
    return Array.from({ length: count }, (_, ni) => ({ x, y: rowHeight * (ni + 1) }));
  });
}

export interface HoveredNode {
  layerIndex: number;
  neuronIndex: number;
}

/** Draws every layer's neurons as gradient-colored nodes with connecting edges. */
export function drawHeatmap(
  canvas: HTMLCanvasElement,
  layers: HeatmapLayer[],
  options: { nodeRadius?: number; hoveredNode?: HoveredNode | null } = {},
): void {
  const ctx = fitCanvasToContainer(canvas);
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const nodeRadius = options.nodeRadius ?? 14;

  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height);

  if (layers.length === 0) return;

  const maxAbsGrad = Math.max(
    1e-9,
    ...layers.flatMap((layer) => layer.neurons.map((n) => Math.abs(n.grad))),
  );

  const positions = computeLayout(
    width,
    height,
    layers.map((layer) => layer.neurons.length),
  );

  // Edges first, so nodes render on top.
  for (let li = 1; li < positions.length; li += 1) {
    for (const from of positions[li - 1]) {
      for (const to of positions[li]) {
        ctx.strokeStyle = 'rgba(143, 163, 196, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    }
  }

  layers.forEach((layer, li) => {
    layer.neurons.forEach((neuron, ni) => {
      const { x, y } = positions[li][ni];
      const color = gradientToColor(neuron.grad, maxAbsGrad);
      const mag = Math.min(1, Math.abs(neuron.grad) / maxAbsGrad);
      const isHovered = options.hoveredNode?.layerIndex === li && options.hoveredNode?.neuronIndex === ni;

      if (isHovered) {
        ctx.shadowColor = 'rgba(79, 209, 255, 0.85)';
        ctx.shadowBlur = 20;
      } else if (mag > 0.05) {
        ctx.shadowColor = neuron.grad >= 0 ? 'rgba(255, 180, 84, 0.6)' : 'rgba(91, 141, 238, 0.6)';
        ctx.shadowBlur = 12 * mag;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? nodeRadius * 1.3 : nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = isHovered ? 'rgba(79, 209, 255, 0.9)' : 'rgba(232, 237, 247, 0.25)';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();
    });
  });
}
