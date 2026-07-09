import type { HeatmapLayer } from './heatmap';

/**
 * True if any neuron's gradient sign flipped between two frames (e.g. across a slider
 * drag) — used to trigger the distinct "threshold-cross" feedback from a steady recolor.
 * A neuron sitting at exactly zero in either frame doesn't count as a flip.
 */
export function hasGradientSignFlip(prev: HeatmapLayer[], next: HeatmapLayer[]): boolean {
  return next.some((layer, li) => {
    const prevLayer = prev[li];
    if (!prevLayer) return false;

    return layer.neurons.some((neuron, ni) => {
      const prevNeuron = prevLayer.neurons[ni];
      if (!prevNeuron || neuron.grad === 0 || prevNeuron.grad === 0) return false;
      return Math.sign(neuron.grad) !== Math.sign(prevNeuron.grad);
    });
  });
}
