# Fun Satire — Multi-Subject Targeting (PR2) — Implementation Plan

> **For agentic workers:** This plan executes via **Kilo Code's Agent Manager** (git-worktree-per-agent, kanban To Do/Doing/Done board) — each Task below is one Agent Manager card; each Phase B/C lane is one worktree/branch, per the naming convention in the orchestration section at the end of this document. PR2 is a structural refactor that turns the singleton `Subject` into a collection. The order of tasks matters more than in PR1 because the singleton state in `main.ts` is the root dependency for most other changes.

## Goal

Ship PR2 of the multi-subject targeting overhaul: replace the singleton Subject with a collection, add drag-to-place (replacing swap), tap-to-lock with `lockedSubjectId`, distributed look-at/gaze targeting, HUD formatting controls bound to the locked subject, and ATTACK CTA wired through the lock. Multi-subject spawning is explicit via drag-to-place; auto-respawn is removed.

## Architecture

New conceptual state in `src/main.ts`: `subjects: Map<EntityId, SubjectRecord>` + `lockedSubjectId: EntityId | null`. Modified modules: `src/main.ts` (singleton → collection, drop handling, lock handling, spawn/respawn), `src/input/SubjectDragSource.ts` (emit `{skin, canvasPos}`), `src/entities/EntityFactory.ts` (`SpawnSubjectOpts.skin` + manifest default), `src/entities/behaviors/SubjectBehavior.ts` (follow → placed lifecycle), `src/render/Renderer.ts` (`subjects` array + distributed gaze), `src/render/drawers/drawGazeLines.ts` (nearest/locked target assignment), `src/input/PowerController.ts` callers (no interface change — already target-id parameterized), `src/hud/Hud.ts` + `src/hud/SubjectDrawer.ts` (callback identity binding), `src/effects/EffectSystem.ts` callers (no interface change — already ID-based), tests across `tests/unit/`.

## Tech Stack

TypeScript 5.x, Vite, Canvas2D, Web Audio API, vitest (+ `happy-dom` for HUD tests).

## Prerequisite

