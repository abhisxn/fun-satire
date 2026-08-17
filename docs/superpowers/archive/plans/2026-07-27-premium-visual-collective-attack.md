# Fun Satire — Premium Visual & Collective Attack (PR1) — Implementation Plan

> **For agentic workers:** This plan executes via **Kilo Code's Agent Manager** (git-worktree-per-agent, kanban To Do/Doing/Done board) — each Task below is one Agent Manager card; each Phase B/C lane is one worktree/branch, per the naming convention in the orchestration section at the end of this document. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks 7, 8, 10, and 11 open with a **Step 0: Showcase & selection gate** (see the dedicated section below, right before Phase B) — do not let an agent skip it or auto-pick a variant; the decision it gates is a visual/audio judgment call a test cannot verify, and it's expensive to unwind once downstream tasks build on the wrong choice.

## Goal

Ship PR1 of the premium visual/collective-attack overhaul: a generic, data-driven collective-effect visual renderer (replacing the `laserBurn`-only special case), randomized crowd sizing, a full avatar image pipeline, text formatting controls, HUD/control-bar restyle, and audio layering (ambient bus + real bed track) — all applied to the still-singleton Subject entity. Multi-subject targeting is explicitly out of scope (PR2).

## Architecture

New modules: `src/effects/collectiveContributors.ts` (contributor selection, pure function), `src/render/drawers/drawCollectiveEffectVisual.ts` (archetype-dispatched drawer), `src/render/imageAssets.ts` (`ImageAssetCache`), `src/hud/avatarAssetRegistry.ts`, `src/hud/textFontRegistry.ts`, `src/render/drawers/drawSubjectAvatar.ts`, `src/audio/ambientBedTrack.ts`. Modified: `EffectSystem.ts` (`EffectStage.visual` schema), `Renderer.ts` (remove `laserBurn` special case, dispatch to the new drawer), `laserBurn.ts`/`electricBurn.ts`/`bugEat.ts` (stage literals), `subjectSkinRegistry.ts` (avatar variant, text font/align fields), `content/schema.ts` + `manifestLoader.ts` (ADR 009 fields), `EntityFactory.ts` (size-randomization lookup), `drawSubject.ts` (avatar branch), `drawSubjectText.ts` (font/align props), `AudioEngine.ts` (ambient bus), `Hud.ts` + `hud.css` (chrome), `SubjectDrawer.ts` (avatar section + text formatting UI).

## Tech Stack

TypeScript 5.x, Vite, Canvas2D, Web Audio API, vitest (+ `happy-dom` for HUD component tests).

## Prerequisite

