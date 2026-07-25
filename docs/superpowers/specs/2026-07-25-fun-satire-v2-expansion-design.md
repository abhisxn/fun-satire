# Fun Satire — v2 Expansion — Design Spec

Status: roadmap-level detail, ready for implementation planning. Builds on two prerequisite specs that must land first (see "Relationship to existing specs" below).

## Context

`docs/superpowers/specs/2026-07-23-fun-satire-design.md` (the locked umbrella roadmap) sketches v2 — Expansion at a directional level only:

> v2 — Expansion: more creature types (pointed finger, bugs), more powers (electric current, eat, ink smear, garbage, shame stamp), universal controls (quantity, repel strength, change minister/logo).

That bullet was never detailed-planned or approved for implementation — it was explicitly left for "written and approved separately, immediately before that version's work begins" (umbrella spec, closing section). This document is that detailing, for the subset of v2 that has actually been decided (in project conversation, against Figma references) plus reconciliation of two v2 powers that were already implemented ad hoc, ahead of any spec, directly in the working tree.

Two things are true at once and both matter for how this spec reads:

1. Most of v2 as originally roadmapped is genuinely undesigned — this document does **not** invent designs for ink smear, garbage, shame stamp, or "change minister/logo." Those stay open (see §6).
2. Two v2 powers — **electric current burn** and **eat** — already exist as working code (`src/powers/electricBurn.ts`, `src/powers/bugEat.ts`, `src/effects/effectDefs/electricBurn.ts`, `src/effects/effectDefs/bugEat.ts`), wired into `main.ts`, `PowerController`, and `hudIcons.ts` with no spec or plan ever written for them. §5 documents what was actually built against what the roadmap bullet implied, and calls out the one real gap found (no unit tests).

This spec covers, in order: Subject skins, crowd modes (new creature types), the two already-built powers (reconciliation, not fresh design), new HUD controls (quantity, repel), and the no-overlap physics rule those controls require. It does not change the locked stack, rendering approach, content-as-data/registry principles, or visual identity tokens established in the umbrella spec, nor the burn-target/Subject architecture established in the v1-fix spec — both remain in force and are prerequisites.

## 1. Subject skins

