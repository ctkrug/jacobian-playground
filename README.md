# Jacobian Playground

A tiny neural net you can poke. Drag an input slider and watch a live heatmap of
gradients ripple through every layer, in real time, computed by an autodiff engine
built from scratch — no TensorFlow.js, no PyTorch, no black box.

## Why

Tools like TensorFlow Playground make decision boundaries tangible, but they never
show you the thing that actually drives learning: the gradient. A Jacobian —
the matrix of partial derivatives of outputs with respect to inputs — is usually
introduced as an equation on a whiteboard. Jacobian Playground makes it a felt,
30-second experience: nudge a slider, and see exactly which neurons "care" about
that input, live, as color.

## What it does

- Hand-rolled reverse-mode automatic differentiation engine (a scalar `Value`
  graph, in the spirit of micrograd) — every operator (`+`, `*`, `pow`, `tanh`,
  `relu`) records how to push gradients backward through itself.
- A small, configurable multi-layer perceptron built entirely on that engine.
- A canvas-rendered heatmap: every neuron in every layer is colored by
  `d(chosen output) / d(that neuron's activation)` — the live gradient signal,
  not a static diagram.
- Input sliders that trigger a fresh forward + backward pass on every drag,
  with the heatmap revealing layer-by-layer on a short stagger so the
  gradient reads as a ripple flowing left to right (instant under
  `prefers-reduced-motion`).
- A selector to choose which output neuron to backpropagate from, so you can
  see a different row of the Jacobian on demand.
- Hover a connection for its exact Jacobian entry (weight × upstream
  gradient); hover a neuron for its exact gradient value.
- Randomize/reset controls to reinitialize weights or restore the network's
  original starting weights.
- Synthesized WebAudio feedback (tick/pop/chime — no audio files) with a
  persisted mute toggle.

## Planned features

See [`docs/BACKLOG.md`](docs/BACKLOG.md) for the full epic/story breakdown and
[`docs/VISION.md`](docs/VISION.md) for the design rationale. Highlights:

- Adjustable network topology (hidden layer count/width) with reinitialization.
- A deliberate visual direction (see [`docs/DESIGN.md`](docs/DESIGN.md)) —
  this is a designed interactive toy, not a wireframe.

## Stack

- **TypeScript**, no framework — Canvas 2D for rendering.
- **Vite** for dev server and static production builds.
- **Vitest** for unit tests (the autodiff engine is tested against analytic
  derivatives, not just "it runs").
- Zero ML libraries. The autodiff engine and network are original code.

## Architecture

- `src/autodiff/value.ts` — the entire autodiff engine: a scalar `Value`
  class where every operator builds a graph node that knows how to push a
  gradient to its operands. `backward()` topologically sorts the graph from
  a chosen node and fans gradients out in reverse.
- `src/nn/network.ts` — `Neuron`/`Layer`/`MLP` wrap `Value` nodes directly,
  so a single `.backward()` call from any output neuron populates `.grad`
  on every upstream neuron and input — that gradient *is* the Jacobian
  entry the heatmap renders.
- `src/viz/heatmap.ts` — a `devicePixelRatio`-aware canvas renderer that
  colors each neuron on a diverging cold/neutral/hot scale keyed off its
  `.grad`.
- `src/viz/ripple.ts` — schedules the layer-by-layer staggered reveal behind
  every recompute (instant under reduced motion).
- `src/viz/edges.ts` / `src/viz/nodeHit.ts` / `src/viz/tooltip.ts` — hit-test
  the cursor against connections/neurons and show the exact Jacobian entry
  or gradient in a themed tooltip.
- `src/audio/sfx.ts` — synthesized WebAudio SFX (tick/pop/chime) with a
  persisted mute toggle.
- `src/viz/controls.ts` — every themed control: sliders, the output
  selector, randomize/reset buttons, and the mute toggle.
- `src/main.ts` — wires the above together into the running app.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data-flow map
and [`docs/VISION.md`](docs/VISION.md) for the rationale.

## Getting started

```bash
npm install
npm run dev        # local dev server
npm test           # run the test suite
npm run typecheck  # strict TypeScript check
npm run build      # static production build -> dist/
```

The production build is a fully static, self-contained site with relative
asset paths — it can be served from any path, including a subdomain
sub-path deployment.

## License

MIT — see [`LICENSE`](LICENSE).
