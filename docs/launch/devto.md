---
title: "Backflow: a neural net where you can watch the gradient flow"
published: false
tags: machinelearning, javascript, typescript, webdev
---

I use `.backward()` constantly. I had never watched it happen.

That is the gap I built [Backflow](https://apps.charliekrug.com/jacobian-playground/) to close. It
is a small neural network in the browser. You drag an input slider, and every neuron recolors by
how strongly it responds to that input: cold for a negative gradient, hot for a positive one. The
gradient stops being a number in a debugger and becomes something you watch move across the screen.

TensorFlow Playground already makes decision boundaries tangible, and it is wonderful. But it shows
you the boundary, never the gradient that produced it. I wanted the other half: the signal that
says which neuron actually mattered for a given input. That signal is one row of the network's
Jacobian, and it is usually a whiteboard abstraction. I wanted to make it a thing you poke.

## Decision 1: the neurons are autodiff nodes, so the picture is free

The temptation was to reach for TensorFlow.js. I did not, for two reasons. It would have made the
demo trivial to build and impossible to fully explain, and the whole point was explanation.

So the foundation is a hand-written reverse-mode autodiff engine: a scalar `Value` class where
every arithmetic operation returns a new node that remembers how to push a gradient to its
operands.

```ts
mul(other: Value | number): Value {
  const b = Value.of(other);
  const out = new Value(this.data * b.data, [this, b], '*');
  out.backwardStep = () => {
    this.grad += b.data * out.grad;
    b.grad += this.data * out.grad;
  };
  return out;
}
```

The multi-layer perceptron is built directly on that: a neuron's weights and activations are
`Value` nodes, not raw floats. This one choice is what makes the visualization almost free. Because
every activation already lives in the graph, calling `.backward()` from any chosen output
populates `.grad` on every upstream neuron in a single pass, and that `.grad` value *is* the
Jacobian entry I want to draw. There is no separate "compute the Jacobian" step. The picture is the
engine's own bookkeeping, colored in.

The engine is small enough to read in one sitting, and it is unit-tested against hand-derived
analytic derivatives rather than against itself, so I trust the numbers on screen.

## Decision 2: the ripple, and the bug that made it look instant

I wanted a slider drag to read as a wave: the gradient revealing layer by layer, left to right,
rather than the whole net flashing at once. So the recompute schedules a short staggered reveal,
one `setTimeout` per layer, and each frame renders a hybrid of the old and new activations: layers
already revealed show the new values, later layers still show the previous frame.

The first version looked completely instant, and it took me a while to see why. The render
callbacks fire asynchronously, but they were reading a module-level `prevLayers` variable that had
already been reassigned to the new frame by the time they ran. Every frame was diffing the new
state against itself, so there was nothing to reveal. The fix was to snapshot the outgoing frame
into a local `const` before reassigning, and close over that:

```ts
const outgoingLayers = prevLayers;
pendingRipple = scheduleRipple(nextLayers.length, (revealedThrough) => {
  lastRenderedLayers = buildHybridLayers(outgoingLayers, nextLayers, revealedThrough);
  drawHeatmap(canvas, lastRenderedLayers);
});
prevLayers = nextLayers;
```

A related race showed up when dragging fast: a new recompute would start before the previous
ripple finished. Each recompute now cancels the pending one, so the heatmap always converges on the
latest input instead of a stale in-between frame.

## What I would do differently

The network topology is fixed. The single most requested thing from early looks was to change the
hidden layer count and width live, and the architecture already supports it (the renderer takes an
arbitrary layer-size list). I scoped it out of v1 to keep the first release honest and small, but
it is the obvious next step.

I would also add a keyboard cursor to the design from the start rather than retrofitting it. The
mouse hover reveals a neuron's exact gradient, and getting that same readout to arrow keys and a
live region afterward was more fiddly than building it in once.

Backflow is TypeScript, Canvas 2D, and Vitest, no framework and no ML library. The autodiff engine
and the network are original code.

- Live: https://apps.charliekrug.com/jacobian-playground/
- Code: https://github.com/ctkrug/jacobian-playground

If you have ever wanted to see what happens between a forward pass and a weight update, drag a
slider and watch.
