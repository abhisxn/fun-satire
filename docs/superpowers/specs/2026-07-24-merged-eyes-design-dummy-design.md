# Merged eyes design dummy — design spec

## Context

Three standalone HTML prototypes exist as design explorations for the "field of eyes" interaction, each built independently:

- `.kilo/worktrees/colorful-attempt-deepseek/deep-index.html` — SVG-based, almond eye shape asset with flat-colored pupils, simple cursor-follow tracking.
- `.kilo/worktrees/concise-wanderer-glm/glm-index.html` — full marketing page (nav/hero/bento/footer) wrapped around an SVG artboard; cream/serif visual language; pupils use radial-gradient shading and **dilate** (grow) as the cursor nears.
- `.kilo/worktrees/misty-henley-kimi/design-dummy.html` — canvas-based physics engine: eyes track the cursor, repel from and orbit a draggable center "subject," blink independently, spring back home; floating HUD with eye-count stepper and repel slider; custom drawn crosshair cursor (`cursor: none`).

A Figma reference (file `oPAdd7oWLQVMTP1v6pJOW0`, node `1:2`) confirms the target look: cream paper background, almond eye shapes with **flat** (non-gradient) pupil fills in a handful of earthy hues, and a plain center circle.

The goal is to merge the best of each into a single standalone HTML file — a design-review artifact, not wired into the production `src/` engine.

## What to take from each source

- **From deep-index.html:** the eye shape/asset — almond/leaf sclera path proportions and flat solid-color pupil rendering (confirmed correct by the Figma screenshot; glm's gradient iris is not used).
- **From glm-index.html:** visual styling only (not its page chrome) — cream background tone, Fraunces + Space Grotesk type pairing, glass-blur pill badge/HUD treatment, film grain overlay — plus the pupil **dilation** behavior (pupil radius grows as the cursor nears that eye).
- **From design-dummy.html:** the interaction engine — canvas-based rendering, physics (repel from + spring back to home position, orbit/idle drift), independent per-eye blink timers, draggable center subject, and the HUD control pattern (stepper + slider), all kept largely as-is.

## Fixes/changes on top of the three sources

1. **Cursor.** Remove design-dummy's custom drawn crosshair cursor (`cursor: none` + canvas-drawn indicator). Use the real OS cursor: `default` (arrow) everywhere by default. Over the draggable center subject, switch to `cursor: grab`; while actively dragging it, `cursor: grabbing`. HUD controls (buttons, slider) use their native browser cursor affordances — this was the concrete bug being fixed (the old custom cursor never changed state over the subject or controls).
2. **"Mode" HUD element.** Kept as a static label/badge only ("Eyes mode") — no functional toggle, per explicit decision.
3. **Rendering approach.** Canvas (not SVG) for the eye field, to preserve design-dummy's physics/blink engine and keep performance acceptable at higher eye counts, while drawing each eye with deep-index's almond shape and flat pupil color instead of design-dummy's own eye style.
4. **Palette.** Use the Figma screenshot's cream tone and pupil hues (ink/near-black, slate-blue, sage-green, olive, warm brown) rather than any single source file's exact hex set.

## Structure

- New file: `design-dummy/index.html` (new top-level folder), fully self-contained — inline CSS/JS, no build step, no dependency on `src/`.
- Single canvas fills the viewport (`position: fixed; inset: 0`), matching design-dummy's immersive full-screen approach — no nav/hero/bento page chrome (explicitly ruled out).
- Floating glass-pill HUD anchored bottom-center (double-bezel treatment: outer soft shell + inner content, per high-end-visual-design skill), containing:
  - Eye-count stepper (− / value / +)
  - Repulsion-strength slider
  - Static "Eyes mode" badge/label
- Small corner badge/caption (Fraunces italic), fading out after a few seconds, mirroring the existing "hint" pattern in the sources.
- Fixed, `pointer-events: none` film-grain overlay.

## Interaction/physics behavior (carried from design-dummy.html)

- Each eye has a home position; cursor proximity repels it outward, a spring pulls it back home, with damping.
- Idle (no pointer movement for ~1.4s): eyes drift into a gentle orbit around the center subject instead of chasing the last cursor position.
- Pupils track the cursor direction within a clamped travel radius per eye, and **dilate** (radius increases, per glm's effect) based on proximity to the cursor.
- Independent per-eye blink cycles (random interval, quick close/reopen).
- Center subject is draggable (pointer down within its radius grabs it; releases on pointer up); has its own idle "breathing"/subtle eye-tracking as in glm.
- Small wandering "bug" decorations from design-dummy are kept as ambient detail.

## Out of scope

- No wiring into `src/` (Engine, Renderer, HUD, etc.) — this is a standalone visual/interaction reference only.
- No functional "mode" switching.
- No responsive/mobile-specific redesign beyond what the sources already handle (resize listener recalculating layout).
