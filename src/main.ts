import './style.css';
import { MLP } from './nn/network';
import type { Value } from './autodiff/value';
import { computeLayout, drawHeatmap, type HeatmapLayer, type NodePosition } from './viz/heatmap';
import { buildHybridLayers, scheduleRipple, type RippleHandle } from './viz/ripple';
import { findNearestEdge, type EdgeInfo } from './viz/edges';
import { findNearestNode, type NodeHit } from './viz/nodeHit';
import { createEdgeTooltip, formatNodeText } from './viz/tooltip';
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
/** Whatever the canvas actually last showed — may lag prevLayers mid-ripple. */
let lastRenderedLayers: HeatmapLayer[] = [];
let pendingRipple: RippleHandle | null = null;
let backpropTarget = 0;
let currentEdges: EdgeInfo[] = [];
let currentPositions: NodePosition[][] = [];
let hoveredNode: NodeHit | null = null;

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
  currentPositions = computeLayout(
    rect.width,
    rect.height,
    nextLayers.map((l) => l.neurons.length),
  );
  currentEdges = buildEdges(currentPositions, nextLayers.map((l) => l.neurons));

  // A drag can outrun a previous ripple; drop its pending frames so the
  // heatmap always converges on the latest input rather than showing a
  // stale in-between frame.
  pendingRipple?.cancel();
  // Snapshot the outgoing frame before prevLayers is reassigned below — the
  // ripple's callbacks fire asynchronously, by which point the module-level
  // prevLayers would otherwise already equal nextLayers and the "hybrid"
  // frames would show every layer as fully revealed from the first tick.
  const outgoingLayers = prevLayers;
  pendingRipple = scheduleRipple(
    nextLayers.length,
    (revealedThrough) => {
      lastRenderedLayers = buildHybridLayers(outgoingLayers, nextLayers, revealedThrough);
      drawHeatmap(canvas, lastRenderedLayers);
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

  const nodeHit = findNearestNode(currentPositions, x, y);
  if (nodeHit) {
    hoveredNode = nodeHit;
    edgeTooltip.showText(formatNodeText(prevLayers[nodeHit.layerIndex].neurons[nodeHit.neuronIndex].grad), x + 12, y + 12);
    drawHeatmap(canvas, lastRenderedLayers, { hoveredNode });
    return;
  }

  if (hoveredNode) {
    hoveredNode = null;
    drawHeatmap(canvas, lastRenderedLayers, { hoveredNode });
  }

  const edgeHit = findNearestEdge(currentEdges, x, y);
  if (edgeHit) {
    edgeTooltip.show(edgeHit, x + 12, y + 12);
  } else {
    edgeTooltip.hide();
  }
});
canvas.addEventListener('mouseleave', () => {
  edgeTooltip.hide();
  if (hoveredNode) {
    hoveredNode = null;
    drawHeatmap(canvas, lastRenderedLayers, { hoveredNode });
  }
});

// The mouse-hover tooltip above has no keyboard equivalent otherwise — arrow
// keys step a focus cursor between neurons so the same gradient readout is
// reachable without a pointer.
canvas.tabIndex = 0;
canvas.setAttribute(
  'aria-label',
  "Network gradient heatmap. Focus and use arrow keys to inspect each neuron's gradient; Escape to dismiss.",
);
let keyboardNode = { layerIndex: 0, neuronIndex: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moveKeyboardFocus(deltaLayer: number, deltaNeuron: number): void {
  if (currentPositions.length === 0) return;
  const layerIndex = clamp(keyboardNode.layerIndex + deltaLayer, 0, currentPositions.length - 1);
  const neuronIndex = clamp(keyboardNode.neuronIndex + deltaNeuron, 0, currentPositions[layerIndex].length - 1);
  keyboardNode = { layerIndex, neuronIndex };

  const position = currentPositions[layerIndex][neuronIndex];
  hoveredNode = { layerIndex, neuronIndex, position };
  edgeTooltip.showText(formatNodeText(prevLayers[layerIndex].neurons[neuronIndex].grad), position.x + 12, position.y + 12);
  drawHeatmap(canvas, lastRenderedLayers, { hoveredNode });
}

canvas.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      moveKeyboardFocus(1, 0);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      moveKeyboardFocus(-1, 0);
      break;
    case 'ArrowDown':
      event.preventDefault();
      moveKeyboardFocus(0, 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveKeyboardFocus(0, -1);
      break;
    case 'Escape':
      edgeTooltip.hide();
      if (hoveredNode) {
        hoveredNode = null;
        drawHeatmap(canvas, lastRenderedLayers, { hoveredNode });
      }
      break;
    default:
      break;
  }
});

canvas.addEventListener('blur', () => {
  edgeTooltip.hide();
  if (hoveredNode) {
    hoveredNode = null;
    drawHeatmap(canvas, lastRenderedLayers, { hoveredNode });
  }
});

window.addEventListener('resize', recomputeAndDraw);

recomputeAndDraw();
