import type { EdgeInfo } from './edges';

/** Formats a connection's weight, upstream gradient, and their product for the hover tooltip. */
export function formatEdgeText(edge: EdgeInfo): string {
  return `w ${edge.weight.toFixed(3)}  ·  ∂ ${edge.upstreamGrad.toFixed(3)}  ·  J ${edge.jacobianEntry.toFixed(3)}`;
}

export interface EdgeTooltip {
  element: HTMLElement;
  /** Shows the tooltip at (x, y), in the coordinate space of its positioned ancestor. */
  show(edge: EdgeInfo, x: number, y: number): void;
  hide(): void;
}

/** Builds a themed, positioned tooltip for a single connection's Jacobian entry. */
export function createEdgeTooltip(): EdgeTooltip {
  const element = document.createElement('div');
  element.className = 'edge-tooltip';
  element.setAttribute('role', 'status');
  element.hidden = true;

  return {
    element,
    show(edge, x, y) {
      element.textContent = formatEdgeText(edge);
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.hidden = false;
    },
    hide() {
      element.hidden = true;
    },
  };
}
