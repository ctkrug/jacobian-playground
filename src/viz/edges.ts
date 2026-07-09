import type { NodePosition } from './heatmap';

/** One rendered connection between two neurons, carrying its local Jacobian entry. */
export interface EdgeInfo {
  from: NodePosition;
  to: NodePosition;
  weight: number;
  upstreamGrad: number;
  /** weight * upstreamGrad — the local Jacobian entry this connection contributes. */
  jacobianEntry: number;
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

/** Returns the edge whose segment is closest to (x, y), or null if none is within maxDistance px. */
export function findNearestEdge(edges: EdgeInfo[], x: number, y: number, maxDistance = 8): EdgeInfo | null {
  let nearest: EdgeInfo | null = null;
  let nearestDistance = maxDistance;

  for (const edge of edges) {
    const distance = distanceToSegment(x, y, edge.from.x, edge.from.y, edge.to.x, edge.to.y);
    if (distance <= nearestDistance) {
      nearest = edge;
      nearestDistance = distance;
    }
  }

  return nearest;
}
