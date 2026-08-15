# Fun Satire — Premium Visual & Collective Attack (PR1) — Design Spec

Status: ready for implementation planning. Extends `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md`, `docs/superpowers/specs/2026-07-25-subject-browser-premium-hud-design.md`, and `docs/superpowers/specs/2026-07-25-fun-satire-audio-design.md`, all of which are already merged. This is PR1 of a two-PR overhaul; PR2 (`docs/superpowers/specs/2026-07-27-multi-subject-targeting-design.md`, written separately at PR2 kickoff) covers the structural multi-subject/lock-mechanic change that builds on top of what this spec ships.

## Design references

Figma file (`Untitled`, `oPAdd7oWLQVMTP1v6pJOW0`), 6 nodes reviewed:

- [Page 1](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=0-1)
- [Frame 18:113](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=18-113) — control-bar layout
- [Frame 44:287](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=44-287) — avatar sticker-sheet gallery
- [Frame 46:905](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=46-905)
- [`Component 1` (103:2490)](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=103-2490) — 9 exportable 24×24 SVG control-bar icons
- [Node 109:3669](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=109-3669) — **laser-attack collective-beam reference** (see §2)

Pinterest mood board: `in.pinterest.com/abhisxn/attacks` (11 pins) — glow/bloom-treatment neon VFX (electric arcs, laser beams, fire rings, explosion sequences), sourced from animation/VFX community boards. Confirms the attack visuals need a light-emission treatment layered on top of the existing flat palette, not a palette change.

## Context

The v2 expansion / subject-browser-premium-hud / audio specs shipped the crowd modes, mode-locked powers, the illustrated/text `subjectSkin` split, and a synthesized-audio engine — but attack effects are barely visible today: `laserBurn` draws one hardcoded fixed line from canvas top-center (not from any eye), and `electricBurn`/`bugEat` render zero visual beyond a particle burst. The HUD chrome and subject roster also read as functional, not premium.

**This spec does not change:** crowd modes, mode-locked power pairing, quantity/repel mechanics, the no-overlap rule, `PowerController`'s target-id parameterization, or — critically — the **singleton-subject model**. Multi-subject spawning, drag-to-place (replacing swap), tap-to-lock, and `lockedSubjectId` are explicitly out of scope here and land in PR2. Every avatar/text/formatting feature below applies to the one existing Subject entity.

**Closed-file touch:** none. `ForceField.ts`, `Engine.ts`, `StateMachine.ts`, and `EntityStore.ts` are untouched by this spec.

## 1. `EffectStage.visual` schema generalization

`EffectSystem.ts`'s `EffectStage.visual` widens from `Record<string, number | string>` to a typed discriminated shape:

```ts
type EffectVisual = {
  archetype: "beam" | "arc" | "bite" | "glow";
  color: string;
  opacity: number;
  widthPx?: number;
  radiusPx?: number;
  jitterPx?: number;
};
```

All three existing effect defs (`laserBurn.ts`, `electricBurn.ts`, `bugEat.ts`) update their stage literals to this shape — `laserBurn`/`electricBurn` use `"beam"`/`"arc"` respectively (plus a `"glow"` stage for the shared impact flare), `bugEat` uses `"bite"`. This is what makes §2's renderer data-driven instead of string-matching `effect.defId`.

## 2. Generic collective-effect visual renderer

Replaces the `if (effect.defId !== "laserBurn") continue` special case in `Renderer.ts` entirely.

**Contributor selection** (`src/effects/collectiveContributors.ts`): `selectCollectiveContributors({ crowd, targetPos, archetype, maxContributors })`.

- Per the `109:3669` reference — dozens of thin rays from eye pupils *and* bugs across the **entire** grid (including corner-of-grid entities) converge on one white-hot burst at the target — the `"beam"` archetype does **not** distance-filter contributors. It selects up to `maxContributors` (~24, tuned for legibility at a 60-count crowd) from the whole live crowd, not just nearby ones.
- `"arc"`/`"bite"` keep the existing nearby-only `isWithinBurnAssistRange` filter from `EyeBehavior.ts` — these read as closer-quarters attacks in the mood board, unlike the beam's whole-grid convergence.
- `maxContributors` is a hard perf cap regardless of archetype. Only one effect is ever live at a time (`PowerController` serializes attacks), so cost stays O(cap), not O(crowd).

**Drawer** (`src/render/drawers/drawCollectiveEffectVisual.ts`), dispatched by `visual.archetype`:

