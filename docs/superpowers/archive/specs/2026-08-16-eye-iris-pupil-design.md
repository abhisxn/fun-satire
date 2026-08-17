# Eye Iris + Pupil

## Goal

The eye creature's single colored circle is currently misnamed `pupil` (`EyeCreature.pupil`) when
anatomically it's the iris — the colored ring, not the dark center. Rename it, and add a real pupil: a
smaller circle concentric with the iris, in a subtly darker shade of the iris's own color, that moves
identically (same gaze-tracking math, same frame).

## Design

**Rename**: `EyeCreature.pupil: SVGCircleElement` → `EyeCreature.iris: SVGCircleElement`. Everything that
currently reads/writes it keeps its exact behavior, just under the new name. `PUPIL_COLORS` → `IRIS_COLORS`,
`PUPIL_BASE_CX`/`PUPIL_BASE_CY` → `IRIS_BASE_CX`/`IRIS_BASE_CY` (all three are local to `EyeCreature.ts`,
confirmed via grep — no other file references them).

**New `EyeCreature.pupil: SVGCircleElement`**: created programmatically in `createEyeCreature` (it doesn't
exist in the static `eye.svg` asset) and inserted immediately after the iris circle in the same `<svg>`, so
it paints on top in document order.

- **Size**: radius = the iris's own radius (read from its `r` attribute at creation time, so this works
  whether the iris circle's radius is the production SVG's `23.6389` or a test fixture's `10`) × a new
  `PUPIL_RADIUS_RATIO = 0.35` constant.
- **Position**: starts at the iris's current `cx`/`cy` (concentric).
- **Color**: the iris's own randomly-assigned fill color, darkened by a new `PUPIL_DARKEN_AMOUNT = 0.2` via a
  small new pure, exported helper `darkenHexColor(hex: string, amount: number): string` (parses the hex
  triplet, multiplies each channel by `1 - amount`, reformats) — same hue family as the iris, a visible but
  subtle shade darker, not an unrelated color.

**Shared gaze-tracking logic**: `updateEyePupil()` already computes one target `(cx, cy)` per frame from the
avatar's position (unchanged math — direction, per-eye rotation factor, ellipse projection, distance
falloff). It currently writes that target only to the iris; it now writes the same target to both the iris
and the new pupil circle in the same call, since they're concentric and move as one unit. No new tracking
math — the pupil simply rides along with the iris. The function keeps its existing exported name
(`updateEyePupil`) since `CreatureGrid.ts` imports and calls it by name and nothing about its external
contract (signature, when it's called) changes.

**Out of scope**: blink (`updateEyeBlink`) already scales the whole eye element via a `scaleY` transform
applied by `CreatureGrid.ts`, not the individual circles — untouched, both iris and pupil blink together for
free. No change to hover behavior, spawn/pop-in, or the static `eye.svg` asset itself (the pupil is always
JS-created, never present in the fetched markup).

## Files affected

- `src/creatures/EyeCreature.ts` — the core change (interface, `createEyeCreature`, `updateEyePupil`, new
  `darkenHexColor` helper, renamed constants).
- `tests/unit/eyeCreature.test.ts` — several existing tests reference `.pupil` directly for what is now the
  iris; rename those references, add new tests for the new pupil (size ratio, color derivation, concentric
  tracking).
- `tests/unit/creatureGridHoverTones.test.ts`, `tests/unit/creatureGrid.test.ts`,
  `tests/unit/creatureGridPopIn.test.ts` — each hand-constructs a minimal fake eye object (via
  `vi.mock('../../src/creatures/EyeCreature', ...)`) so `CreatureGrid`-level tests can exercise the eye-mode
  render path without a real SVG asset. Each stub currently returns `{ ..., pupil: circle, ... }`; each needs
  a second circle added so the real (un-mocked) `updateEyePupil`/`updateEyeBlink` — spread in via
  `...actual` — don't crash trying to read `eye.iris`/`eye.pupil` off an incomplete stub.

## Testing

Per project convention, this touches `creatures/` — run `npm run dev`, switch to Eye mode, and visually
confirm each eye now shows a distinct smaller pupil circle inside its iris, both tracking the cursor/avatar
together, before considering the task done.
