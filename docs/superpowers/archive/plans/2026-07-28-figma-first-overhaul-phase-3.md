# Figma-First Overhaul Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate approved visual lanes serially, repair only interactions required by approved states, and pass all release gates.

**Architecture:** One owner controls shared seams and cherry-picks immutable reviewed lane SHAs. Deterministic fixtures use existing injection points; production remains real-time. Closed architecture files remain untouched.

**Tech Stack:** Git worktrees, TypeScript, Vitest, Playwright, axe-core, PNG overlays, CI.

---

## Task 1: Immutable Integration Ledger

**Files:** Create `tests/integration/figma-lanes.json`; modify `.gitignore` only if required.

- [ ] **Record `EYES_APPROVED_SHA` and exact reviewed lane SHAs:**

```json
{
  "base": "EYES_APPROVED_SHA",
  "lanes": [
    { "name": "crowd", "commit": "SHA", "specReview": "approved", "qualityReview": "approved" },
    { "name": "subjects-vfx", "commit": "SHA", "specReview": "approved", "qualityReview": "approved" },
    { "name": "dom-ui", "commit": "SHA", "specReview": "approved", "qualityReview": "approved" },
    { "name": "qa", "commit": "SHA", "specReview": "approved", "qualityReview": "approved" }
  ]
}
```

- [ ] **Verify every SHA** equals the independently reviewed lane tip.
- [ ] **Run pairwise file collision audit.** Expected: no overlapping lane-owned production files.
- [ ] **Commit** `chore: record Figma integration inputs`.

## Task 2: Serial Lane Integration

**Files:** Git history plus conflict resolutions limited to integration-owned seams.

- [ ] **Cherry-pick Crowd SHA.** Run `npm test && npm run build` and closed-file diff.
- [ ] **Cherry-pick Subjects/VFX SHA.** Repeat all gates.
- [ ] **Cherry-pick DOM UI SHA.** Repeat all gates.
- [ ] **Cherry-pick QA SHA.** Repeat all gates.
- [ ] **Do not resolve conflicts by dropping reviewed behavior.** Return lane-owned conflicts to the lane implementer; integration owner handles only `main.ts`, `Renderer.ts`, shared tokens, dependencies, and scripts.

## Task 3: Subject Drop Meaning

**Files:** Modify `src/input/SubjectDragSource.ts`, `src/main.ts`, existing drag tests; create `tests/unit/subjectDropResult.test.ts`.

- [ ] **Write failing tests** distinguishing explicit stage position, touch center placement, outside cancellation, and pointer cancellation.
- [ ] **Define:**

```ts
export type SubjectDropResult =
  | { kind: "place"; skin: SubjectSkin; canvasPos: Vec2 }
  | { kind: "place-center"; skin: SubjectSkin }
  | { kind: "cancel"; reason: "outside" | "pointercancel" };
```

- [ ] **Implement `applySubjectDrop(result, nowMs)`** returning `null` for cancel and spawning at center only for `place-center`.
- [ ] **Run:** `npm test -- tests/unit/subjectDragSource.test.ts tests/unit/subjectDropResult.test.ts tests/unit/mainSubjectWiring.test.ts`.
- [ ] **Commit** `fix: distinguish subject placement from cancelled drops`; complete both reviews.

## Task 4: Bounded Subject Hit Testing

**Files:** Modify `src/entities/subjectQueries.ts`, `src/main.ts`, subject-query tests; create `tests/unit/subjectHitTesting.test.ts`.

- [ ] **Write failing tests** for nearest live subject inside radius, null outside radius, and dead-subject exclusion.
- [ ] **Change signature:**

```ts
export const queryNearestSubject = (
  store: EntityStore, pos: Vec2, maxRadiusPx: number,
): Entity | null;
```

- [ ] **Initialize** `bestDist = maxRadiusPx * maxRadiusPx`; pass a reviewed visual/input radius from `main.ts` without touching physics.
- [ ] **Run focused tests and commit** `fix: bound subject hit testing`; complete both reviews.

