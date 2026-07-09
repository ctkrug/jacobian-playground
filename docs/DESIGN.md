# Design direction

## 1. Aesthetic direction

**Blueprint / technical.** Jacobian Playground reads like a technical schematic
come alive: a deep-navy drafting-table backdrop, thin cyan grid lines, precise
mono numerals for every value on screen, and one hot amber accent reserved
entirely for "this is where the gradient is strongest." The feeling is
*instrument panel*, not *marketing card* — every element earns its place by
showing a number or a signal.

This is a deliberate departure from the dark-card-plus-one-accent look; the
grid, the mono type, and the drafting-blue palette are specific to a tool about
making an invisible mathematical structure visible.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b1220` | Page background (deep blueprint navy) |
| `--surface-1` | `#101a2e` | Panels, slider rail, cards |
| `--surface-2` | `#16223c` | Raised elements, tooltips, active panel |
| `--text` | `#e8edf7` | Primary text |
| `--text-muted` | `#8fa3c4` | Secondary labels, captions |
| `--accent` | `#4fd1ff` | Blueprint cyan — grid lines, primary interactive color |
| `--accent-heat` | `#ffb454` | Amber — high-magnitude positive gradient |
| `--accent-cold` | `#5b8dee` | Cool blue — high-magnitude negative gradient |
| `--success` | `#5fd88f` | Confirmations (e.g. topology applied) |
| `--danger` | `#ff6b6b` | Errors, invalid input |

**Gradient color scale:** neuron nodes are colored on a diverging scale from
`--accent-cold` (strongly negative gradient) through `--surface-2` (near zero)
to `--accent-heat` (strongly positive gradient), magnitude mapped to both
saturation and a soft glow radius so "hot" neurons visibly bloom.

**Type pairing:**
- Display / wordmark / headings: **Space Grotesk** (geometric, technical, a
  little architectural) — Google Fonts, `system-ui, sans-serif` fallback.
- UI / numerals / labels / slider values: **JetBrains Mono** — Google Fonts,
  `ui-monospace, monospace` fallback. Every live number on screen (slider
  values, gradient magnitudes) renders in mono so digits don't jitter in
  width as they change.

**Spacing:** 8px base unit (4px used only for tight inline gaps).
**Corner radius:** 4px — sharp enough to read as drafted, not soft plastic.
**Shadow / glow:** no drop shadows; depth comes from a soft cyan or amber glow
(`box-shadow: 0 0 12px rgba(79, 209, 255, 0.35)`) on active/hot elements, plus
a 1px `--accent` border at low opacity on panels to suggest a drafted outline.
**Motion:** UI transitions 150ms ease-out; heatmap recolor per neuron 90ms
ease-out; layer-to-layer ripple stagger ~50ms per layer (see juice plan).

## 3. Layout intent

The **network diagram / heatmap canvas is the hero**. On desktop (1440×900) it
occupies the left ~65% of the viewport at full height; a slider + controls
rail sits in a fixed-width panel on the right (~35%), itself scrollable if a
future topology grows tall. On phone (390×844) the layout stacks: the heatmap
canvas first, sized to fill the top ~60% of the viewport, with the slider
panel below it as a scrollable sheet. The canvas is never a small fixed-pixel
box — it sizes to its container and redraws on resize at `devicePixelRatio`.

A thin blueprint grid (drawn on the canvas background, not a CSS texture)
extends behind the network diagram at all times, reinforcing the "schematic"
read even when the network itself is small.

## 4. Signature detail

The wordmark reads as **"∂ Jacobian Playground"** — the partial-derivative
glyph `∂` is set large, in the accent cyan, with a subtle continuous glow
pulse (4s cycle, paused under `prefers-reduced-motion`), doubling as the
favicon monogram. It's the one piece of pure branding on the page, and it
directly names the math the tool is about.

## 5. Juice plan (interactive toy feedback)

This is a toy, not a game, but every interaction still needs a felt response:

- **Slider drag → heatmap ripple:** moving any input slider triggers an
  immediate recompute; each layer's neurons recolor with a ~50ms stagger
  after the previous layer, so the eye reads a left-to-right ripple of color
  change rather than an instant global repaint. Total ripple duration ≤ 300ms
  regardless of layer count.
- **Neuron hover pulse:** hovering a neuron gives it a brief scale/glow pulse
  (120ms) and reveals its exact gradient value in mono type.
- **Connection hover:** hovering an edge highlights it at full opacity and
  dims all others to ~20%, showing the Jacobian entry (weight × upstream
  gradient) in a small tooltip.
- **Threshold-cross pop:** if a neuron's gradient sign flips (crosses zero) as
  a slider moves, that neuron gets a single sharper pop (140ms scale bounce)
  distinct from the steady-state recolor, so sign flips are noticeable, not
  just another shade change.
- **Synth SFX (WebAudio, oscillator-generated, no audio files):**
  - `tick` — a very short, quiet sine blip on slider drag, throttled to at
    most once per ~40ms so continuous dragging doesn't machine-gun the ear.
  - `pop` — a slightly brighter triangle-wave blip on a threshold-cross event.
  - `chime` — a soft two-note rise when weights are randomized/reset.
  - All SFX default to a low volume, share one mute toggle (speaker icon,
    top-right of the controls rail) whose state persists in `localStorage`,
    and the `AudioContext` is created lazily on first user gesture.
- **Reduced motion:** `prefers-reduced-motion` disables the ripple stagger,
  hover pulses, and wordmark glow — color updates still happen instantly,
  just without the animated transition between states.