`docs/superpowers/specs/2026-07-27-premium-visual-collective-attack-design.md` (this plan's spec) and its three prerequisite specs (`v2-expansion`, `subject-browser-premium-hud`, `fun-satire-audio-design`) — all already merged. This plan assumes those contracts exist as documented there. **Naming discipline**: if the real code differs from a name used below when a task actually starts (e.g. an entity field was renamed since these specs were written), use the real name — do not invent a parallel variable to match this document.

## Global Constraints

- No new colors, fonts, or blend-mode/CSS-filter effects beyond what's explicitly specified (layered-stroke glow, not `ctx.shadowBlur`, not CSS `filter: blur`).
- `ForceField.ts`, `Engine.ts`, `StateMachine.ts`, `EntityStore.ts` are untouched by every task in this plan.
- Arc jitter and any other per-frame render randomness MUST use a local deterministic hash, never the shared seeded `Rng` instance.
- The old `laserBurn`-only special-case branch in `Renderer.ts` is removed entirely once the generic dispatcher lands — not left in place alongside it.
- Every task that touches `physics/`, `render/`, `effects/`, or `hud/` gets a human `npm run dev` check before being marked done, per project convention — not deferred to phase end.
- `npm test` must stay green after every task; `npm run build` (typecheck) must pass before any phase's work merges.

## Showcase & Selection Gates

Tasks 7, 8, 10, and 11 each implement something a test cannot verify — it looks or sounds right, or it doesn't. A "two-pass stroke glow" or a "curated display font" reads as reasonable in a diff and still lands cheap, off-tone, or flatly wrong on screen/in-ear. Text specs and code review both under-catch this class of mistake, so the decision stays with the person who has to live with the result, not the implementing agent.

Each of those four tasks opens with a **Step 0** that produces one small, self-contained, throwaway HTML file — not committed under `src/`, saved to `docs/superpowers/showcases/<topic>.html` — presenting 3-4 concrete candidate variants side by side:

- **Visual archetypes** (Task 7): each candidate is a live `<canvas>` rendering the actual beam/arc/bite/glow drawing code (or a close variant of it) at a few different color/width/glow-technique settings, labeled A/B/C/D, animating or replayable on click.
- **Avatar style** (Task 8): a static image grid of 3-4 candidate placeholder/sticker directions (illustration style, line weight, palette treatment), labeled, with a one-line rationale per option.
- **Font pairing** (Task 10): each candidate renders sample subject text in the real `drawSubjectText.ts` canvas path (not just a CSS `<p>` — the actual rendering pipeline) at a few font/size/align combinations.
- **Audio** (Task 11): `<audio>` elements per candidate — ambient bed options and SFX-envelope variants — playable directly in the file, with a short label for what changed between them.

No build step, no framework, no dependency on any Claude-specific artifact tooling — since this executes under Kilo Code, open the file directly in a browser or VS Code's built-in preview.

**The gate is hard, not a suggestion.** The task's implementer does not proceed past Step 0 until the user has picked a variant by label ("B", "the second beam"). Only the selected variant gets wired into the real `src/` implementation in the steps that follow. A task marked done without a recorded selection is incomplete — treat it the same as a task with a failing test, not as a minor process skip.

This is also the natural checkpoint for the asset-acquisition question (spec §8): if Task 8 or 11's candidates are all built from free/placeholder sources and none clears the "premium" bar, that's the signal to pause and make the real CraftPix/IconScout/Zapsplat purchase decision before wiring anything further — not something for an agent to decide silently by shipping the best of a weak set.

---

## Phase A: Schema Foundation (serial)

### Task 1: Generalize `EffectStage.visual` and update effect defs

**Files:**
- Modify: `src/effects/EffectSystem.ts`, `src/effects/effectDefs/laserBurn.ts`, `src/effects/effectDefs/electricBurn.ts`, `src/effects/effectDefs/bugEat.ts`
- Test: `tests/unit/EffectSystem.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `EffectVisual` type (`{ archetype: "beam"|"arc"|"bite"|"glow"; color: string; opacity: number; widthPx?: number; radiusPx?: number; jitterPx?: number }`), exported from `EffectSystem.ts`. Consumed by Task 2 (Phase B Lane 1) and by the three effect defs modified here.

`EffectStage.visual` today is `Record<string, number | string>`; this task gives it the typed shape above so `Renderer.ts` can dispatch on `visual.archetype` instead of `effect.defId` string-matching (Task 4).

- [ ] Step 1: Write a failing test asserting `laserBurn`'s stages each carry a `visual.archetype` of `"beam"` or `"glow"` with valid `color`/`opacity`, and that `EffectStage.visual` rejects an object missing `archetype`.
- [ ] Step 2: Run `npx vitest run tests/unit/EffectSystem.test.ts` — verify it fails (current stage literals don't have `archetype`).
- [ ] Step 3: Add the `EffectVisual` type to `EffectSystem.ts`, retype `EffectStage.visual: EffectVisual`. Update `laserBurn.ts` stages to `{archetype:"beam", color:"#ff3d7f", opacity:0.85, widthPx:2}` (+ a `"glow"` stage at impact), `electricBurn.ts` to `{archetype:"arc", color:"#4de3ff", opacity:0.8, jitterPx:6}`, `bugEat.ts` to `{archetype:"bite", color:"#2a2a2a", opacity:1}`. Exact hex/opacity values are tunable during implementation per the spec's Open Questions.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run `npx vitest run` (full suite) — verify no regressions in effect-timeline tests.
- [ ] Step 6: Commit: `git add src/effects/EffectSystem.ts src/effects/effectDefs/laserBurn.ts src/effects/effectDefs/electricBurn.ts src/effects/effectDefs/bugEat.ts tests/unit/EffectSystem.test.ts && git commit -m "feat(effects): generalize EffectStage.visual to typed archetype shape"`

### Task 2: Extend `SubjectSkin` with avatar variant and text font/align fields

**Files:**
- Modify: `src/hud/subjectSkinRegistry.ts`
- Test: `tests/unit/subjectSkinRegistry.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SubjectSkin` widened to include `{kind:"avatar", assetId: AvatarAssetId}`; `{kind:"text"}` gains optional `fontId?: string`, `align?: "left"|"center"|"right"`. Consumed by Task 8 (`drawSubject.ts` avatar branch), Task 9 (`drawSubjectAvatar.ts`), Task 7 (`drawSubjectText.ts`), Task 13 (`SubjectDrawer.ts`).

`AvatarAssetId` is a placeholder string type here (`type AvatarAssetId = string`) — Task 6 (Phase B Lane 2) introduces the real `AVATAR_ASSET_REGISTRY` this widens against; this task only needs the shape to exist so downstream lanes can type against it without a Phase-crossing dependency loop.

- [ ] Step 1: Write a failing test asserting a `{kind:"avatar", assetId:"jester-sticker"}` value type-checks as `SubjectSkin`, and that an existing `{kind:"text", value:"hi", scale:1}` (no `fontId`/`align`) still type-checks (backward compatibility).
- [ ] Step 2: Run `npx vitest run tests/unit/subjectSkinRegistry.test.ts` — verify it fails to compile/fails assertion.
- [ ] Step 3: Widen the `SubjectSkin` union and add the optional fields.
- [ ] Step 4: Run the test — verify it passes. Run `npm run build` to confirm no downstream type errors from the widened union (exhaustiveness checks in `drawSubject.ts`'s switch will need a case added — expected, addressed in Task 8).
- [ ] Step 5: Commit: `git add src/hud/subjectSkinRegistry.ts tests/unit/subjectSkinRegistry.test.ts && git commit -m "feat(hud): widen SubjectSkin with avatar variant and text font/align fields"`

### Task 3: ADR 009 schema fields — `SubjectVisual` curated-avatar branch

**Files:**
- Modify: `src/content/schema.ts`, `src/content/manifestLoader.ts`
- Test: `tests/unit/manifestLoader.test.ts`

**Interfaces:**
- Consumes: `AvatarAssetId` shape from Task 2.
- Produces: `SubjectVisual` gains `{styleGuardrail:"curated-avatar", assetId}` branch. Consumed by content manifests going forward (no existing manifest needs migration — this is additive).

- [ ] Step 1: Write a failing test: a manifest entry with `styleGuardrail:"curated-avatar"` and a valid `assetId` string passes `manifestLoader` validation; one with `styleGuardrail:"curated-avatar"` and no `assetId` fails with a clear error.
- [ ] Step 2: Run `npx vitest run tests/unit/manifestLoader.test.ts` — verify it fails (branch doesn't exist yet).
- [ ] Step 3: Add the branch to `schema.ts`'s `SubjectVisual` union; add the corresponding validation case to `manifestLoader.ts` (checks `assetId` is a non-empty string — full registry-resolution validation is deferred to Task 6 once `AVATAR_ASSET_REGISTRY` exists, since `manifestLoader.ts` shouldn't import a HUD-layer registry).
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/content/schema.ts src/content/manifestLoader.ts tests/unit/manifestLoader.test.ts && git commit -m "feat(content): add curated-avatar styleGuardrail branch (ADR 009 schema)"`

### Task 4: `AudioEngine` ambient bus

**Files:**
- Modify: `src/audio/AudioEngine.ts`
- Test: `tests/unit/AudioEngine.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AudioBus = "music"|"sfx"|"ambient"`, a gain node for the new bus wired the same way `"music"`/`"sfx"` already are. Consumed by Task 10 (`ambientBedTrack.ts`).

- [ ] Step 1: Write a failing test asserting `AudioEngine` exposes a gain node (or equivalent volume-control handle) for `"ambient"` alongside the existing two buses.
- [ ] Step 2: Run `npx vitest run tests/unit/AudioEngine.test.ts` — verify it fails.
- [ ] Step 3: Add the third bus, following the exact construction/routing pattern of the existing two.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/audio/AudioEngine.ts tests/unit/AudioEngine.test.ts && git commit -m "feat(audio): add ambient bus to AudioEngine"`

### Task 5: Crowd size randomization

**Files:**
- Modify: `src/entities/EntityFactory.ts`
- Test: `tests/unit/EntityFactory.test.ts`

**Interfaces:**
- Consumes: existing seeded `Rng` (passed into `EntityFactory`'s spawn functions already).
- Produces: each spawned crowd entity (eye/bug/pointedFinger) carries a `sizeScale` number, read wherever entity radius is already used for hit-testing/draw.

```ts
const SIZE_SCALES = { xl: 1.4, l: 1.15, m: 1.0, s: 0.8 } as const;
type SizeClass = keyof typeof SIZE_SCALES;

function pickSizeClass(rng: Rng): SizeClass {
  const classes: SizeClass[] = ["xl", "l", "m", "s"];
  return classes[Math.floor(rng.float() * classes.length)];
}
```

- [ ] Step 1: Write a failing test: spawning N crowd entities with a fixed-seed `Rng` produces a `sizeScale` on each entity drawn from `{1.4, 1.15, 1.0, 0.8}`, with grid position unaffected (position assertions match today's fixture exactly).
- [ ] Step 2: Run `npx vitest run tests/unit/EntityFactory.test.ts` — verify it fails (no `sizeScale` field exists yet).
- [ ] Step 3: Implement `pickSizeClass`/`SIZE_SCALES` in `EntityFactory.ts`, call it once per spawned crowd entity in the existing grid-spawn loop, store the result as `content.scale` (or `behavior.data.sizeClass`, whichever the real `Entity` shape supports without a closed-file touch — confirm against current `Entity.ts` at task start).
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run full suite; run `npm run dev` — visually confirm the crowd shows visibly varied sizes while grid alignment holds.
- [ ] Step 6: Commit: `git add src/entities/EntityFactory.ts tests/unit/EntityFactory.test.ts && git commit -m "feat(entities): randomize crowd member size at spawn"`

---

## Phase B: Parallel Lanes (depend on Phase A; disjoint files, one worktree per lane)

### Lane 1 — Collective effect renderer

#### Task 6: `collectiveContributors.ts`

**Files:**
- Create: `src/effects/collectiveContributors.ts`
- Test: `tests/unit/collectiveContributors.test.ts`

**Interfaces:**
- Consumes: `EffectVisual` (Task 1), live crowd entity list, `isWithinBurnAssistRange` (existing, from `EyeBehavior.ts`).
- Produces: `selectCollectiveContributors({crowd, targetPos, archetype, maxContributors}): Contributor[]`. Consumed by Task 7.

- [ ] Step 1: Write a failing test: for `archetype:"beam"`, a crowd of 60 entities scattered across the full grid (including far corners) yields up to `maxContributors` contributors regardless of distance to `targetPos`; for `archetype:"arc"`/`"bite"`, only entities within `isWithinBurnAssistRange` are eligible, capped at `maxContributors`.
- [ ] Step 2: Run `npx vitest run tests/unit/collectiveContributors.test.ts` — verify it fails.
- [ ] Step 3: Implement `selectCollectiveContributors` — branch on `archetype`, no range filter for `"beam"`, existing range filter reused for `"arc"`/`"bite"`, cap applied last in both branches.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/effects/collectiveContributors.ts tests/unit/collectiveContributors.test.ts && git commit -m "feat(effects): add collective contributor selection"`

#### Task 7: `drawCollectiveEffectVisual.ts` + `Renderer.ts` dispatch

**Files:**
- Create: `src/render/drawers/drawCollectiveEffectVisual.ts`
- Modify: `src/render/Renderer.ts`
- Test: `tests/unit/drawCollectiveEffectVisual.test.ts`

**Interfaces:**
- Consumes: `Contributor[]` (Task 6), `EffectVisual` (Task 1).
- Produces: `drawCollectiveEffectVisual(ctx, contributors, targetPos, visual)`, dispatched from `Renderer.ts` by `visual.archetype` in place of the deleted `defId === "laserBurn"` branch.

Deterministic jitter for `"arc"`:

```ts
function jitterHash(id: string, stageIndex: number, quantizedTimeMs: number): number {
  let h = 0;
  const s = `${id}:${stageIndex}:${quantizedTimeMs}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0) / 0xffffffff; // [0, 1)
}
```

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/collective-effect-visuals.html` with 3-4 labeled `<canvas>` candidates for the `"beam"` archetype (color/width/glow-technique variations on the two-pass stroke) and 2-3 candidates each for `"arc"`/`"bite"`/`"glow"`. Present to the user; do not proceed until they've picked a variant per archetype by label.
  - **Reference note:** `public/Reference/` holds three additional AI-generated reference images reviewed 2026-07-27 (finger/arc lightning, eye/beam lasers, bug/bite swarm) that partly **conflict** with spec §2's Figma-sourced (`109:3669`) color/impact assumptions — the beam reference there is red/crimson with a fire-glow impact, not spec's hot-pink/magenta with a white→pink burst; the bite reference shows full physical swarm-coverage of the target, more literal than spec's "chomp mark" description; the arc reference confirms spec's blue/white color and adds a cracked-crater impact detail not yet in the spec. Do not pre-resolve this conflict in code — include candidates spanning **both** the Figma-sourced palette and the `public/Reference/` palette (per archetype) in this showcase, and let the user's Step 0 pick settle which one ships.