- New manifest/behavior-agnostic concept: `subjectSkin: "figure" | "lotus"`. This is a **pure skin swap** — it changes only which drawer renders the Subject entity. It shares every existing Subject behavior, physics, charge/burn targeting, and respawn lifecycle defined in the v1-fix spec's §§1–3 unchanged.
- `"figure"` is the existing abstract authority-figure silhouette from the v1-fix spec (`drawSubject.ts`, `styleGuardrail: 'flat-illustrated'`).
- `"lotus"` is a flat paper-cut lotus bloom — reference: Figma file `oPAdd7oWLQVMTP1v6pJOW0`, node `44:287` and node `46:905` (both design-dummy frames show the lotus as the crowd's center Subject). Rendered with the same shared paper-cut treatment (`src/render/paperCut.ts`, introduced in the v1-fix spec) and the same locked palette — not the literal color/texture of the reference sticker image, which is a photographic reference only.
- Skin is chosen via a new HUD skin selector (§4), styled identically to the existing mode/power selectors (click-to-cycle placard control). Selecting a skin swaps which drawer is dispatched for the live Subject entity; it takes effect on the current Subject immediately (no respawn required) since it is a render-only concern — physics/behavior/charge state are untouched by the swap.
- The Subject remains draggable via the existing entity-agnostic `DragController` regardless of skin, per the v1-fix spec's §1 drag/charge disambiguation rules — those rules are skin-independent and unchanged here.
- Architecturally this is dispatch-only: a `drawSubject.ts` that reads `subjectSkin` off the entity's `behavior.data` (or content slot) and calls into `drawSubjectFigure.ts` or `drawSubjectLotus.ts`. No new entity type, no new physics, no changes to `Engine.ts`, `StateMachine.ts`, or `EntityStore.ts`.

## 2. Crowd modes (new creature types)

- `HudMode` widens from its current single value `"eyes"` to `"eyes" | "bugs" | "pointedFinger"`.
  - `"bugs"` — a cockroach crowd, per Figma node `44:287`.
  - `"pointedFinger"` — a pointing-hand crowd, per Figma node `46:905`.
- Both are **recolored into the locked Paper-Cut Protest palette** (cream/slate/sage/ink/coral) and rendered flat-illustrated with ink-line strokes, matching the existing `drawEye.ts` treatment — explicitly **not** the literal brown/skin-tone realism of the Figma reference images, which are shape/pose references only, not color references. This mirrors the same guardrail the v1-fix spec already applies to the Subject (`styleGuardrail: 'flat-illustrated'`).
- Crowd physics are **fully shared and unchanged** across all three modes. `EyeBehavior.ts` generalizes as-is (flee/idle locomotion, spring-home pursuit, drag suspension, blink-equivalent idle timers) — no physics fork per mode. Only the manifest entry's `renderType`/`rig` and the behavior's idle-animation hook differ.
- Each mode gets its own drawer — `src/render/drawers/drawBug.ts`, `src/render/drawers/drawPointedFinger.ts` — both built on the shared `src/render/paperCut.ts` utility (introduced in the v1-fix spec for `drawEye`/`drawSubject`), so all three creature types inherit the same hand-cut-edge-wobble + offset-shadow tactile quality for free, per the existing registry principle (write the shared utility once, every renderer benefits, v3 inherits it too).
- Each mode layers a **distinct idle animation** on top of the shared position/scale that `EyeBehavior` already drives:
  - Bugs: scuttle-jitter — small high-frequency position/rotation jitter, always-on (not gated by proximity to cursor), reading as constant nervous movement.
  - Pointed finger: point-and-shake — the hand orients toward the current cursor position (or the Subject, when charging) and shakes on a slower period, reading as an accusatory gesture.
  - Eyes keep their existing blink-and-track idle animation unchanged.
- Switching `HudMode` re-renders the existing live crowd roster in the new mode's visual (drawer dispatch keyed by mode), it does not respawn or reposition the crowd — physics state (position, velocity, home) carries over across a mode switch.
- Mode is selected via the existing HUD mode selector (already present in `Hud.ts`/`hudIcons.ts` for `"eyes"`), extended with click-to-cycle across all three values, same placard/icon pattern already used for `HudPower`.
- **Subject look-at rotation (all three modes).** Independent of the flee/repel translation `ForceField`/`Integrator` already drive, every crowd member continuously rotates on its own axis to face the Subject's current position — a look-at angle recomputed each tick from crowd-member position to Subject position, using the same vector math already computed for the v1-fix spec's burn-assist range/gaze-line calc (§2 of that spec), just consumed as an orientation angle instead of a line endpoint. This is additive: position still moves per existing physics unchanged; rotation is a separate value applied in each drawer's render transform.
  - Rotation **magnitude** (how much of the full look-at angle is actually applied) is a per-mode tuning constant, not a per-mode behavior fork — same registry/manifest-driven tuning pattern as everything else in this spec, not new architecture:
    - `eyes`: minimal — roughly 0.15–0.25 of the full look-at angle, a subtle tracking tilt. Eyes already communicate gaze direction via pupil rendering (`computePupilOffset`), so the body/socket needs only a slight rotational nudge on top of that, not a full turn.
    - `bugs` / `pointedFinger`: fuller — roughly 0.7–1.0 of the full look-at angle. Both silhouettes read as directional shapes (a cockroach's head/antenna axis, a pointing hand's finger axis), so the rotation must visibly swing the sprite to point/aim at the Subject for the idle animation (scuttle-jitter, point-and-shake) to land as "reacting to the Subject" rather than generic fidgeting.
  - This rotation is computed once in the shared crowd behavior tick (generalized `EyeBehavior`, keyed off Subject position, independent of `HudMode`) and read by each mode's drawer at render time, scaled by that mode's magnitude constant — the physics/behavior layer stays mode-agnostic; only the constant and the sprite's visual axis differ per drawer.

## 2a. Mode-locked power pairing

- Power is no longer an independently selected piece of state. Each `HudMode` locks to exactly one power, and switching mode switches the active power as a side effect:

  | `HudMode`       | Locked power   |
  | --------------- | -------------- |
  | `eyes`          | `laserBurn`    |
  | `pointedFinger` | `electricBurn` |
  | `bugs`          | `bugEat`       |

- **Confirmed outcome framing, one line per mode.** The charge-and-release trigger itself is not new — "click and hold subject, to power up the attack" is the existing charge-hold mechanic already spec'd in the v1-fix spec's burn-target/charge-threshold work (§§1–3 there), unchanged by this spec. What v2 adds is the mode-lock in the table above, and each mode's attack now has an authoritative one-line damage-signature description that the implementation is checked against (see §5a):
  - `eyes` → `laserBurn` → **the subject explodes.**
  - `pointedFinger` → `electricBurn` → **the subject burns.**
  - `bugs` → `bugEat` → **the subject is eaten away.**
- This replaces the independent `HudPower` selection UX described in the v1-fix work — there, power was chosen separately from mode via keyboard shortcuts (`1`/`2`/`3` in `src/main.ts`, bound to `switchPower()`/`POWER_CONFIGS`) with no relationship to the active `HudMode`. That independent-selection model is removed by this spec, not layered underneath it: there is no scenario post-v2 where a player is in `bugs` mode charging `laserBurn`, or in `eyes` mode charging `bugEat`.
- The mapping is fixed at content-authoring time (a small `Record<HudMode, HudPower>` lookup, alongside the existing `hudIcons.ts` mode/power/skin icon registries — same registry-pattern precedent, not new architecture) rather than being player-configurable. Nothing in this spec's open questions (§6) proposes remapping it.
- `HudMode`'s existing click-to-cycle mode selector (§2) is therefore also the *only* power control a player interacts with — cycling mode cycles power. The keyboard shortcuts `1`/`2`/`3` and the standalone `switchPower()`/`POWER_CONFIGS` wiring in `src/main.ts` are removed, not left as a redundant second way to reach the same three powers.
- **The existing power placard/icon in `Hud.ts`/`hudIcons.ts` is repurposed, not removed.** It stays on screen as a read-only reflection of the power the current mode has locked in (same `hud-placard__power-icon`/`hud-placard__power-label` markup, same `hudIcons.powerIcon`/`powerLabels` lookups) — useful player feedback ("what does charging do right now") — but it is never itself a click target or cycle control. `Hud.setPower()` keeps its existing signature and continues to be called, just always driven by the mode→power mapping (invoked from the same code path that handles a mode change) rather than by an independent click handler or keyboard shortcut.
- Charge/burn/drag mechanics, `PowerController`'s charge-threshold/cooldown/fire pipeline, and the three effect defs (`laserBurn`/`electricBurn`/`bugEat`) themselves are unchanged by this — only *how the active power gets selected* changes, per the existing `PowerController.setPower()` method already built to support switching between them (§5).

## 3. HUD controls: quantity and repel

Both controls are new placard-style widgets living alongside the existing mode/power selectors in `Hud.ts` / `hud.css`, following the same visual language: torn-paper card, Space Mono labels, no default browser form widgets (no `<input type=range>`, no `<select>` — hand-rolled click/drag targets styled to match the existing tear-path SVG placard).

- **Quantity control.** Adjusts how many crowd members are live, by spawning or despawning through the existing roster/registry path (`spawnEyes`/`EntityFactory` generalizes to `spawnCrowdMember`, driven by manifest entries for the active `HudMode`). Increments/decrements one member at a time on click of `+`/`−` placard buttons; despawn removes the most recently spawned or a randomly chosen live member (implementation detail for the plan to pin down) rather than disrupting drag/charge state on an in-progress interaction. Quantity has a sane minimum (at least 1 crowd member always present, so charge/burn always has an assist crowd) and a sane maximum bounded by performance (existing `ParticleSystem`/render loop headroom).
- **Repel control.** A live multiplier applied to `ForceField`'s repel strength (`FORCEFIELD.repulsionPeak`), adjustable via a placard track control (click-drag or click-step, not a native slider). Takes effect immediately on the next physics tick — no respawn, no entity rebuild. Multiplier range is bounded (e.g. a minimum that still reads as "repelled," a maximum that stays inside `Integrator`'s existing `maxSpeed` clamp so crowd members don't fly off-screen).

Both controls are crowd-wide (apply to whichever `HudMode` is currently active), not per-entity.

## 4. No-overlap rule

- `ForceField`'s pairwise repulsion (crowd-member-to-crowd-member, not just cursor-to-entity — this is new: today's `ForceField.compute` only computes cursor→entity force) gains a hard minimum-separation term: when two crowd members' centers come within the sum of their rendered radii (each member's `baseSizePx * physics.scale / 2`, i.e. touching), a strong corrective repulsion is added between that pair, on top of whatever cursor-driven repulsion is already in effect.
- This guarantees no two crowd members ever visually overlap, regardless of `HudMode`, quantity, or the repel multiplier setting from §3 — high quantity or low repel strength should never cause visible clipping between crowd members.
- This is the one deliberate, spec-mandated exception to the "never touch `ForceField.ts`" rule that the v1-fix spec establishes for registry-pattern extensions — pairwise (not just cursor-relative) repulsion cannot be added anywhere else without duplicating `ForceField`'s force-accumulation math. `Engine.ts`, `StateMachine.ts`, and `EntityStore.ts` remain untouched.
- Cost-bounded: pairwise checks are O(n²) in crowd size: acceptable at the quantities in-scope for v2 (crowd sizes stay in the tens, not hundreds), but the plan should note this as a known scaling limit rather than prematurely building spatial partitioning that v2's actual quantity range doesn't need (YAGNI).

