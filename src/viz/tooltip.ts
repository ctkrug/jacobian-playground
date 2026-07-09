import type { EdgeInfo } from './edges';

/** Formats a connection's weight, upstream gradient, and their product for the hover tooltip. */
export function formatEdgeText(edge: EdgeInfo): string {
  return `w ${edge.weight.toFixed(3)}  ·  ∂ ${edge.upstreamGrad.toFixed(3)}  ·  J ${edge.jacobianEntry.toFixed(3)}`;
}

/** Formats a single neuron's gradient for the hover tooltip. */
export function formatNodeText(grad: number): string {
  return `∂ ${grad.toFixed(3)}`;
}

export interface EdgeTooltip {
  element: HTMLElement;
  /** Shows the tooltip at (x, y), in the coordinate space of its positioned ancestor. */
  show(edge: EdgeInfo, x: number, y: number): void;
  /** Shows arbitrary text (e.g. a hovered neuron's gradient) at (x, y). */
  showText(text: string, x: number, y: number): void;
  hide(): void;
}

/** Builds a themed, positioned tooltip for a single connection's Jacobian entry or neuron's gradient. */
export function createEdgeTooltip(): EdgeTooltip {
  const element = document.createElement('div');
  element.className = 'edge-tooltip';
  element.setAttribute('role', 'status');
  element.hidden = true;

  function showText(text: string, x: number, y: number): void {
    element.textContent = text;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.hidden = false;
  }

  return {
    element,
    show(edge, x, y) {
      showText(formatEdgeText(edge), x, y);
    },
    showText,
    hide() {
      element.hidden = true;
    },
  };
}