- **`"beam"`**: per contributor, a two-pass stroke from the eye/bug position to the target — a wide, low-alpha outer stroke (bloom) plus a thin, high-alpha inner stroke (core), hot-pink/magenta family (`#ff3d7f`-ish) matching `109:3669`. **Not** `ctx.shadowBlur` per stroke — up to 24 simultaneous `shadowBlur` calls is a real frame-cost risk. The layered-stroke technique is the cheap equivalent, and mirrors how `paperCut.ts` already fakes soft shadows elsewhere in this codebase.
- **`"arc"`**: jittered zigzag per contributor, same two-pass glow-stroke technique, distinct color (electric blue/white) so it reads as a different attack from the pink beam.
- **`"bite"`**: a snapping chomp mark per contributor near the target — no glow, since this is close-quarters, not light-emission.
- **`"glow"`**: one shared radial-gradient white→pink burst flare at the target point, drawn once (not per-contributor), reusable by any archetype needing an impact flare — `"beam"` uses it under the beam endpoints; `"arc"`/`"bite"` may opt in later.

**Determinism constraint:** arc jitter comes from a small local deterministic hash keyed on `(contributor.id, stageIndex, quantized time)` — **never** the shared `Rng` instance. That `Rng` is seeded once and shared across `ParticleSystem`/`RespawnScheduler`/entity spawn; extra `rng.float()` calls during render would perturb seeded gameplay draws.

This is also where a future VFX sprite pack (§8) plugs in: each archetype can composite a small looping sprite-sheet frame per contributor instead of (or blended with) the hand-drawn primitives above, using the same image-cache module §4 builds for avatars.

## 3. Randomized crowd sizing

Eyes/bugs/pointed fingers spawn at one of four randomized discrete sizes — **XL / L / M / S** — while keeping the existing grid-based placement (position stays deterministic; only per-entity scale varies).