- [ ] Step 1: Write a failing test asserting: `"beam"` draws two strokes per contributor (wide low-alpha + thin high-alpha, using the selected variant's exact color/width) plus one shared `"glow"` radial-gradient flare at the target, drawn once regardless of contributor count; `"arc"` produces different jitter offsets per contributor but identical offsets across repeated calls with the same `(id, stageIndex, quantizedTime)` (determinism check — mock `ctx` and assert call args, not the shared `Rng`'s call count, which must stay zero).
- [ ] Step 2: Run `npx vitest run tests/unit/drawCollectiveEffectVisual.test.ts` — verify it fails.
- [ ] Step 3: Implement the drawer using the Step 0-selected variant's exact parameters (no `ctx.shadowBlur`, shared glow drawn once). Remove the `if (effect.defId !== "laserBurn") continue` block in `Renderer.ts`; replace with a call into `selectCollectiveContributors` + `drawCollectiveEffectVisual` keyed on each active effect stage's `visual.archetype`.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run full suite; run `npm run dev` — trigger all three attacks (laser/electric/bite), visually confirm beams originate from multiple crowd members (not one fixed line), arcs/bites render distinctly, no console errors, frame rate holds at ~60 crowd members.
- [ ] Step 6: Commit: `git add src/render/drawers/drawCollectiveEffectVisual.ts src/render/Renderer.ts tests/unit/drawCollectiveEffectVisual.test.ts && git commit -m "feat(render): generic collective-effect visual renderer, remove laserBurn special case"` (do not commit the showcase HTML — it stays a throwaway artifact under `docs/superpowers/showcases/`, not part of the app).

