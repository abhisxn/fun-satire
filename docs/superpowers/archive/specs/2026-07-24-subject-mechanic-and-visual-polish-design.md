# Fun Satire — Subject Mechanic Fix & v1 Visual Polish — Design Spec

Status: approved, ready for implementation planning.

## Context

The current `v1-core-loop` implementation (PR #1) treats each abstract eye as the direct burn target: the cursor charges and destroys individual eyes. This is backwards from the intended mechanic. The reference Figma design (`https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0`) shows the eyes as a permanent, reacting **crowd** surrounding a distinct **Subject** figure — the eyes are the crowd's gaze/attack, and the Subject is what gets burned. This spec corrects that architecture and, alongside it, closes the visual-fidelity gaps between the implemented HUD/creature rendering and the already-locked "Paper-Cut Protest" identity (`docs/superpowers/specs/2026-07-23-fun-satire-design.md`), using `/high-end-visual-design` and `/frontend-design` as rigor references — not as a license to depart from the locked palette/typography/motion identity.

This spec amends v1's core-loop mechanic (the burn-target relationship) as originally approved in the v1 design spec; it does not change the locked stack, rendering approach, content-as-data/registry principles, or overall visual identity tokens, all of which remain in force.

## 1. Entity model & architecture

- New `subject` rig, following the same registry pattern eyes already use: a manifest entry (single-entry roster — there is only ever one live Subject at a time), `src/entities/behaviors/SubjectBehavior.ts`, `src/render/drawers/drawSubject.ts`, both registered in the existing `behaviors/index.ts` / `render/index.ts`. No changes to `Engine.ts`, `ForceField.ts`, `StateMachine.ts`, or `EntityStore.ts`.
- `SubjectBehavior` does not flee the cursor like eyes do. It eases toward a point near the current cursor position (slight offset/lag so it doesn't sit exactly under the crosshair) using the existing `SpringHome`/`Integrator` primitives, with cursor position substituted for a fixed home point.
- `EyeBehavior` is unchanged except for exposing whether a given eye is currently within burn-assist range of the Subject (reuses the existing nearest-neighbor/range math already computed for field lines). The render layer reads this to draw gaze-lines; no new physics.
- `PowerController` targeting simplifies: instead of finding the nearest in-range eye, it always targets the single live Subject entity, or does nothing if no Subject currently exists (post-burn cooldown window).
- Eyes are removed entirely from the burn/effect pipeline. `EffectSystem`/`laserBurn` runs only against the Subject. Eyes keep blink/drag/flee behavior exactly as already built and are never destructible.

## 2. Charge-up, burn & the "eyes assist" visual

- Charge-up trigger is unchanged in spirit: click-and-hold near the Subject. Since the Subject is cursor-anchored, holding down charges against it whenever one exists; during the post-burn cooldown gap (no Subject present), charging has no effect.
- New visual: while charging, every eye currently in burn-assist range draws a thin coral gaze-line from its pupil to the Subject, intensifying (opacity/width easing up) in lockstep with the existing charge-ring/field-line intensification. This is an addition to the existing field-line drawer (same `ForceField`-driven math, a second set of line endpoints) — not a new system.
- At the charge threshold, the existing 4-stage burn effect fires (glow → laser-line → shrink → ash-particle dissolve), now targeting the Subject entity instead of an eye. The eyes' gaze-lines and the burn's laser-line share the same coral color/weight so the moment reads as continuous — the crowd's gaze becomes the burn.
- Releasing early cancels the charge with the same fade-out behavior as today; gaze-lines fade out with it.

## 3. Respawn / cooldown

- On burn completion, the Subject entity is removed. For a short cooldown (~1–2s, using the existing `--ease-protest`/duration tokens) no Subject exists — the cursor shows only the crosshair over the reacting eye crowd, and gaze-lines have nothing to converge on (idle).
- After the cooldown, a new Subject fades/scales in at the current cursor position using the existing entrance-transition easing token, ready to be charged again.

## 4. Visual polish (agency-grade, within the locked Paper-Cut Protest identity)

Applying `/high-end-visual-design` and `/frontend-design` means borrowing their rigor — considered typographic contrast, layered depth, deliberate motion, no generic defaults — while staying inside the already-locked identity (cream/slate/sage/ink/coral, Fraunces + Space Mono, hand-torn paper). This is not license to introduce glass/neon/SaaS aesthetics those skills default to elsewhere.

Gaps identified against the locked v1 spec, and their fixes:

- **HUD placard** (`src/hud/hud.css`): currently has no background, border, or texture — bare floating text. Add an actual torn-paper card: cream fill, an irregular hand-cut edge (SVG clip-path or canvas-drawn torn silhouette, not a clean rectangle), a soft layered drop-shadow for physical lift, grain consistent with the page-level overlay. Promote the mode/power label to Fraunces italic (currently 100% Space Mono, which should be reserved for HUD numbers/labels only, not the headline).
- **Shared paper-cut rendering utility**: `drawEye.ts` currently renders as clean flat vector with no texture or depth. Extract a shared utility (`src/render/paperCut.ts`) that adds a slight hand-cut edge wobble and a soft offset shadow, used by both `drawEye` and the new `drawSubject`. Written once so v2 (bugs) and v3 (real roster) drawers inherit the same tactile quality for free, per the existing registry principle.
- **`drawSubject.ts`**: uses the same paper-cut treatment; renders an abstract, generic authority-figure silhouette (not a specific real person, not photoreal) — satisfies the existing `styleGuardrail: 'flat-illustrated'` schema requirement.
- **Motion audit**: confirm every transition uses `--ease-protest`/GPU-safe transform+opacity (already true in `hud.css`/`tokens.css` for the placard entrance and charge ring); ensure the new gaze-lines and Subject entrance/exit use the same easing family rather than introducing new timing values.

## Relationship to existing v1 spec

This supersedes the burn-target description in `docs/superpowers/specs/2026-07-23-fun-satire-design.md`'s v1 section ("Burn effect" and "Respawn" bullets, which described eyes as the destructible/respawning entity). All other locked decisions in that spec (stack, rendering, content-as-data, registry pattern, visual identity tokens, HUD placement, motion principle, touch/mobile posture, content guardrail) remain unchanged and in force.