## Task 5: Typed HUD Tool Routing

**Files:** Modify `src/hud/Hud.ts`, `SubjectDrawer.ts`, `src/main.ts`, HUD tests; create `tests/unit/hudPanelApi.test.ts`.

- [ ] **Write failing tests** for `openPanel`, `closePanel`, `activePanel`, text focus, gallery focus, and trigger restoration.
- [ ] **Expose:**

```ts
export type HudPanel = "filter" | "gallery" | "text";
openPanel(panel: HudPanel): void;
closePanel(panel?: HudPanel): void;
activePanel(): HudPanel | null;
```

- [ ] **Replace empty and synthetic bridges:**

```ts
hud.onGridTool(() => hud.openPanel("gallery"));
hud.onTextTool(() => hud.openPanel("text"));
hud.onHandToolToggle((active) => { handToolActive = active; });
```

- [ ] **Verify:** `rg -n "dispatchEvent|document\.querySelector" src/hud src/main.ts` contains no component-coordination bridge.
- [ ] **Run HUD tests and commit** `fix: route HUD tools through typed panel APIs`; complete both reviews.

## Task 6: Verify Control-Origin Attack Integration

**Files:** Modify `src/input/PowerController.ts`, `src/main.ts`, power tests; create `tests/unit/powerControllerControlSource.test.ts`.

- [ ] **Retain the Phase 1 tests** proving control-origin charging works with inactive Canvas cursor while Canvas-origin charging still cancels outside range.
- [ ] **Verify the integrated public contract remains:**

```ts
export type ChargeSource =
  | { kind: "canvas"; point: Vec2 }
  | { kind: "control" };
tryPress(targetId: EntityId, source: ChargeSource, nowMs: number): boolean;
```

- [ ] **If integration wiring regressed, restore cursor cancellation only when `source.kind === "canvas"`.** HUD passes `{ kind: "control" }`; Canvas passes its point.
- [ ] **Do not change** charge threshold, cooldown, effect IDs, target identity, destruction, or respawn.
- [ ] **Run power/main tests.** Commit `fix: preserve control-origin attack routing` only if reconciliation is required; complete both reviews for any change.

## Task 7: Removed-Subject HUD Synchronization

**Files:** Modify `src/main.ts`, `src/hud/Hud.ts`; create `tests/unit/mainSubjectRemovalSync.test.ts`.

- [ ] **Write failing test** proving removal of the locked subject clears current ID, locked ID, skin, count, and Attack availability.
- [ ] **Add one reflection API:**

```ts
export type HudSubjectState = {
  currentSubjectId: EntityId | null; lockedSubjectId: EntityId | null;
  skin: SubjectSkin | null; count: number;
};
setSubjectState(state: HudSubjectState): void;
```

- [ ] **Centralize removal reflection** without creating a second lock state.
- [ ] **Run removal/collection/HUD tests and commit** `fix: clear HUD state when targets are removed`; complete both reviews.

## Task 8: Renderer And Token Reconciliation

**Files:** Modify only `src/render/Renderer.ts`, `src/main.ts`, shared token sources/generated CSS, renderer integration tests.

- [ ] **Write/update failing dispatch tests** for image cache, scene scale, reduced motion, subject skin lock metrics, and all crowd modes.
- [ ] **Wire reviewed leaf APIs:**

```ts
drawBug(ctx, { ...existing, imageCache, reducedMotion });
drawPointedFinger(ctx, { ...existing, imageCache, reducedMotion });
drawCollectiveEffectVisual(ctx, { ...existing, reducedMotion });
drawLockIndicator(ctx, { pos: subject.pos, sizePx: subject.sizePx, skin: subject.subjectSkin });
```

- [ ] **Preserve paint order** and do not consume shared RNG.
- [ ] **Regenerate tokens** from the semantic source; do not hand-edit generated values.
- [ ] **Run renderer tests, token check, full unit suite, and build.** Commit `feat: integrate Figma visual lanes`; complete both reviews.