`docs/superpowers/specs/2026-07-27-multi-subject-targeting-design.md` (this plan's spec) and its prerequisites — all already merged or written. The codebase must contain PR1's changes (avatar/text/formatting/HUD chrome/audio/collective-effect renderer) on `main`.

**Naming discipline:** if the real code differs from a name used below when a task actually starts, use the real name — do not invent a parallel variable to match this document.

## Global Constraints

- `ForceField.ts`, `Engine.ts`, `StateMachine.ts`, `EntityStore.ts` are untouched by every task in this plan.
- `PowerController.ts`, `EffectSystem.ts`, `EntityStore.ts` interfaces stay unchanged — PR2 uses them as-is.
- `SubjectSkin` value-type shape is unchanged.
- Every task that touches `physics/`, `render/`, `effects/`, or `hud/` gets a human `npm run dev` check before being marked done.
- `npm test` must stay green after every task; `npm run build` (typecheck) must pass before any phase's work merges.
- No new attack VFX or audio changes beyond what's required for the lock indicator (design-detail gate in Phase B).

## Showcase & Selection Gates

PR2 has three UX/interaction judgment calls a test cannot verify. Each has a **Step 0** that produces a small throwaway HTML file under `docs/superpowers/showcases/<topic>.html` presenting concrete options side by side. Do not proceed past Step 0 until the user picks a variant by label.

### Gate 1 — Locked subject indicator (Task 6)
Present 3-4 candidate visuals for the "locked" state on a canvas mock of a subject:
- A: thin amber ring
- B: soft gold glow (reuse PR1 glow archetype)
- C: dashed paper-cut outline
- D: no indicator (lock is implicit)

### Gate 2 — Touch tap-to-spawn (Task 3)
Present 2 candidates in a plain HTML page:
- A: tap card → spawn at canvas center (simplest)
- B: tap card → enter placement mode; next canvas tap spawns

### Gate 3 — ATTACK CTA with no lock (Task 7)
Present 2 candidates:
- A: CTA disabled until a subject is locked
- B: CTA enabled; when no lock, it targets the nearest subject to cursor

---

## Phase A: Foundation (serial)

Phase A must complete before Phase B lanes branch. It refactors the singleton root state into a collection and updates the drag/spawn plumbing that every downstream lane depends on.

### Task 1: Subject collection model in main.ts

**Files:**
- Modify: `src/main.ts`
- Test: `tests/unit/mainSubjectWiring.test.ts`

**Interfaces:**
- Consumes: existing `EntityId`, `SubjectSkin`, `spawnSubject`.
- Produces: `type SubjectRecord = { id: EntityId; skin: SubjectSkin; spawnedAtMs: number; locked: boolean };` plus module-level `subjects: Map<EntityId, SubjectRecord>` and `lockedSubjectId: EntityId | null`.

Replace the singleton scalars:
```ts
// before
let activeSubjectSkin: SubjectSkin = { kind: "illustrated", id: "figure" };
let subjectId: EntityId | null = null;
let subjectSpawnedAtMs = 0;
let subjectRespawnAtMs: number | null = null;

// after
let subjects: Map<EntityId, SubjectRecord> = new Map();
let lockedSubjectId: EntityId | null = null;
```

- Remove `subjectRespawnAtMs` entirely (no auto-respawn).
- Keep `activeSubjectSkin` only as a fallback/default for spawn calls that don't provide a skin.
- Update `shouldSpawnSubject` (or remove it if drag-to-place makes it obsolete).
- Update death/respawn handling so the subject is removed from `subjects` and `lockedSubjectId` is cleared if it was the locked one.

- [ ] Step 1: Write a failing test asserting two subjects can be spawned and tracked independently, and that removing one does not affect the other.
- [ ] Step 2: Run `npx vitest run tests/unit/mainSubjectWiring.test.ts` — verify it fails.
- [ ] Step 3: Implement the collection state; update spawn/despawn bookkeeping.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run `npm test` (full suite) — expect failures in dependent tests (Renderer, SubjectDrawer, etc.) to be fixed in downstream tasks.
- [ ] Step 6: Commit: `git add src/main.ts tests/unit/mainSubjectWiring.test.ts && git commit -m "feat(main): replace singleton subject with subjects collection"`

### Task 2: Drag-to-place in SubjectDragSource

**Files:**
- Modify: `src/input/SubjectDragSource.ts`
- Test: `tests/unit/subjectDragSource.test.ts`

**Interfaces:**
- Consumes: existing drag/tap logic.
- Produces: `onDrop(cb: (result: { skin: SubjectSkin; canvasPos: Vec2 | null }) => void): void` replacing `onSwap`.

- Mouse drag: compute canvas-relative position from `dropTarget.getBoundingClientRect()` and pointer coordinates; emit `{skin, canvasPos}`.
- Touch tap: emit `{skin, canvasPos: null}`.
- Drop outside canvas: emit `{skin, canvasPos: null}`.

- [ ] Step 1: Write a failing test asserting `onDrop` receives a `{skin, canvasPos}` object with a real `Vec2` for a mouse drop inside the target and `null` for an outside drop.
- [ ] Step 2: Run `npx vitest run tests/unit/subjectDragSource.test.ts` — verify it fails.
- [ ] Step 3: Replace `onSwap` with `onDrop`; update mouse and touch paths.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/input/SubjectDragSource.ts tests/unit/subjectDragSource.test.ts && git commit -m "feat(input): drag-to-place emits skin + canvas position"`

### Task 3: SpawnSubjectOpts skin + manifest default

**Files:**
- Modify: `src/entities/EntityFactory.ts`
- Test: `tests/unit/entityFactorySubject.test.ts`

**Interfaces:**
- Consumes: `SubjectSkin`, `SubjectManifestEntry`.
- Produces: `SpawnSubjectOpts` gains optional `skin?: SubjectSkin` and uses manifest entry's `subjectSkin` default when absent.

- `spawnSubject` stamps `opts.skin ?? { kind: "illustrated", id: entry.subjectSkin ?? "figure" }` into `behavior.data.subjectSkin`.
- The function still returns one `Entity`.

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/touch-tap-to-spawn.html` with two labeled options (A: spawn at center; B: placement mode then tap). Present to user; do not proceed until a label is picked.
- [ ] Step 1: Write a failing test asserting `spawnSubject({..., skin: {kind:"text", value:"x", scale:1}})` produces an entity whose `behavior.data.subjectSkin` matches, and that omitting `skin` falls back to the manifest entry's `subjectSkin`.
- [ ] Step 2: Run `npx vitest run tests/unit/entityFactorySubject.test.ts` — verify it fails.
- [ ] Step 3: Update `SpawnSubjectOpts` and `spawnSubject` implementation.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/entities/EntityFactory.ts tests/unit/entityFactorySubject.test.ts && git commit -m "feat(entities): accept per-subject skin in spawnSubject"`

### Task 4: Subject query helpers

**Files:**
- Create: `src/entities/subjectQueries.ts`
- Test: `tests/unit/subjectQueries.test.ts`

**Interfaces:**
- Consumes: `EntityStore`, `Vec2`.
- Produces: `queryNearestSubject(store, pos): Entity | null`, `queryAllSubjects(store): Entity[]`, `isSubject(entity): boolean`.

Pure helper functions for main.ts and Renderer to query subject entities without duplicating `renderType === "subject"` checks everywhere.

- [ ] Step 1: Write a failing test asserting these helpers identify subject entities and return nearest/all correctly.
- [ ] Step 2: Run `npx vitest run tests/unit/subjectQueries.test.ts` — verify it fails.
- [ ] Step 3: Implement the helpers.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Commit: `git add src/entities/subjectQueries.ts tests/unit/subjectQueries.test.ts && git commit -m "feat(entities): add subject query helpers"`

### Task 5: main.ts drop + lock integration

**Files:**
- Modify: `src/main.ts`
- Test: `tests/unit/mainSubjectWiring.test.ts` (extend)

**Interfaces:**
- Consumes: Phase A Tasks 1-4 outputs.
- Produces: integrated wiring: `SubjectDragSource.onDrop` spawns subjects into `subjects` Map; tap-on-subject toggles `lockedSubjectId`.

- Remove `hud.onSubjectSkinChange` global swap mutation.
- Add `hud.setCurrentSubjectId(lockedSubjectId)` calls whenever lock changes.
- Update pointer.press() to lock/unlock when pressing a subject entity, and to target `lockedSubjectId ?? nearestSubject` when pressing elsewhere.
- Remove auto-respawn timer wiring.

- [ ] Step 1: Write a failing integration test asserting: drop a skin at (x,y) → subject appears in `subjects`; tap it → `lockedSubjectId` set; tap again → cleared.
- [ ] Step 2: Run `npx vitest run tests/unit/mainSubjectWiring.test.ts` — verify it fails.
- [ ] Step 3: Implement the integration.
- [ ] Step 4: Run the test — verify it passes.
- [ ] Step 5: Run `npm run build` to catch type errors introduced by the new main.ts shape.
- [ ] Step 6: Commit: `git add src/main.ts tests/unit/mainSubjectWiring.test.ts && git commit -m "feat(main): integrate drag-to-place and tap-to-lock"`

---

## Phase B: Parallel Lanes (depend on Phase A; one worktree per lane)

### Lane 1 — Lock indicator + ATTACK CTA

#### Task 6: Locked subject indicator

**Files:**
- Modify: `src/render/Renderer.ts`, `src/render/drawers/drawSubject.ts` or new `src/render/drawers/drawLockIndicator.ts`
- Test: `tests/unit/drawLockIndicator.test.ts` (new) or extend renderer tests

**Interfaces:**
- Consumes: `SubjectRenderInfo` (new `locked` boolean), `EffectVisual` archetypes (reuse glow).
- Produces: a visual indicator drawn around the locked subject.

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/lock-indicator.html` with 4 candidate visuals (ring/glow/dashed/none). Stop for user pick.
- [ ] Step 1: Write a failing test asserting the locked subject gets the selected indicator and non-locked subjects do not.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Implement using the selected variant (reuse PR1 glow if picked, no `shadowBlur`).
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/render/... tests/unit/... && git commit -m "feat(render): draw locked-subject indicator"`

#### Task 7: ATTACK CTA wiring through lockedSubjectId

**Files:**
- Modify: `src/main.ts`, `src/hud/Hud.ts`
- Test: `tests/unit/Hud.test.ts` (extend)

**Interfaces:**
- Consumes: `lockedSubjectId` from main.ts, `hud.currentSubjectId`.
- Produces: ATTACK CTA targets the locked subject (or nearest, depending on Gate 3 selection).

- [ ] **Step 0 (showcase gate):** Build `docs/superpowers/showcases/attack-cta-no-lock.html` with 2 candidates (A: disabled; B: nearest). Stop for user pick.
- [ ] Step 1: Write a failing test asserting `hud.setCurrentSubjectId(lockedSubjectId)` is called on lock change and ATTACK press passes the right target id to `PowerController.tryPress`.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Wire `hud.setCurrentSubjectId` calls; implement the selected no-lock behavior.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/main.ts src/hud/Hud.ts tests/unit/Hud.test.ts && git commit -m "feat(hud): wire ATTACK CTA through lockedSubjectId"`

### Lane 2 — Renderer subjects array + gaze distribution

#### Task 8: RenderFrameOptions.subjects array

**Files:**
- Modify: `src/render/Renderer.ts`, `src/render/types.ts` if it exists, else inline
- Test: `tests/unit/Renderer.test.ts` or new `tests/unit/rendererSubjects.test.ts`

**Interfaces:**
- Consumes: existing `RenderFrameOptions`.
- Produces: `RenderFrameOptions.subject` removed, `.subjects: SubjectRenderInfo[]` added.

- [ ] Step 1: Write a failing test asserting `renderFrame` accepts and renders multiple subjects.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Update `RenderFrameOptions` and renderer loop.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/render/Renderer.ts tests/unit/... && git commit -m "feat(render): accept subjects array in render frame"`

#### Task 9: Distributed gaze lines

**Files:**
- Modify: `src/render/drawers/drawGazeLines.ts`, `src/render/Renderer.ts`
- Test: `tests/unit/drawGazeLines.test.ts` (extend)

**Interfaces:**
- Consumes: `subjects: SubjectRenderInfo[]`, `lockedSubjectId`.
- Produces: per-eye target assignment (nearest subject, or locked subject when locked).

- [ ] Step 1: Write a failing test asserting each eye looks at nearest subject by default and all eyes look at locked subject when locked.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Update `computeGazeLines` signature and implementation.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/render/drawers/drawGazeLines.ts src/render/Renderer.ts tests/unit/drawGazeLines.test.ts && git commit -m "feat(render): distribute gaze lines across subjects"`

### Lane 3 — HUD identity binding

#### Task 10: SubjectDrawer callbacks with identity

**Files:**
- Modify: `src/hud/SubjectDrawer.ts`
- Test: `tests/unit/SubjectDrawer.test.ts` (extend)

**Interfaces:**
- Consumes: existing `SubjectDrawer`.
- Produces: callbacks include a subject ID: `onSkinChange(subjectId, skin)`, `onResize(subjectId, scale)`, `onFontChange(subjectId, fontId)`, `onAlignChange(subjectId, align)`.

- `setActiveSkin(skin)` becomes `setActiveSkin(subjectId, skin)`.
- Compose controls edit the active subject (initially the locked subject).

- [ ] Step 1: Write a failing test asserting the drawer emits identity-aware callbacks when controls change.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Update callback signatures and call sites.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/hud/SubjectDrawer.ts tests/unit/SubjectDrawer.test.ts && git commit -m "feat(hud): make subject drawer callbacks identity-aware"`

#### Task 11: Hud identity binding + subject count

**Files:**
- Modify: `src/hud/Hud.ts`
- Test: `tests/unit/Hud.test.ts` (extend)

**Interfaces:**
- Consumes: identity-aware callbacks from Task 10.
- Produces: `Hud` exposes `setSubjectCount(n)`, `setLockedSubjectId(id)`, formatting callbacks with identity.

- [ ] Step 1: Write a failing test asserting HUD renders subject count and propagates identity-aware callbacks.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Update `Hud.ts`.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/hud/Hud.ts tests/unit/Hud.test.ts && git commit -m "feat(hud): bind formatting controls to locked subject and show count"`

#### Task 12: main.ts identity-aware handlers

**Files:**
- Modify: `src/main.ts`
- Test: `tests/unit/mainSubjectWiring.test.ts` (extend)

**Interfaces:**
- Consumes: Tasks 10-11 outputs.
- Produces: main.ts updates the correct subject's skin in `subjects` Map when formatting controls change.

- [ ] Step 1: Write a failing test asserting a formatting change updates only the targeted subject.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Update handlers.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/main.ts tests/unit/mainSubjectWiring.test.ts && git commit -m "feat(main): update subject skin by identity"`

### Lane 4 — SubjectBehavior lifecycle

#### Task 13: Follow → placed lifecycle

**Files:**
- Modify: `src/entities/behaviors/SubjectBehavior.ts`
- Test: `tests/unit/SubjectBehavior.test.ts` (new or extend)

**Interfaces:**
- Consumes: `SubjectRecord` via `behavior.data`.
- Produces: `stepSubjectPhysics` uses a fixed home when placed, cursor-follow home when following.

PR2 decision: all drag-to-placed subjects are "placed" immediately (fixed home at drop point). There is no follow mode initially. If Gate 2 picks "placement mode then tap", the intermediate state is also fixed-home after placement. Therefore this task may be a no-op if we simply set `home` to the drop position and never update it. Implement explicit `isFollowing`/`isPlaced` state in `behavior.data` anyway for future expansion.

- [ ] Step 1: Write a failing test asserting a subject with `behavior.data.placed: true` keeps a fixed home.
- [ ] Step 2: Run test — fail.
- [ ] Step 3: Add `placed` flag and branch in `homeFor`/`stepSubjectPhysics`.
- [ ] Step 4: Run test — pass.
- [ ] Step 5: Commit: `git add src/entities/behaviors/SubjectBehavior.ts tests/unit/SubjectBehavior.test.ts && git commit -m "feat(entities): add placed/following lifecycle to SubjectBehavior"`

---

## Phase C: Integration & Verification (serial, last)

### Task 14: Update remaining tests + fix regressions

**Files:**
- Modify: affected test files in `tests/unit/`

Run full suite, identify regressions from Phase A/B, fix them. Likely affected files:
- `tests/unit/mainSubjectWiring.test.ts`
- `tests/unit/laserBurnRespawnDelay.test.ts`
- `tests/unit/barrels.test.ts`
- `tests/unit/entityFactorySubject.test.ts`
- `tests/unit/Renderer.test.ts`
- `tests/unit/drawGazeLines.test.ts`
- `tests/unit/Hud.test.ts`
- `tests/unit/SubjectDrawer.test.ts`

- [ ] Step 1: Run `npm test` and list all failures.
- [ ] Step 2: Fix failures one by one.
- [ ] Step 3: Run `npm test` again until green.
- [ ] Step 4: Commit: `git add tests/unit/... && git commit -m "test: update tests for multi-subject targeting"`

### Task 15: ADR 010 + system-architecture.md update

**Files:**
- Modify: `docs/superpowers/system-architecture.md`

- [ ] Step 1: Author ADR 010: multi-subject targeting — replace singleton with collection, drag-to-place, tap-to-lock.
- [ ] Step 2: Update data-flow diagram / module inventory to show `subjects` collection, `lockedSubjectId`, and identity-aware HUD.
- [ ] Step 3: Commit: `git add docs/superpowers/system-architecture.md && git commit -m "docs: author ADR 010, update architecture for multi-subject targeting"`

### Task 16: Full human verification pass

- [ ] `npm test` — full suite green.
- [ ] `npm run build` — typecheck clean.
- [ ] `npm run dev` — verify: drag a card from the subject browser to the canvas spawns a subject; drag multiple cards to create multiple subjects; tap a subject to lock it (indicator appears); tap another to transfer lock; tap locked subject to unlock; ATTACK CTA targets locked subject; formatting controls edit locked subject; gaze lines distribute across subjects; attacks (laser/electric/bite) target the correct subject; random crowd sizes and avatar/text formatting still work.
- [ ] No commit for this task — verification only, gating the PR merge.

---

## Kilo Code Agent Manager Orchestration (operational layer)

This plan executes via **Kilo Code's Agent Manager** — a git-worktree-per-agent kanban board.

- **Card granularity:** one Agent Manager card per Task (Task 1 through Task 16).
- **Branch naming:** `v2/phase-{A|B|C}/lane-{N}-{slug}` (e.g., `v2/phase-b/lane-1-lock-indicator`).
- **Branch base:** Phase A runs in one shared worktree, branched from `main` after PR1 merges. Phase B's four lanes each get their own worktree/agent, all branched from `main` **after Phase A's PR merges**. Phase C runs in the main repo checkout.
- **Merge vehicle:** Phase A is one PR. Each Phase B lane is its own PR. Phase C is one PR.
- **Parallelism cap:** run at most 4 Phase B lanes concurrently.
- **Per-task review:** before moving a card to Done, confirm the failing test was written first, re-read the diff against the task's Files/Interfaces block, and re-read for code quality.
- **Forbidden-files gate:** before merging any card/PR, confirm `git diff main --stat -- src/physics/ForceField.ts src/core/Engine.ts src/entities/behaviors/StateMachine.ts src/entities/EntityStore.ts` is empty.
- **Showcase gates are hard stops:** Tasks 6, 7, and 3 each open with a Step 0 showcase-and-selection gate. Do not move those cards to Done until the user has picked a variant by label.

**Risk callouts:**
1. **Phase A is load-bearing.** Tasks 1-5 refactor `main.ts`'s singleton state. Downstream lanes cannot meaningfully start until Phase A merges. Do not begin Phase B until Phase A is on `main`.
2. **SubjectBehavior lifecycle decision.** If Gate 2 picks "placement mode then tap", Task 13 needs to handle the intermediate following state. If Gate 2 picks "spawn at center", Task 13 is minimal.
3. **Test churn.** Many unit tests assert the singleton state. Expect a non-trivial test update task in Phase C.

Per the user's explicit instruction, no worktree has been created and no Agent Manager card has been started as part of producing this plan — execution begins only after the user reviews this document and the companion spec.
