import './style.css';
import { MLP } from './nn/network';
import { drawHeatmap, type HeatmapLayer } from './viz/heatmap';
import { buildHybridLayers, scheduleRipple, type RippleHandle } from './viz/ripple';
import { createSliderPanel } from './viz/controls';

const NUM_INPUTS = 3;
const LAYER_SIZES = [5, 4, 1];

function seededRand(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const network = new MLP(NUM_INPUTS, LAYER_SIZES, seededRand(42));
let inputValues = [0.5, -0.2, 0.1];

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app root element not found');

app.innerHTML = `
  <header class="topbar">
    <span class="wordmark"><span class="wordmark__glyph">&part;</span> Jacobian Playground</span>
  </header>
  <div class="layout">
    <section class="stage"><canvas></canvas></section>
    <aside class="controls"></aside>
  </div>
`;

const canvasEl = app.querySelector<HTMLCanvasElement>('canvas');
const controlsEl = app.querySelector<HTMLElement>('.controls');
if (!canvasEl || !controlsEl) throw new Error('expected stage canvas and controls panel');
const canvas: HTMLCanvasElement = canvasEl;

let prevLayers: HeatmapLayer[] = [];
let pendingRipple: RippleHandle | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function recomputeAndDraw(): void {
  // Weights persist across calls, so their accumulated .grad from the
  // previous pass must be cleared before the next backward().
  network.parameters().forEach((p) => {
    p.grad = 0;
  });

  const trace = network.forward(inputValues);
  // Backprop from the (sole) output neuron so every upstream neuron's
  // .grad becomes d(output)/d(that neuron) — the Jacobian row this
  // network visualizes.
  trace.outputs[0].backward();

  const nextLayers: HeatmapLayer[] = trace.layerActivations.map((neurons) => ({ neurons }));

  // A drag can outrun a previous ripple; drop its pending frames so the
  // heatmap always converges on the latest input rather than showing a
  // stale in-between frame.
  pendingRipple?.cancel();
  pendingRipple = scheduleRipple(
    nextLayers.length,
    (revealedThrough) => {
      drawHeatmap(canvas, buildHybridLayers(prevLayers, nextLayers, revealedThrough));
    },
    { reducedMotion: prefersReducedMotion() },
  );
  prevLayers = nextLayers;
}

const sliderPanel = createSliderPanel(
  inputValues.map((value, i) => ({
    label: `x${i}`,
    min: -1,
    max: 1,
    step: 0.01,
    value,
  })),
);
sliderPanel.onChange((index, value) => {
  inputValues = inputValues.map((v, i) => (i === index ? value : v));
  recomputeAndDraw();
});
controlsEl.appendChild(sliderPanel.element);

window.addEventListener('resize', recomputeAndDraw);

recomputeAndDraw();