### Lane 2 — Avatar image pipeline

#### Task 8: `ImageAssetCache` + `avatarAssetRegistry.ts`

**Files:**
- Create: `src/render/imageAssets.ts`, `src/hud/avatarAssetRegistry.ts`
- Test: `tests/unit/imageAssets.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ImageAssetCache` class (`get(url) => {status, image?}`, `preload(urls)`), `AVATAR_ASSET_REGISTRY: readonly {id,label,url,aspect}[]`. Consumed by Task 9, Task 13.

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/avatar-styles.html` with 3-4 candidate avatar/sticker style directions (illustration style, line weight, palette treatment — sourced from whatever's actually available at this point: free samples, AI-generated mockups, or licensed-pack previews if the purchase from spec §8 has already happened). One-line rationale per option. Do not proceed until the user picks a direction. If none of the candidates clear the "premium" bar, stop here and flag that the real asset-library purchase (CraftPix/IconScout, spec §8) needs to happen before this task continues, rather than shipping a weak placeholder as final.
- [ ] Step 1: Write a failing test: `get(url)` on first call returns `{status:"loading"}` and kicks off an `Image` load; on load-complete (simulate via mocked `Image.onload`) subsequent `get(url)` returns `{status:"ready", image}`; on error returns `{status:"error"}`; `preload(urls)` calls `get` for each url without duplicating in-flight loads for a url already requested.
- [ ] Step 2: Run `npx vitest run tests/unit/imageAssets.test.ts` — verify it fails.
- [ ] Step 3: Implement `ImageAssetCache`. Add `avatarAssetRegistry.ts` with 3-4 entries built from the Step 0-selected style direction, pointing at `public/avatars/*` (matching ADR 009's cartoon/caricature constraint — never photoreal).
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/render/imageAssets.ts src/hud/avatarAssetRegistry.ts public/avatars tests/unit/imageAssets.test.ts && git commit -m "feat(render): add ImageAssetCache and avatar asset registry"`

#### Task 9: `drawSubjectAvatar.ts` + `drawSubject.ts` avatar branch

**Files:**
- Create: `src/render/drawers/drawSubjectAvatar.ts`
- Modify: `src/render/drawers/drawSubject.ts`
- Test: `tests/unit/drawSubjectAvatar.test.ts`

**Interfaces:**
- Consumes: `ImageAssetCache` (Task 8), `AVATAR_ASSET_REGISTRY` (Task 8), `SubjectSkin` avatar variant (Task 2), `paperCut.ts` shadow/edge utilities (existing).
- Produces: `drawSubjectAvatar(ctx, skin, cache, ...)`. `drawSubject.ts`'s dispatch adds the `"avatar"` case (resolves the exhaustiveness gap opened by Task 2).

- [ ] Step 1: Write a failing test: while `cache.get(url).status !== "ready"`, `drawSubjectAvatar` draws the flat placeholder silhouette (assert no `drawImage` call, no broken-image path); once `"ready"`, it calls `ctx.drawImage` with the loaded image inside the `paperCut.ts` frame.
- [ ] Step 2: Run `npx vitest run tests/unit/drawSubjectAvatar.test.ts` — verify it fails.
- [ ] Step 3: Implement `drawSubjectAvatar.ts`; add the `"avatar"` case to `drawSubject.ts`'s switch.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/render/drawers/drawSubjectAvatar.ts src/render/drawers/drawSubject.ts tests/unit/drawSubjectAvatar.test.ts && git commit -m "feat(render): add avatar subject drawer"`

### Lane 3 — Text formatting

#### Task 10: `textFontRegistry.ts` + `drawSubjectText.ts` font/align

**Files:**
- Create: `src/hud/textFontRegistry.ts`
- Modify: `src/render/drawers/drawSubjectText.ts`
- Test: `tests/unit/drawSubjectText.test.ts`

**Interfaces:**
- Consumes: `SubjectSkin`'s `fontId`/`align` fields (Task 2).
- Produces: `TEXT_FONT_REGISTRY: readonly {id,label,cssFontFamily}[]` (Space Mono, Fraunces, +1 new curated `@fontsource/...` display font). `drawSubjectText.ts`'s hardcoded `FONT.mono`/`textAlign:"center"` become props resolved via the registry, defaulting to today's values when `fontId`/`align` are absent (backward compatibility for existing persisted skins).

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/text-font-pairings.html` rendering sample subject text through the real `drawSubjectText.ts` canvas path (not a CSS mockup) at 3-4 font/size/align combinations, including the two existing defaults (Space Mono, center) as a baseline for comparison. Present to the user; do not proceed until they've picked the new curated font (and confirmed align/size behavior) by label.
- [ ] Step 1: Write a failing test: a skin with no `fontId`/`align` renders identically to today (mono font, center align — snapshot/assert current defaults); a skin with `fontId:"fraunces"`/`align:"left"` renders with the Fraunces family and left alignment.
- [ ] Step 2: Run `npx vitest run tests/unit/drawSubjectText.test.ts` — verify it fails.
- [ ] Step 3: Add the new self-hosted font package (`npm install @fontsource/<chosen-font>`) matching the Step 0 selection, create `textFontRegistry.ts`, wire `drawSubjectText.ts` to resolve `fontId`/`align` through it with the existing hardcodes as fallback defaults.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add package.json package-lock.json src/hud/textFontRegistry.ts src/render/drawers/drawSubjectText.ts tests/unit/drawSubjectText.test.ts && git commit -m "feat(hud,render): add curated text font/align registry"`

### Lane 4 — Audio wiring

#### Task 11: `ambientBedTrack.ts` + wiring + SFX envelope pass

**Files:**
- Create: `src/audio/ambientBedTrack.ts`
- Modify: `src/main.ts`, relevant files under `src/audio/cues/`
- Test: `tests/unit/ambientBedTrack.test.ts`

**Interfaces:**
- Consumes: `"ambient"` bus (Task 4), the existing `musicBed.ts` fetch→decode→loop shape as a structural template.
- Produces: `startAmbientBedTrack(engine, url)`, wired in `main.ts` alongside the existing `musicBed.ts` call.

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/audio-candidates.html` with `<audio>` elements for 2-3 ambient-bed candidates and 2-3 SFX-envelope variants per attack (beam/arc/bite), each with a short label describing what changed (e.g. "brighter attack transient", "darker drone, lower register"). Present to the user; do not proceed until they've picked a candidate per category by label. If the ambient-bed candidates are all placeholder-quality stock loops, stop here and flag that the real Zapsplat Premium sourcing (spec §8) needs to happen before this task continues, rather than shipping a weak placeholder as final.
- [ ] Step 1: Write a failing test: `startAmbientBedTrack` fetches/decodes the given url, connects the resulting source to the `"ambient"` bus (not `"music"`/`"sfx"`), and loops on end — mirror `musicBed.ts`'s existing test structure.
- [ ] Step 2: Run `npx vitest run tests/unit/ambientBedTrack.test.ts` — verify it fails.
- [ ] Step 3: Implement `ambientBedTrack.ts`; add the Step 0-selected ambient bed audio file under `public/audio/`; wire the call in `main.ts`; make the Step 0-selected envelope/layering enhancements inside `src/audio/cues/*.ts` for the three attack SFX (no interface changes — purely data tuning).
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run `npm run dev` — confirm the ambient bed audibly layers under the music bed without overpowering it, and attack SFX read as punchier.
- [ ] Step 6: Commit: `git add src/audio/ambientBedTrack.ts src/main.ts src/audio/cues public/audio tests/unit/ambientBedTrack.test.ts && git commit -m "feat(audio): layer real ambient bed track, enhance attack SFX envelopes"`

---

## Phase C: Parallel HUD Lanes (depend on Phase B's registries)

### Lane 1 — Control-bar chrome

#### Task 12: `Hud.ts` + `hud.css` chrome restyle + ATTACK CTA

**Files:**
- Modify: `src/hud/Hud.ts`, `src/hud/hud.css`
- Test: `tests/unit/Hud.test.ts` (`@vitest-environment happy-dom`)

**Interfaces:**
- Consumes: existing `PowerController.tryPress`/`release` (unchanged), Figma `Component 1` (103:2490) exported icons.
- Produces: drag handle, visibility toggle, hand tool, T (text) tool, grid (browse) tool, ATTACK CTA button in the DOM HUD.

- [ ] Step 1: Write a failing test (happy-dom): the HUD renders the new drag handle/visibility-toggle/hand/T/grid/ATTACK controls; clicking-and-holding the ATTACK CTA calls `PowerController.tryPress` with the current subject id (mirroring the existing hover-charge call site); releasing calls `release`.
- [ ] Step 2: Run `npx vitest run tests/unit/Hud.test.ts` — verify it fails.
- [ ] Step 3: Export the 9 icons from Figma `103:2490` into `src/hud/hudIcons.ts`; implement the new controls in `Hud.ts`/`hud.css`, following the premium visual-bar principles already established (paper-stack depth, spring easing, thin-line iconography, breathing room, tactile press feedback) — no new visual materials.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run `npm run dev` — visually confirm chrome matches the Figma control-bar layout and press/hold ATTACK triggers the existing charge/burn flow.
- [ ] Step 6: Commit: `git add src/hud/Hud.ts src/hud/hud.css src/hud/hudIcons.ts tests/unit/Hud.test.ts && git commit -m "style(hud): restyle control-bar chrome, add ATTACK CTA"`

### Lane 2 — Subject drawer avatar + text formatting UI

#### Task 13: `SubjectDrawer.ts` avatar section + text formatting controls

**Files:**
- Modify: `src/hud/SubjectDrawer.ts`
- Test: `tests/unit/SubjectDrawer.test.ts` (`@vitest-environment happy-dom`)

**Interfaces:**
- Consumes: `AVATAR_ASSET_REGISTRY` (Task 8), `TEXT_FONT_REGISTRY` (Task 10), the existing panel-drag/tap swap path from the prerequisite spec.
- Produces: a new avatar card-grid section (same pattern as the existing illustrated-subject cards) and text formatting controls (font segmented control, alignment segmented control, expanded size scale) inside the drawer's compose row.

- [ ] Step 1: Write a failing test: the drawer renders one card per `AVATAR_ASSET_REGISTRY` entry, dragging/tapping one swaps `subjectSkin` to `{kind:"avatar", assetId}`; the compose row's font/align controls update the live text-preview's rendered `fontId`/`align` before drop.
- [ ] Step 2: Run `npx vitest run tests/unit/SubjectDrawer.test.ts` — verify it fails.
- [ ] Step 3: Implement the avatar card-grid section and text formatting controls, reusing the existing `SUBJECT_SKIN_REGISTRY.forEach`-style card pattern and existing drag/tap swap plumbing — no new drag system.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run `npm run dev` — confirm avatar cards drop correctly onto the canvas, font/align/size controls live-update the active text subject.
- [ ] Step 6: Commit: `git add src/hud/SubjectDrawer.ts tests/unit/SubjectDrawer.test.ts && git commit -m "feat(hud): add avatar section and text formatting controls to subject drawer"`

---

## Phase D: Documentation & Verification (serial, last)

### Task 14: ADR 009 authorship + `system-architecture.md` update

**Files:**
- Modify: `docs/superpowers/system-architecture.md`

- [ ] Step 1: Author ADR 009 (amends ADR 008): widens the `styleGuardrail` schema gate to admit curated pre-authored illustrated stickers alongside procedural drawers; states validation splits between automated schema-shape checking (Task 3) and human curation-time style-compliance gate (never photoreal, never doctored photos, never hate iconography — same structural precedent as ADR 008).
- [ ] Step 2: Update the data-flow diagram / module inventory in `system-architecture.md` to reflect the new modules from Phases A-C.
- [ ] Step 3: Commit: `git add docs/superpowers/system-architecture.md && git commit -m "docs: author ADR 009, update system architecture for PR1 modules"`

### Task 15: Full human verification pass

- [ ] `npm test` — full suite green.
- [ ] `npm run build` — typecheck clean.
- [ ] `npm run dev` — verify per the spec's Open Questions and the umbrella plan's Verification section: collective beams/arcs/bites visibly originate from multiple crowd members; avatar image load/placeholder/error states (throttle network to test slow-load and a deliberately broken url); text font/align/size controls live-update the canvas; randomized crowd sizes still respect grid placement; ambient bed audibly layers under music; ATTACK CTA triggers the full charge/burn flow; HUD chrome matches Figma reference.
- [ ] No commit for this task — verification only, gating the PR merge.

---

## Kilo Code Agent Manager Orchestration (operational layer)

This plan executes via **Kilo Code's Agent Manager** — a git-worktree-per-agent kanban board (To Do / Doing / Done), not Claude Code subagent dispatch. Each Task in Phases A-D above is one Agent Manager card; each Phase B/C lane is one worktree/branch. The conventions below are the load-bearing rules for running this plan on that tool; treat this section as the operational contract, not a suggestion.

- **Card granularity**: one Agent Manager card per Task (Task 1 through Task 15), not per-phase and not per-lane. A lane (e.g. Phase B Lane 1 = Tasks 6+7) is a sequence of cards on the same branch/worktree, moved through To Do → Doing → Done in order.
- **Branch naming**: `v2/phase-{A|B|C|D}/lane-{N}-{slug}` (e.g. `v2/phase-b/lane-1-collective-renderer`) — this maps directly onto one Agent Manager worktree/branch per lane.
- **Branch base**: Phase A runs in one shared worktree, branched from `main`. Phase B's four lanes each get their own worktree/agent, all branched from `main` **after Phase A's PR merges** — never from each other, so lane PRs stay independent and rebaseable. Phase C's two lanes branch from `main` after Phase B merges, same rule. Phase D runs in the main repo checkout (no worktree — doc authorship + verification only).
- **Merge vehicle**: Phase A is one PR (serial, single worktree). Each Phase B/C lane is its own PR (disjoint files, independently reviewable, no integration step needed between lanes in the same phase). Phase D is one PR.
- **Parallelism cap**: run at most 4 Phase B lanes concurrently (Agent Manager's typical concurrent-agent ceiling) — this matches Phase B's 4-lane structure exactly, so all four lanes can run at once if desired; Phase C's 2 lanes comfortably fit within the same cap.
- **Per-task review**: for every task, before moving its card to Done: (1) confirm the failing test was written before the implementation (the Step 1/Step 2 pattern in each task above enforces this), (2) re-read the diff against this task's Files/Interfaces block and required behavior, (3) re-read the full diff for code quality. Do not mark a card Done on the first green test run alone.
- **Model/effort selection**: if Agent Manager exposes a model/effort choice per card, use the highest available for schema/foundation tasks (Phase A) and the two genuinely novel algorithms (Task 6 contributor selection, Task 7 collective drawer); standard tier is fine for registries, wiring, and HUD chrome.
- **Forbidden-files gate**: before merging any card/PR, confirm `git diff main --stat -- src/physics/ForceField.ts src/core/Engine.ts src/entities/behaviors/StateMachine.ts src/entities/EntityStore.ts` is empty.
- **Showcase gates are hard stops**: Tasks 7, 8, 10, 11 each open with a Step 0 showcase-and-selection gate (see the Showcase & Selection Gates section above). An Agent Manager card for one of these tasks does not move to Done until the user has picked a variant by label — this is a manual decision point, not something the agent should auto-resolve, since it's a visual/audio judgment call no test can verify.
- **Rollback trigger**: if a downstream lane reveals an upstream gap (e.g. Task 7 discovers `EffectVisual` needs a field Task 1 didn't anticipate), stop that lane's card, patch Task 1's already-merged PR with a `fix:`-prefixed follow-up commit (new commit, not amended history), then resume the downstream card against the patched `main`.

**Risk callouts specific to running this plan on Kilo Code Agent Manager:**

1. **Figma-access dependency for Task 12 (HUD chrome).** Confirm before starting Task 12's card that the agent assigned to it actually has access to the Figma file/exported assets referenced in the spec (control-bar layout, `Component 1` icon frame `103:2490`), not just the prose description in this plan and the spec doc. Without that access it's reconstructing chrome from text alone, which is a likely source of "surprisingly low/bad output" on a visually-precise task.
2. **Asset-purchase timing gate (Tasks 8, 11).** If the Step 0 showcase for Task 8 (avatars) or Task 11 (audio) turns up only placeholder/stock-quality candidates, that is the signal to pause and make the real purchase decision from spec §8 (CraftPix/IconScout for avatars, Zapsplat Premium for audio) — do not let an agent "ship what's available" as a substitute. This is a budget/account decision outside any agent's authority to resolve on its own.
3. **Task 2/Task 8 integration risk.** Task 2 introduces `AvatarAssetId` as a placeholder `string` type ahead of Task 8's real `AVATAR_ASSET_REGISTRY`. Because Agent Manager may schedule/complete lanes in a different order than this document assumes (e.g. Task 8's lane finishing before or after Task 2's consumer code expects), explicitly re-check at merge time that Task 8's registry's actual id shape still matches what Task 2's type and any code written against it assume — don't assume phase ordering was respected just because the plan specifies it serially.

Per the user's explicit "docs first, pause for review" instruction, no worktree has been created and no Agent Manager card has been started as part of producing this plan — execution begins only after the user reviews this document and the companion spec.