## 5. New powers — reconciliation of already-built work

Two of the roadmap's five listed v2 powers — **electric current** and **eat** — are not new design work. They were implemented directly in the working tree ahead of any spec or plan, driven by decisions made in earlier project conversation, and are functionally complete:

- `src/powers/electricBurn.ts` — registers `electricBurnPower: Power = { id: "electricBurn", effectId: "electricBurn" }`. No custom `onPress`/`onTick`/`onRelease` — relies entirely on the generic `PowerController`/`EffectSystem` pipeline, same pattern as `laserBurnPower`.
- `src/effects/effectDefs/electricBurn.ts` — a complete 4-stage `EffectDef` (`crackle` → `flash` → `shrink` + spark-particle burst + `markDying` → `soot` particle burst + `startRespawn` 3000–6000ms), with a `electricBurnProgressAt(elapsedMs)` progress helper mirroring `laserBurnProgressAt`'s shape. Drives `entity.behavior.data.electricArc`/`flashIntensity`, which `Renderer.ts` already reads to draw a jittering coral arc from the fire-cursor to the target plus a white flash halo (`src/render/Renderer.ts` lines ~86–128).
- `src/powers/bugEat.ts` — registers `bugEatPower: Power = { id: "bugEat", effectId: "bugEat" }`, same trivial pattern.
- `src/effects/effectDefs/bugEat.ts` — a complete 4-stage `EffectDef` (`chomp1` → `chomp2` → `chomp3` + `markDying` → `digest` particle burst + `startRespawn` 2000–5000ms) driving `entity.behavior.data.bugBiteChunks` (0 → 1 → 2 → 3), which `drawEye.ts` already renders as literal bite-mark notches cut into the eye's outline (`src/render/drawers/drawEye.ts` lines ~152–178, `biteChunks` param already present on `DrawEyeInput`).
- Both powers are fully wired end-to-end: registered in `src/powers/index.ts`; `HudPower` in `src/hud/hudIcons.ts` already widened to `"laserBurn" | "electricBurn" | "bugEat"` with matching SVG icons; `src/hud/Hud.ts`'s `powerLabels` map already has `electricBurn: "shock"` / `bugEat: "eat"`; `src/input/PowerController.ts` was already generalized (added `PowerConfig` type, `setPower()`, `powerId()`, dynamic `this.power.effectId` in `fire()` — no longer hardcoded to `laserBurn`) specifically to support switching between them; `src/main.ts` currently wires both into a `POWER_CONFIGS: Record<HudPower, {...}>` map and binds them to keyboard shortcuts `2`/`3` (`1` is `laserBurn`). **This keyboard-shortcut wiring is superseded by §2a**: v2 removes the `1`/`2`/`3` listener and `switchPower()` entirely, and instead derives the active power from `HudMode` automatically. `PowerController.setPower()` and the `POWER_CONFIGS`-shaped lookup survive unchanged as the underlying mechanism — only the caller changes, from a keydown handler to the mode-change callback.
- **The one real gap:** neither power has unit test coverage. `tests/unit/laserBurn.test.ts` exists and exercises `laserBurnEffect`'s stage durations, progress-stage sequencing, and charge threshold; no equivalent `electricBurn.test.ts` or `bugEat.test.ts` exists for the other two effect defs, and no power-registration test exists for any of the three `Power` objects (`electricBurnPower`/`bugEat­Power`/`laserBurnPower`). Neither power's changes have been committed — both effect/power files are untracked, and the six supporting files they depend on (`hudIcons.ts`, `Hud.ts`, `PowerController.ts`, `main.ts`, `powers/index.ts`, `Renderer.ts`, `drawEye.ts`) are modified-but-uncommitted in the working tree.
- Nothing in this spec changes the design of these two powers — they match the roadmap's "electric current, eat" bullet as-implemented. The plan treats closing the test-coverage gap and committing the existing work as the task, not re-implementing or re-designing either power.
- **Not built, not scoped here:** ink smear, garbage, and shame stamp remain undesigned — see §6.

