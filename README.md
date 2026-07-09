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
- Input sliders that trigger a fresh forward + backward pass on every drag, so
  the heatmap updates continuously as you move.

## Planned features

See [`docs/BACKLOG.md`](docs/BACKLOG.md) for the full epic/story breakdown and
[`docs/VISION.md`](docs/VISION.md) for the design rationale. Highlights:

- Selectable target output to backprop from.
- Hover tooltip exposing the exact Jacobian entry (weight × upstream gradient)
  for a single connection.
- Adjustable network topology (hidden layer count/width) with reinitialization.
- A deliberate visual direction (see [`docs/DESIGN.md`](docs/DESIGN.md)) —
  this is a designed interactive toy, not a wireframe.

## Stack

- **TypeScript**, no framework — Canvas 2D for rendering.
- **Vite** for dev server and static production builds.
- **Vitest** for unit tests (the autodiff engine is tested against analytic
  derivatives, not just "it runs").
- Zero ML libraries. The autodiff engine and network are original code.

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
