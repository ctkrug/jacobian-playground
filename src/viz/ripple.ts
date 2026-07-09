import type { HeatmapLayer } from './heatmap';

export interface RippleOptions {
  /** Milliseconds between one layer's recolor and the next. Ignored if it would push the whole ripple past maxTotalMs. */
  staggerMs?: number;
  /** Upper bound on total ripple duration regardless of layer count, per docs/DESIGN.md. */
  maxTotalMs?: number;
  /** When true, every layer reveals instantly with no stagger (prefers-reduced-motion). */
  reducedMotion?: boolean;
  /** Injectable scheduler so timing is testable without real timers. Returns an optional cancel function. */
  schedule?: (fn: () => void, delayMs: number) => (() => void) | void;
}

export interface RippleHandle {
  cancel(): void;
}

function defaultSchedule(fn: () => void, delayMs: number): () => void {
  const id = setTimeout(fn, delayMs);
  return () => clearTimeout(id);
}

/** Per-layer delay (ms) for a left-to-right ripple, capped so the total never exceeds maxTotalMs. */
export function computeLayerDelays(numLayers: number, staggerMs: number, maxTotalMs: number): number[] {
  if (numLayers <= 0) return [];
  if (numLayers === 1) return [0];
  const effectiveStagger = Math.min(staggerMs, maxTotalMs / (numLayers - 1));
  return Array.from({ length: numLayers }, (_, i) => Math.round(i * effectiveStagger));
}

/**
 * Schedules a staggered reveal across `numLayers` steps, calling `render(revealedThrough)`
 * once per step where `revealedThrough` is the highest layer index whose new value should
 * be shown (all layers at or before it are "new"; later layers still show their prior frame).
 */
export function scheduleRipple(
  numLayers: number,
  render: (revealedThrough: number) => void,
  options: RippleOptions = {},
): RippleHandle {
  const staggerMs = options.staggerMs ?? 50;
  const maxTotalMs = options.maxTotalMs ?? 300;
  const reducedMotion = options.reducedMotion ?? false;
  const schedule = options.schedule ?? defaultSchedule;

  if (reducedMotion || numLayers <= 1) {
    render(numLayers - 1);
    return { cancel() {} };
  }

  const delays = computeLayerDelays(numLayers, staggerMs, maxTotalMs);
  const cancels: Array<() => void> = [];
  delays.forEach((delay, i) => {
    const cancel = schedule(() => render(i), delay);
    if (cancel) cancels.push(cancel);
  });

  return {
    cancel() {
      cancels.forEach((c) => c());
    },
  };
}

/**
 * Builds the hybrid layer set for one ripple frame: layers up to and including
 * `revealedThrough` show `next`'s values, later layers still show `prev`'s (or `next`'s,
 * if there is no prior frame yet — e.g. first render).
 */
export function buildHybridLayers(
  prev: HeatmapLayer[],
  next: HeatmapLayer[],
  revealedThrough: number,
): HeatmapLayer[] {
  return next.map((layer, i) => (i <= revealedThrough ? layer : prev[i] ?? layer));
}