## 5a. Visual-distinctiveness check against the hungry-empress attack-animation bar

A separate, unrelated prototype spec — `.kilo/worktrees/hungry-empress/docs/superpowers/specs/2026-07-24-power-attack-animations-design.md` — designs the same three attack concepts (laser, electric, bug-eat) for a different game (Phaser 3, "stylized cartoony/Hollow Knight" palette, not this codebase). It is not a source of code, palette, or style to port here — Fun Satire stays canvas 2D, `EffectSystem`/`paperCut.ts`, and the locked Paper-Cut Protest palette (`--color-cream`, `--color-slate`, `--color-sage`, `--color-ink`, `--color-coral`) throughout. The one thing worth carrying over as a *bar to check against* is its design principle: each attack should read with its own distinct "damage signature" — laser as a single concentrated wound, electric as many branching wounds, bug-eat as many small wounds accumulating along a path — rather than three attacks that all just "shrink and vanish" the same way.

**The bar is now sharper than "distinct damage signature" in the abstract.** Per §2a, each mode's attack has a confirmed, authoritative one-line outcome: `eyes`/`laserBurn` → **the subject explodes**; `pointedFinger`/`electricBurn` → **the subject burns**; `bugs`/`bugEat` → **the subject is eaten away**. The check below is against these specific words, not just "does it look different from the others."

