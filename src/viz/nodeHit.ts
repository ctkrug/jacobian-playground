import type { NodePosition } from './heatmap';

export interface NodeHit {
  layerIndex: number;
  neuronIndex: number;
  position: NodePosition;
}

/** Returns the neuron whose rendered position is closest to (x, y), or null if none is within maxDistance px. */
export function findNearestNode(positions: NodePosition[][], x: number, y: number, maxDistance = 14): NodeHit | null {
  let nearest: NodeHit | null = null;
  let nearestDistance = maxDistance;

  positions.forEach((layer, layerIndex) => {
    layer.forEach((position, neuronIndex) => {
      const distance = Math.hypot(x - position.x, y - position.y);
      if (distance <= nearestDistance) {
        nearest = { layerIndex, neuronIndex, position };
        nearestDistance = distance;
      }
    });
  });

  return nearest;
}
