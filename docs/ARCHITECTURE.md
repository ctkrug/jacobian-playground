# Architecture

A map of the codebase for anyone picking this up cold. See `docs/VISION.md` for
the "why" and `docs/DESIGN.md` for the visual direction.

## Data flow

```
slider drag / output select / randomize+reset
        │
        ▼
main.ts: recomputeAndDraw()
        │
        ├─ zero every parameter's .grad (weights persist; grads must not accumulate)
        ├─ network.forward(inputValues)        → fresh Value graph, one per pass
        ├─ trace.outputs[backpropTarget].backward()
        │       every upstream Value's .grad is now d(chosen output)/d(that node)
        │
        ├─ buildEdges(...)                     → weight × upstream grad per connection
        │       (feeds the hover tooltip's hit-testing)
        │
        └─ scheduleRipple(...) → per-layer staggered drawHeatmap() calls
                (buildHybridLayers mixes old/new layers per animation step)
```

Nothing is mutated in place across passes except the network's learned
parameters (weights/biases); inputs and activations are new `Value` nodes each
`forward()` call, so there is no stale gradient state to reason about.

`recomputeAndDraw()` snapshots the outgoing `prevLayers` into a local
`outgoingLayers` const *before* reassigning `prevLayers = nextLayers` — the
ripple's `setTimeout` callbacks run after that reassignment, so without the
snapshot every frame would diff `nextLayers` against itself and the reveal
would jump straight to the final state. A second variable, `lastRenderedLayers`,
tracks whatever the canvas actually last painted (which lags `prevLayers`
mid-ripple); every hover/keyboard-driven redraw uses it instead of `prevLayers`
so inspecting a neuron never fast-forwards an in-flight ripple.

## Modules

- **`src/autodiff/value.ts`** — the entire autodiff engine. `Value` wraps a
  scalar and records, per operation, a closure that pushes an incoming
  gradient to its operands. `backward()` topologically sorts from the called
  node and fans gradients out in reverse. This is the only place calculus
  happens; everything above it just reads `.grad`.
- **`src/nn/network.ts`** — `Neuron` → `Layer` → `MLP`, built directly on
  `Value` (no separate float/tensor representation). `MLP.forward()` returns a
  `ForwardTrace` exposing inputs, every layer's post-activation values, and
  the outputs, so the UI can render *any* intermediate layer, not just the
  final one. `randomize(rand)` reinitializes weights in the same
  layer/neuron/weight order the constructor draws in, which is what lets
  "reset" replay the original seed and land back on the original weights.
- **`src/viz/heatmap.ts`** — `computeLayout()` (pure — neuron pixel positions
  from a layer-size list) and `drawHeatmap()` (impure — clears and repaints
  the canvas at `devicePixelRatio`, drawing edges then gradient-colored
  nodes). `gradientToColor()` is the diverging cold/neutral/hot mapping from
  `docs/DESIGN.md`.
- **`src/viz/ripple.ts`** — turns one instantaneous recompute into a
  left-to-right reveal. `scheduleRipple()` calls back once per layer on a
  capped stagger (`maxTotalMs` regardless of layer count); `buildHybridLayers()`
  is the pure function that, for a given "revealed through" index, picks
  each layer's neurons from either the new or the previous frame. Reduced
  motion collapses this to a single instant render.
- **`src/viz/edges.ts`** — `findNearestEdge()` is point-to-segment
  hit-testing against the current connection list, used to drive the hover
  tooltip from raw cursor coordinates rather than per-edge DOM elements
  (there can be dozens of edges; canvas has no hoverable nodes).
- **`src/viz/tooltip.ts`** — the hover tooltip's DOM element and
  show/hide/format logic, decoupled from hit-testing so each is testable on
  its own. Reused for both mouse hover and the keyboard-driven cursor in
  `main.ts` (`role="status"` makes either path announce to a live region).
- **`src/viz/controls.ts`** — every themed control: the input slider panel,
  the output (backprop target) selector, and the generic action-button row
  (randomize/reset). Each returns `{ element, onChange/onClick }` rather than
  reaching into global state, so `main.ts` is the only place that knows what
  a control's event *means* for the network.
- **`src/main.ts`** — the composition root. Owns the `MLP` instance, the
  current input values, and the current backprop target; wires every control
  to `recomputeAndDraw()`; owns `buildEdges()`, the one place that couples
  the network's internal `Layer`/`Neuron` weights to on-screen positions
  (kept out of `viz/` so that module stays network-agnostic). The canvas is
  focusable (`tabIndex = 0`) with a `keydown` handler that steps a
  `keyboardNode` cursor between neurons via arrow keys, driving the exact
  same tooltip/highlight the mouse-hover path uses — the only way keyboard
  users can reach a neuron's precise gradient or an edge's Jacobian entry.

## Running it

```bash
npm install
npm run dev        # local dev server
npm test           # vitest, all modules above are unit-tested
npm run test:coverage  # vitest with v8 line/branch coverage
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src
npm run build       # static production build -> dist/, relative asset paths
```

## Deployment

`vite.config.ts` sets `base: './'` so every built asset reference is
relative; `dist/` is a fully self-contained static site and can be served
from any sub-path, including `apps.charliekrug.com/jacobian-playground`.