Checked against the actual implementation:

- **`bugEat` meets the bar — reads as "eaten away."** `src/effects/effectDefs/bugEat.ts`'s `chomp1`/`chomp2`/`chomp3` stages write `entity.behavior.data.bugBiteChunks` (0→1→2→3), which `src/render/drawers/drawEye.ts` (lines ~152–178) renders as literal jagged bite-mark notches cut progressively into the eye's outline. Chunks accumulate one at a time across three stages before the `digest` particle burst and respawn — the entity visibly loses pieces of itself in bites, which is exactly "eaten away," not merely "damaged." No gap.
- **`electricBurn` meets the bar — reads as "burns."** `src/effects/effectDefs/electricBurn.ts`'s `crackle`/`flash` stages write `entity.behavior.data.electricArc`/`flashIntensity`, which `src/render/Renderer.ts` (lines ~86–127) reads to draw a jittering coral polyline from the fire-cursor to the target plus a white flash halo — that much is "electrical," not yet "burning" on its own. The deciding evidence is the *following* `soot` stage (`ELECTRIC_BURN.sootMs`, `onStart`): it spawns 20 particles colored alternately `PALETTE.ink`/`#3A3028` (a dark char-brown, off the arc's coral), drifting upward-and-out at a shallow angle — a dedicated soot/char-residue burst, deliberately recolored away from the spark stage's coral to read as burnt matter rather than more electricity. So this is not "purely arc/flash with no burn-mark residue" (the case that would have been a gap) — it already has char-colored residue distinct from its own spark-stage color. No gap.
- **`laserBurn` does not meet the bar — does not read as "explodes."** Two compounding problems, both confirmed by direct read of `laserBurn.ts` and `Renderer.ts`:
  1. **No beam is drawn at all.** `laserBurn.ts`'s four stages (`glow`→`line`→`shrink`→`dissolve`) are stage *names* only — every stage's `update()` touches nothing but `entity.physics.scale`. Grep confirms (`grep -rni "laser" src` has zero matches under `src/render/`): there is no beam, no line, no glow drawn anywhere, so there is no visible moment of impact to explode *from*.
  2. **The ending is a delayed fade, not a burst.** The `shrink` stage (100ms) animates `physics.scale` from ~0.64 down to `0` — by the time it ends, the entity is already fully invisible. Only then does the `dissolve` stage's `onStart` spawn the 28-particle ash burst, at a position where nothing is visible anymore. The actual sequence a player sees is: shrink to nothing → beat → ash appears. That reads as a fade/dissipate, not a sudden burst — the opposite of "explodes."

  Neither problem is fixed by the other: even a straight coral beam (closing gap 1) landing on an entity that then quietly shrinks and only pops ash after going invisible (gap 2) would still not read as an explosion — the beam would land on nothing.

