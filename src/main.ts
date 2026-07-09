import './style.css';
import { MLP } from './nn/network';
import type { Value } from './autodiff/value';
import { computeLayout, drawHeatmap, type HeatmapLayer, type NodePosition } from './viz/heatmap';
import { buildHybridLayers, scheduleRipple, type RippleHandle } from './viz/ripple';
import { findNearestEdge, type EdgeInfo } from './viz/edges';
import { createEdgeTooltip } from './viz/tooltip';
import { hasGradientSignFlip } from './viz/threshold';
import { createActionButtons, createMuteToggle, createOutputSelector, createSliderPanel } from './viz/controls';
import { SfxEngine } from './audio/sfx';

const NUM_INPUTS = 3;
const LAYER_SIZES = [5, 4, 3];
const INITIAL_SEED = 42;

function seededRand(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const network = new MLP(NUM_INPUTS, LAYER_SIZES, seededRand(INITIAL_SEED));
let inputValues = [0.5, -0.2, 0.1];
const sfx = new SfxEngine();

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
const stageEl = app.querySelector<HTMLElement>('.stage');
const controlsEl = app.querySelector<HTMLElement>('.controls');
if (!canvasEl || !stageEl || !controlsEl) throw new Error('expected stage canvas and controls panel');
const canvas: HTMLCanvasElement = canvasEl;

let prevLayers: HeatmapLayer[] = [];
let pendingRipple: RippleHandle | null = null;
let backpropTarget = 0;
let currentEdges: EdgeInfo[] = [];

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Rebuilds the edge list (for hover tooltips) from each connection's weight and upstream gradient. */
function buildEdges(positions: NodePosition[][], layerActivations: Value[][]): EdgeInfo[] {
  const edges: EdgeInfo[] = [];
  for (let li = 1; li < positions.length; li += 1) {
    const prevPositions = positions[li - 1];
    const currPositions = positions[li];
    const prevActivations = layerActivations[li - 1];
    network.layers[li].neurons.forEach((neuron, k) => {
      neuron.weights.forEach((w, j) => {
        edges.push({
          from: prevPositions[j],
          to: currPositions[k],
          weight: w.data,
          upstreamGrad: prevActivations[j].grad,
          jacobianEntry: w.data * prevActivations[j].grad,
        });
      });
    });
  }
  return edges;
}

function recomputeAndDraw(): void {
  // Weights persist across calls, so their accumulated .grad from the
  // previous pass must be cleared before the next backward().
  network.parameters().forEach((p) => {
    p.grad = 0;
  });

  const trace = network.forward(inputValues);
  // Backprop from the chosen output neuron so every upstream neuron's
  // .grad becomes d(that output)/d(that neuron) — the Jacobian row this
  // network visualizes.
  trace.outputs[backpropTarget].backward();

  const nextLayers: HeatmapLayer[] = trace.layerActivations.map((neurons) => ({ neurons }));

  if (hasGradientSignFlip(prevLayers, nextLayers)) {
    sfx.play('pop');
  }

  const rect = canvas.getBoundingClientRect();
  currentEdges = buildEdges(
    computeLayout(rect.width, rect.height, nextLayers.map((l) => l.neurons.length)),
    nextLayers.map((l) => l.neurons),
  );

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
  sfx.play('tick');
  recomputeAndDraw();
});
controlsEl.appendChild(sliderPanel.element);

const outputSelector = createOutputSelector(
  LAYER_SIZES[LAYER_SIZES.length - 1] > 1
    ? Array.from({ length: LAYER_SIZES[LAYER_SIZES.length - 1] }, (_, i) => `y${i}`)
    : ['y0'],
  backpropTarget,
);
outputSelector.onChange((index) => {
  backpropTarget = index;
  recomputeAndDraw();
});
controlsEl.appendChild(outputSelector.element);

const actionButtons = createActionButtons([
  { id: 'randomize', label: 'Randomize' },
  { id: 'reset', label: 'Reset' },
]);
actionButtons.onClick((id) => {
  if (id === 'randomize') {
    network.randomize(Math.random);
  } else if (id === 'reset') {
    network.randomize(seededRand(INITIAL_SEED));
  }
  sfx.play('chime');
  recomputeAndDraw();
});
controlsEl.appendChild(actionButtons.element);

const controlsHeader = document.createElement('div');
controlsHeader.className = 'controls-header';
const muteToggle = createMuteToggle(sfx.muted);
muteToggle.onToggle(() => {
  muteToggle.setMuted(sfx.toggleMute());
});
controlsHeader.appendChild(muteToggle.element);
controlsEl.insertBefore(controlsHeader, controlsEl.firstChild);

const edgeTooltip = createEdgeTooltip();
stageEl.appendChild(edgeTooltip.element);

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const nearest = findNearestEdge(currentEdges, x, y);
  if (nearest) {
    edgeTooltip.show(nearest, x + 12, y + 12);
  } else {
    edgeTooltip.hide();
  }
});
canvas.addEventListener('mouseleave', () => edgeTooltip.hide());

window.addEventListener('resize', recomputeAndDraw);

recomputeAndDraw();