## Task 9: Browser Interaction And Accessibility Matrix

**Files:** Integration-owned browser specs and any minimal approved test seams.

- [ ] **Run all scenarios** in Chromium, Firefox, and WebKit: default, filter, gallery, text, attack, removed target, reduced motion.
- [ ] **Verify pointer, touch, and keyboard flows** including focus restoration and closed-panel inertness.
- [ ] **Run axe** and reject serious/critical violations.
- [ ] **Use native `disabled`, `aria-pressed`, `aria-expanded`, `aria-controls`, and correct dialog state.**
- [ ] **Run:** `npm run test:browser:cross && npm run test:a11y`; fix production issues through TDD and both reviews.

## Task 10: Responsive And Reduced-Motion Matrix

**Files:** `tests/browser/responsive.spec.ts`, `reduced-motion.spec.ts`, related unit contract tests.

- [ ] **Test exact viewports:** 320x568, 390x844, 844x390, 768x1024, 1280x832, 1440x900.
- [ ] **For each required state assert:** no document overflow; bar/panels inside viewport; target not obscured; phone controls at least 44x44; Canvas equals viewport and has no transform.
- [ ] **Reduced motion asserts:** no entrance/stagger/jitter/pulse; gaze and selected state remain legible; attack reaches completion; no intermediate effect state remains.
- [ ] **Run:** `npm run test:responsive && npm run test:motion`; fix failures with TDD and both reviews.

## Task 11: Figma Manifest And Visual Evidence

**Files:** Finalize `tests/visual/figma-manifest.json`, local references, browser baselines, overlay scripts/tests.

- [ ] **Validate every approved node exactly once:** `0:1`, `18:113`, `44:287`, `46:905`, `103:3402`, `103:2490`, `103:3579`, `103:3593`, `109:3669`.
- [ ] **Require** local reference, deterministic scenario, viewport, DPR 1, seed, time, optional clip, and deviations.
- [ ] **Run ten fresh-page captures** and require one SHA-256 hash before baseline generation.
- [ ] **Generate reviewed Chromium baselines** with animations disabled and zero unapproved tolerance increases.
- [ ] **Generate 50/50 overlays and absolute-difference PNGs** under ignored `test-results/figma-overlays/`.
- [ ] **Obtain independent visual approval** for each manifest entry; record precise intentional deviations.
- [ ] **Run:** `npm run test:determinism && npm run test:visual && npm run test:figma`.

## Task 12: Release Audits And CI

**Files:** Finalize release audit scripts, package scripts, `.github/workflows/release-gates.yml`.

- [ ] **Audit rejects:** closed-file changes, runtime `localhost:3845`, leaked Figma export labels, focused/skipped tests, staged generated overlays, missing local assets.
- [ ] **Add three CI jobs:** unit/build/audit; cross-browser; visual parity/determinism.
- [ ] **Run clean-checkout gate:**

```bash
npm ci
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser:cross
npm run test:a11y
npm run test:responsive
npm run test:motion
npm run test:determinism
npm run test:visual
npm run test:figma
PHASE_BASE_SHA="$EYES_APPROVED_SHA" npm run audit:release
```

- [ ] **Commit** `ci: enforce Figma visual release gates`.

## Task 13: Final Reviews

- [ ] Dispatch final specification reviewer with approved spec, all plan files, `EYES_APPROVED_SHA`, integrated HEAD, Figma manifest, and full verification output.
- [ ] Fix every specification finding and repeat review until approved.
- [ ] Dispatch final code-quality reviewer only after specification approval.
- [ ] Fix every quality finding and repeat review until approved.
- [ ] Run the entire clean-checkout release command again after the final fix.
- [ ] Verify `git status --short` is clean except explicitly ignored/generated evidence.
- [ ] Verify closed-file diff prints nothing.
- [ ] Use `superpowers:finishing-a-development-branch` to present integration options.