**Finding: needs a polish task**, and the fix has to close both gaps together, not just add a beam:

1. Give `laserBurn` its own dedicated per-frame beam/glow visual during `glow`/`line` (a straight coral-to-ink beam from the fire-cursor to the target, contrasted with `electricBurn`'s jittered, branching polyline — steady vs. jittering is what reads as "concentrated" rather than "branching"), following the exact pattern already established by `electricArc`/`flashIntensity` in `Renderer.ts` lines ~86–127.
2. Retime the ash-particle burst to fire at the instant the beam lands (`shrink.onStart`, when the entity begins dying) rather than after it has already shrunk to invisible in `dissolve.onStart` — and add a brief, bright impact flash at that same instant, larger/hotter than `electricBurn`'s existing spark-flash, so the ending reads as a sudden pop-and-burst ("the subject explodes") instead of a shrink followed by a delayed puff of ash.

Both stay inside the existing `EffectDef`/`Renderer.ts` architecture and the locked palette — no new stages, no new architecture, no hungry-empress code or style ported. See the plan's Task 14 for the implementation.

## 6. Open design questions for v2

Per the umbrella spec's own "Open design questions for v2" pattern, the following roadmap items were **not** discussed or decided in the conversation this spec is drawn from, and this document deliberately does not invent designs for them:

- **Ink smear** power — visual treatment, target (Subject only, like burn/shock/eat? or crowd-wide?), duration/stages undecided.
- **Garbage** power — mechanic entirely undecided (thrown projectile? screen-covering overlay? crowd-reaction trigger?).
- **Shame stamp** power — visual/mechanic entirely undecided.
- **"Change minister/logo" universal control** — undecided whether this swaps the Subject's `"figure"` skin's rendered identity, introduces a third Subject skin, or is a separate HUD-level control unrelated to the Subject entity. Also undecided: what pool of alternates it cycles through, and whether alternates need new manifest entries or are purely cosmetic recolors.
- Whether quantity/repel controls (§3) should be scoped as v2-only crowd controls or promoted to "universal controls" applying beyond the crowd (e.g. to future v3 roster members) is left for v3 planning.

These should be designed and speced separately, immediately before the work on them begins, per the umbrella spec's own versioning discipline.

## Relationship to existing specs

This spec builds on, and does not restate or override, two prerequisite specs, both of which must be implemented first:

- `docs/superpowers/specs/2026-07-23-fun-satire-design.md` — the locked umbrella roadmap. This spec fills in the "v2 — Expansion" bullet from that document's roadmap section at implementation-ready detail, for the subset of v2 actually decided (Subject skins, crowd modes, the two already-built powers, quantity/repel controls, no-overlap physics). All locked decisions in the umbrella spec (stack, rendering approach, content-as-data/registry principles, visual identity tokens, HUD placement, motion principle, touch/mobile posture, content guardrail) remain unchanged and in force here.
- `docs/superpowers/specs/2026-07-24-subject-mechanic-and-visual-polish-design.md` — the v1-fix spec establishing the Subject entity, its charge/burn/drag/respawn lifecycle, the shared `paperCut.ts` rendering utility, and the "never touch `Engine.ts`/`ForceField.ts`/`StateMachine.ts`/`EntityStore.ts`" registry-extension discipline. This spec's Subject-skin work (§1) is a pure extension of that spec's Subject architecture, and this spec's no-overlap rule (§4) is the one deliberate, spec-mandated exception to that discipline's `ForceField.ts` restriction.

**Concretely, "must be implemented first" means: v2 implementation cannot begin until `https://github.com/abhisxn/fun-satire/pull/2` ("Add merged eyes design dummy prototype") merges to `main`.** That PR is currently open, not merged, and it carries the entire v1 scaffold plus the v1-fix Subject-mechanic spec's Subject entity/lifecycle code — none of which exists on `main` today. Since this spec's crowd-mode and mode-locked-power work (§2, §2a) extends that Subject entity/lifecycle code directly, there is no branch point to start v2 work from until PR #2 lands.

As with the v1-fix spec's own relationship to the umbrella spec, the actual implementation plan for this v2 scope is written and approved separately — see `docs/superpowers/plans/2026-07-25-fun-satire-v2-expansion.md`.
