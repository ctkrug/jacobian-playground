# Vision

## The problem

Backpropagation is usually taught as an equation — the chain rule expanded
across a computation graph — before it's ever felt as a phenomenon. Existing
interactive neural-net toys, most famously TensorFlow Playground, let you
watch a decision boundary bend as training proceeds, but they never expose
the gradient itself: the signal that says *which weight actually mattered*.
The Jacobian — the full matrix of `d(output_i)/d(input_j)` — stays an
abstraction on a whiteboard even for people who use it every day.

## Who it's for

Anyone building intuition for how gradients flow through a network: students
in a first ML course, engineers who use autodiff frameworks daily without
ever having watched one compute a single scalar gradient by hand, and curious
tinkerers who like small, honest, inspectable tools. No account, no install,
no GPU — open a URL and drag a slider.

## The core idea

A hand-rolled reverse-mode automatic differentiation engine (`Value`, in
`src/autodiff/`) is the entire foundation. Every arithmetic operation records
a tiny closure describing how to push a gradient backward to its operands.
A small multi-layer perceptron (`src/nn/`) is built directly on top of that
engine — its neurons are `Value` nodes, not raw floats.

That single design choice is what makes the "wow moment" possible for free:
because every neuron's activation is already a node in a differentiable
graph, calling `.backward()` from any chosen output populates `.grad` on
*every* upstream neuron and input in one pass — and that `.grad` value *is*
one row of the network's Jacobian. The UI's job is just to trigger that pass
on every slider drag and paint the result. There's no separate "compute the
Jacobian" step bolted on afterward; the visualization *is* the autodiff
engine's own bookkeeping, made visible.

## Key design decisions

- **No ML library, on purpose.** Importing TensorFlow.js would make the demo
  trivial to build and impossible to fully explain. Writing the autodiff
  engine from scratch keeps the whole mechanism small enough to read in one
  sitting (see `src/autodiff/value.ts`) and means every gradient shown on
  screen traces back to code Charlie can point at, not a black box.
- **Canvas over DOM/SVG for the heatmap.** A hand-tuned 2D canvas render
  keeps redraws cheap enough to run on every slider `input` event (not just
  on release), which is what makes the ripple feel continuous rather than
  stepped.
- **Fresh `Value` graph per forward pass, persistent weights.** Inputs and
  intermediate activations are new `Value` nodes on every `forward()` call,
  so there's no stale gradient state to reason about for the visualization;
  only the learned parameters (weights/biases) persist across calls, and
  their accumulated gradient is explicitly zeroed before each new backward
  pass.
- **Static site, zero backend.** Everything runs client-side; the production
  build is one self-contained directory with relative asset paths so it can
  be deployed under a sub-path (`apps.charliekrug.com/jacobian-playground`)
  with no server-side changes.

## What "v1 done" looks like

- A fixed small MLP (configurable layer sizes) with a labeled slider per
  input, each wired to a live forward+backward recompute.
- Every neuron in every layer rendered as a heatmap node colored by
  `d(chosen output)/d(that neuron)`, with a visible ripple as the signal
  propagates layer to layer on slider drag.
- A control to choose which output neuron to backprop from, so the Jacobian
  row being visualized is explicit and switchable.
- A hover interaction exposing the exact Jacobian entry (weight × upstream
  gradient) for a single connection.
- The full visual direction from `docs/DESIGN.md` applied and self-reviewed
  at 390px, 768px, and 1440px.
- A deployed static build, live at its subdomain path, with CI green.