- A `sizeScale` lookup, e.g. `{ xl: 1.4, l: 1.15, m: 1.0, s: 0.8 }` (tuned during implementation), chosen via the existing seeded `Rng` at spawn time in `EntityFactory.ts`'s crowd-spawn path.
- Stored alongside the entity (e.g. `content.scale` or `behavior.data.sizeClass`) and read by the drawers/physics everywhere entity radius is already used for hit-testing and draw — no new radius-computation path.
- No grid/placement-logic changes, no closed-file touch (`ForceField.ts`'s separation math already reads per-entity radius as an input, not a constant).

## 4. Avatar image pipeline

- **`src/render/imageAssets.ts`**: `ImageAssetCache` class (same "instantiated once in `main.ts`" pattern as `AudioEngine`/`ParticleSystem`). `get(url)` returns `{ status: "loading" | "ready" | "error", image? }` and lazily kicks off `new Image()` loading on first call; `preload(urls)` warms the curated set up front.
- **`src/hud/avatarAssetRegistry.ts`**: `AVATAR_ASSET_REGISTRY: readonly { id, label, url, aspect }[]` — same array-registry shape as `SUBJECT_SKIN_REGISTRY`. Files live in `public/avatars/*` (matching the existing `public/audio/music-bed.mp3` convention).
- **`src/render/drawers/drawSubjectAvatar.ts`**: uses `paperCut.ts`'s shadow/edge utilities for the frame, `ctx.drawImage` once `ImageAssetCache` reports `"ready"`, and a flat placeholder silhouette (never a broken-image icon) while `"loading"` or on `"error"`.
- **`src/hud/subjectSkinRegistry.ts`**: `SubjectSkin` gains a third variant, `{ kind: "avatar"; assetId: AvatarAssetId }`. `drawSubject.ts`'s dispatcher adds the matching branch.
- **ADR 009** (new, authored in Phase D — see §7 of the plan doc): amends ADR 008, widening the `styleGuardrail` schema gate to admit curated pre-authored illustrated stickers (SVG/PNG, cartoon/caricature — never photoreal, never doctored photos, never hate iconography) alongside the existing procedural-drawer path. `content/schema.ts` + `manifestLoader.ts` add a `{ styleGuardrail: "curated-avatar"; assetId }` branch to `SubjectVisual`; the validator checks `assetId` resolves in `AVATAR_ASSET_REGISTRY` instead of running procedural color validation.

## 5. Text formatting

`{kind:"text"}` `SubjectSkin` gains optional `fontId` and `align` fields (both optional, so existing persisted text subjects keep working under today's hardcoded defaults: `FONT.mono`, `textAlign: "center"`).

- **`src/hud/textFontRegistry.ts`**: a curated font list — `Space Mono` (existing), `Fraunces` (existing display font), plus one new curated display font added as a self-hosted `@fontsource/...` package. Same array-registry shape as every other registry in this codebase.
- **`drawSubjectText.ts`**: the two hardcodes become registry/prop-driven — `fontId` looks up a font-family string via `textFontRegistry.ts`, `align` drives `ctx.textAlign` (left/center/right).

## 6. HUD / control-bar and subject browser

- **`src/hud/Hud.ts` + `hud.css`**: add a drag handle, visibility toggle, hand tool, T (text) tool, grid (browse) tool, and an ATTACK CTA button, per the Figma control-bar layout (`18:113`, `103:2490`). The CTA reuses the exact same `PowerController.tryPress(subjectId, ...)`/`release(...)` calls the existing hover-charge path already makes — zero `PowerController.ts` changes. Icons export directly from the Figma `Component 1` frame (`103:2490`) — no third-party icon library needed.
- **`src/hud/SubjectDrawer.ts`**: new avatar card-grid section (same `SUBJECT_SKIN_REGISTRY.forEach`-style pattern, sourced from `AVATAR_ASSET_REGISTRY`), plus text formatting controls — a font-family segmented control (`textFontRegistry.ts`), an alignment segmented control (left/center/right), and an expanded size scale (3 steps → ~6).
- The premium visual-bar principles already established in the subject-browser-premium-hud spec (§6 there: paper-stack depth, spring-physics motion, thin-line iconography, breathing room, staggered reveal, tactile press feedback) apply to every new control introduced here — no new visual materials, same locked palette.

## 7. Audio layering

- **`src/audio/AudioEngine.ts`**: `AudioBus` widens to `"music" | "sfx" | "ambient"`.
- **`src/audio/ambientBedTrack.ts`** (new): `startAmbientBedTrack(engine, url)` — same fetch→decode→loop shape as the existing `musicBed.ts`, connected to the new `"ambient"` bus so it mixes independently (quieter, under the music bed). The existing synthesized `ambientBeds.ts` textures (bugs/pointedFinger) stay unchanged, now layering under the real bed.
- Attack SFX enhancement (envelope/layering punch-up) is entirely inside `src/audio/cues/*.ts` — no interface changes, since cue definitions are already fully data-driven per-stage.

## 8. Asset acquisition — recommendation

Not a locked decision — flagged for a quick confirm/adjust at PR1 kickoff (account/budget approval happens outside this planning process):

- **Attack VFX overlays**: a premium sprite-sheet pack from **CraftPix** or **GameDevMarket** (one-time commercial license, no attribution, sci-fi/magic VFX categories match the mood board). If unlimited on-brand variants are wanted later, **Scenario.gg** custom-trained on the mood board is the fallback — start with a purchased pack since it's cheaper and immediate.
- **Avatar sticker sheet**: a curated flat-illustration character pack from **IconScout** or **GetIllustrations** (commercial, no-attribution tier), filtered to ADR 009's cartoon/caricature-only constraint.
- **Audio**: one **Zapsplat Premium** subscription covers both enhanced attack-SFX layering (sci-fi/electric/impact categories) and the cinematic ambient bed (dark ambient/drone categories) — one license instead of juggling multiple sources.

§2's beam/arc/bite visuals ship first with the layered-stroke Canvas2D technique described there (no asset dependency); a sprite pack is a drop-in enhancement, not a blocker for this spec's completion.

## Open questions

- Exact tuning values for `sizeScale` (§3), `maxContributors` (§2), and the beam/arc color hex values are implementation-detail gaps, not mechanism gaps — pin down during Phase A/B.
- Whether the curated third display font (§5) is chosen before or during implementation is an open content decision, not a mechanism gap.
- Asset-library purchase decisions (§8) require user/budget sign-off outside this document.

## Relationship to existing specs

- `docs/superpowers/specs/2026-07-25-fun-satire-v2-expansion-design.md` — prerequisite; mode/power/quantity/repel mechanics are unchanged here.
- `docs/superpowers/specs/2026-07-25-subject-browser-premium-hud-design.md` — prerequisite; this spec extends `SubjectSkin` with a third (`avatar`) variant and widens the `text` variant's fields, keeping that spec's render-only-swap architecture intact. Its §6 premium-visual-bar principles are reused, not redefined, here.
- `docs/superpowers/specs/2026-07-25-fun-satire-audio-design.md` — prerequisite; this spec adds the `"ambient"` bus and a real bed track on top of that spec's engine, without changing its synthesized-cue architecture.
- `docs/superpowers/specs/2026-07-27-multi-subject-targeting-design.md` (PR2, written separately) — builds directly on this spec's avatar/text/formatting foundation once it exists; PR2 does not modify anything this spec introduces except to iterate the single Subject into a collection.
