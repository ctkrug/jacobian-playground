# Backflow

**▶ Live demo: [apps.charliekrug.com/jacobian-playground](https://apps.charliekrug.com/jacobian-playground/)**

[![CI](https://github.com/ctkrug/jacobian-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/jacobian-playground/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Drag a slider, watch the gradient flow.** Backflow is a small neural network you can poke.
Move an input and it runs a full forward and backward pass, then colors every neuron by how
strongly it responds to that input. The gradients you usually only read about become something
you watch move, computed live by an autodiff engine built from scratch. No TensorFlow.js, no
PyTorch, no black box.

## Who it's for

Anyone building intuition for how gradients flow through a network: students in a first machine
learning course, and engineers who call `.backward()` in a framework every day without ever
having watched one compute a scalar gradient by hand. No account, no install, no GPU. Open the
link and drag a slider.

## Why

Backpropagation is usually taught as an equation before it is ever felt as a phenomenon.
Interactive toys like TensorFlow Playground let you watch a decision boundary bend, but they
never expose the gradient itself: the signal that says which neuron actually mattered. A Jacobian,
the table of partial derivatives of outputs with respect to inputs, stays an abstraction on a
whiteboard even for people who use it daily. Backflow turns it into a 30-second experience: nudge
a slider and see exactly which neurons care about that input, live, as color.

## What it does

- **Gradients as color, not equations.** Every neuron is tinted by `d(output) / d(neuron)`, the
  exact value backpropagation computes, on a cold-to-hot diverging scale.
- **Drag and it ripples.** Moving a slider recomputes the network and reveals the new gradients
  layer by layer, left to right, in under 300ms, so the flow reads as a wave rather than a flat
  repaint (instant under `prefers-reduced-motion`).
- **Inspect any connection.** Hover an edge for its weight, its upstream gradient, and their
  product: one entry of the Jacobian, written out. Hover a neuron for its exact gradient. Arrow
  keys reach the same readouts without a mouse.
- **Switch the output you differentiate.** Pick which output neuron to backpropagate from and a
  different row of the Jacobian appears.
- **Randomize or reset.** Draw a fresh set of weights, or return to the network's original
  starting weights.
- **Synthesized sound.** WebAudio tick/pop/chime feedback (no audio files) with a mute toggle
  that persists across visits.

## How the gradient becomes the picture

The whole tool rests on one design choice: the network's neurons are nodes in an automatic
differentiation graph, not raw floats. A scalar `Value` (in `src/autodiff/value.ts`) records, per
operation, how to push a gradient backward to its operands. Because every activation already lives
in that graph, calling `.backward()` from any chosen output populates `.grad` on every upstream
neuron and input in a single pass, and that `.grad` value *is* one row of the network's Jacobian.
The UI just triggers that pass on every slider drag and paints the result. There is no separate
"compute the Jacobian" step bolted on; the visualization is the autodiff engine's own bookkeeping,
made visible.

## Architecture

- `src/autodiff/value.ts`: the entire autodiff engine. `backward()` topologically sorts the graph
  from a chosen node and fans gradients out in reverse.
- `src/nn/network.ts`: `Neuron` / `Layer` / `MLP` built directly on `Value`. `forward()` returns
  every layer's post-activation values so the UI can render any intermediate layer, not just the
  output.
- `src/viz/heatmap.ts`: a `devicePixelRatio`-aware canvas renderer that colors each neuron on the
  diverging cold/neutral/hot scale from `docs/DESIGN.md`.
- `src/viz/ripple.ts`: schedules the layer-by-layer staggered reveal behind every recompute.
- `src/viz/edges.ts` / `nodeHit.ts` / `tooltip.ts`: hit-test the cursor against connections and
  neurons and show the exact Jacobian entry or gradient.
- `src/audio/sfx.ts`: synthesized WebAudio SFX with a persisted mute toggle.
- `src/viz/controls.ts`: every themed control: sliders, the output selector, the action buttons,
  and the mute toggle.
- `src/main.ts`: wires it together.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data-flow map and
[`docs/VISION.md`](docs/VISION.md) for the rationale.

## Getting started

```bash
npm install
npm run dev        # local dev server
npm test           # run the test suite (autodiff checked against analytic derivatives)
npm run typecheck  # strict TypeScript check
npm run lint       # eslint
npm run build      # static production build -> dist/
```

The production build is a fully static, self-contained site with relative asset paths, so it
serves from any path including a subdomain sub-path.

## Tech

TypeScript with no framework, Canvas 2D for rendering, Vite for the build, and Vitest for tests.
The autodiff engine and the network are original code. Coverage sits near 100%, and the autodiff
engine is tested against hand-derived analytic derivatives, not just "it runs."

## License

MIT, see [`LICENSE`](LICENSE).

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)
