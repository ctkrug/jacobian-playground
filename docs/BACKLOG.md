# Backlog

## Epic 1 — The wow moment: live gradient ripple

The first story here IS the demo: drag a slider, watch the heatmap flow.
Everything else in this epic is the technical decomposition needed to reach
it; taken together, this epic alone delivers the full wow moment.

- [x] **1.1 — [WOW MOMENT] Drag an input slider and watch the gradient heatmap ripple live**
  - Dragging any input slider recomputes a full forward+backward pass and
    recolors every neuron node across every layer within a single animation
    frame — no stale frame while dragging continuously.
  - Each layer's recolor is visibly staggered (~40–80ms per layer) so the
    gradient flow reads as a left-to-right ripple, confirmed by a manual
    scrub test across the full slider range.
  - Unit tests confirm the autodiff engine's computed gradients match
    hand-checked analytic derivatives for a small example network.

- [x] **1.2 — Reverse-mode autodiff `Value` engine**
  - Gradient checks pass against analytic derivatives for `+`, `*`, `pow`,
    `tanh`, and `relu`, including a chain of several ops.
  - `backward()` visits every node's children before the node itself
    (verified by a test asserting correct accumulated `.grad` on a small
    hand-built graph with a reused/shared node).

- [x] **1.3 — Configurable MLP built on the `Value` engine**
  - `forward()` returns per-layer post-activation `Value`s for arbitrary
    layer sizes, and throws a clear error on an input-count mismatch.
  - Calling `.backward()` on one chosen output sets a nonzero `.grad` on
    every upstream neuron and every input `Value`.

- [x] **1.4 — DevicePixelRatio-aware canvas heatmap renderer**
  - Neurons render as nodes colored on a diverging scale by signed
    `.grad` magnitude (cold → neutral → hot, per `docs/DESIGN.md`).
  - The canvas backing store matches `devicePixelRatio` and stays crisp
    (no blur) when resized between 390px and 1440px widths.

- [x] **1.5 — Slider panel wired to trigger recompute**
  - Each input has a labeled range slider with a live mono numeric readout
    that updates as it's dragged.
  - Moving any slider triggers exactly one forward+backward pass and a full
    heatmap repaint per `input` event, with parameter gradients zeroed
    between passes so they never silently accumulate.

## Epic 2 — Exploration & insight tools

- [x] **2.1 — Selectable target output to backprop from**
  - A control lists every output neuron; selecting one re-runs backward()
    from that output and repaints the heatmap accordingly.
  - The currently selected target is visually indicated in the control.

- [ ] **2.2 — Hover tooltip for a single connection's Jacobian entry**
  - Hovering an edge shows its weight, its upstream neuron's gradient, and
    their product (the local Jacobian entry) in a themed tooltip.
  - The tooltip disappears on `mouseleave` and never traps focus for
    keyboard users.

- [ ] **2.3 — Adjustable network topology**
  - A control allows changing hidden layer count (1–3) and width (2–8)
    within bounds; invalid combinations are rejected with an inline message,
    not a crash.
  - Changing topology reinitializes weights and redraws the heatmap with no
    console errors.

- [x] **2.4 — Randomize / reset weights control**
  - A "randomize" button reinitializes all weights with a new random seed
    and immediately repaints the heatmap.
  - A separate "reset" control restores the original default network
    (same seed as first load).

## Epic 3 — Design & polish

- [ ] **3.1 — Apply `docs/DESIGN.md` tokens and blueprint-technical direction**
  - The page uses the chosen font pairing (Space Grotesk / JetBrains Mono),
    color tokens, and 8px spacing scale throughout — no default browser
    styling left on headings, buttons, or the page background.
  - No native unstyled control remains: every slider, button, and select has
    themed hover/focus-visible/active states.

- [ ] **3.2 — Responsive layout for desktop and phone**
  - Layout composes with no horizontal scroll and no overlapping elements at
    390px, 768px, and 1440px viewport widths.
  - The heatmap canvas fills at least 60% of the viewport height on desktop
    and remains the first, dominant element on phone.

- [ ] **3.3 — Motion polish, reduced motion, favicon, and wordmark**
  - Slider-drag ripple, neuron hover pulse, and threshold-cross pop
    animations run in the 90–250ms range with ease-out timing, per the
    juice plan in `docs/DESIGN.md`.
  - `prefers-reduced-motion` disables the ripple stagger and wordmark glow
    while keeping color updates instant (verified by toggling the OS/
    browser setting).
  - A generated favicon (no default globe) and the designed `∂` wordmark are
    present on every page load.

## Epic 4 — Deployment & docs

- [x] **4.1 — Static build pipeline outputs a single deployable directory**
  - `npm run build` outputs to `dist/` containing only relative asset paths
    (verified by inspecting `dist/index.html` for the absence of any
    leading-`/` asset reference).
  - The built site loads and functions correctly when served from a
    non-root sub-path (e.g. `python3 -m http.server` from inside a
    subdirectory of `dist/`).

- [x] **4.2 — CI runs tests, typecheck, lint, and build on push**
  - The GitHub Actions workflow installs dependencies and runs
    `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`,
    failing on any red step.

- [x] **4.3 — README documents usage and architecture**
  - README explains how to run the project locally (`dev`, `test`, `build`)
    and includes a short architecture section describing the autodiff
    engine + heatmap approach in plain language.
