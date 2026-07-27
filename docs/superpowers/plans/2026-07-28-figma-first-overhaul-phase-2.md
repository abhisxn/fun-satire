# Figma-First Overhaul Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the approved eyes slice across DOM overlays, bug/finger modes, subjects, effects, cursor, lock, and QA through disjoint parallel worktrees.

**Architecture:** Every lane branches from `EYES_APPROVED_SHA`, owns a non-overlapping file set, and consumes Phase 1 tokens/assets without editing shared integration seams. Each task receives specification and quality review before the lane tip is approved.

**Tech Stack:** TypeScript, Canvas 2D, DOM/CSS, Vitest, Playwright, Figma exports.

---

## Entry Gate

- [ ] Confirm `git rev-parse figma-eyes-approved-2026-07-28` equals `EYES_APPROVED_SHA`.
- [ ] Confirm `npm test`, `npm run build`, eyes browser gates, and eyes Figma overlays pass at that SHA.
- [ ] Create four Agent Manager worktrees from that exact SHA.
- [ ] Give every agent its full task text, ownership allowlist, closed-file denylist, and relevant Figma nodes.

## Lane A: DOM UI And Responsive Overlays

**Branch:** `overhaul/figma-dom-ui`

**Owns:** `src/hud/**` except shared registry files declared by Phase 1; HUD unit tests.

**Must not modify:** `src/main.ts`, `src/render/Renderer.ts`, Canvas drawers, shared tokens, closed files.

### Task A1: Overlay Coordinator

**Files:** Create/modify `src/hud/OverlayLayout.ts`, `src/hud/overlayLayout.css`, `tests/unit/overlayLayout.test.ts`.

- [ ] **Write failing tests** for one active overlay, `hidden`, `inert`, `aria-hidden`, initial focus, Escape, and trigger restoration.
- [ ] **Implement:**

```ts
export type OverlayId = "filter" | "gallery" | "text";
export class OverlayLayout {
  register(input: { id: OverlayId; element: HTMLElement; initialFocus(): HTMLElement | null }): void;
  open(id: OverlayId, trigger?: HTMLElement): void;
  close(): void; toggle(id: OverlayId, trigger?: HTMLElement): void;
  getActive(): OverlayId | null;
}
```

- [ ] **Run:** `npm test -- tests/unit/overlayLayout.test.ts tests/unit/hud.test.ts`; commit `feat(hud): add accessible overlay coordinator`.

### Task A2: Complete Control And Filter Components

**Files:** Modify Phase 1 `ControlBar`, `FilterPanel`, `Hud`, CSS, and focused tests.

- [ ] **Write failing tests** for all three mode buttons, panel expanded state, native Attack disabled state, quantity 1-60 clamp, repel 0-2, and callback payloads.
- [ ] **Keep public state explicit:**

```ts
export type HudPanel = "filter" | "gallery" | "text";
export type HudPanelState = { open: HudPanel | null; quantity: number; repelMultiplier: number };
export type HudAttackState = { subjectId: number | null; available: boolean; pressed: boolean };
```

- [ ] **Consume existing semantic CSS variables.** Do not add local Figma literals or edit token sources.
- [ ] **Run focused HUD tests and build; commit** `feat(hud): complete Figma control surfaces`.

### Task A3: Gallery And Text Composer

**Files:** Modify/create `AvatarGallery.ts`, `TextSubjectComposer.ts`, their CSS/tests, `SubjectDrawer.ts`, avatar registry.

- [ ] **Write failing tests** for gallery selection, lazy decode, semantic labels, text limit, size/font/alignment announcements, empty placement rejection, and preview skin.
- [ ] **Implement text API:**

```ts
export type TextSubjectDraft = {
  value: string; scale: 0.75 | 1 | 1.35;
  fontId: TextFontId; align: "left" | "center" | "right";
};
export class TextSubjectComposer {
  setDraft(draft: TextSubjectDraft): void;
  getDraft(): TextSubjectDraft;
  focusInitial(): void;
}
```

- [ ] **Ensure export labels are metadata only.** Visible labels and accessible names are product-safe.
- [ ] **Run gallery/composer/drawer tests; commit** `feat(hud): complete subject selection surfaces`.

### Task A4: Audio And Mobile Variants

**Files:** Modify `AudioControl.ts/css`, overlay CSS, HUD accessibility/responsive tests.

- [ ] **Write failing tests** for desktop panel, portrait sheet, landscape tray, safe-area placement, 44px controls, and reduced-motion transition removal.
- [ ] **Use resolver:**

```ts
export function resolveOverlayVariant(input: {
  width: number; height: number; panelFits: boolean;
}): "desktop-panel" | "portrait-sheet" | "landscape-tray";
```

- [ ] **Move audio into the overlay safe-area system** instead of an unrelated fixed capsule.
- [ ] **Run all HUD tests/build; commit** `feat(hud): complete responsive overlay composition`.

### Lane A Reviews

- [ ] Spec reviewer verifies Figma geometry, separate panels, mobile sheets/tray, semantics, focus, no synthetic clicks, and 44px targets.
- [ ] Implementer fixes findings and repeats spec review.
- [ ] Quality reviewer verifies public types, selector ownership, focus cleanup, no document-wide coordination, and responsive CSS.
- [ ] Run `git diff --name-only "$EYES_APPROVED_SHA"...HEAD`; only Lane A files appear.

## Lane B: Bug And Finger Artwork

**Branch:** `overhaul/figma-crowd-assets`

**Owns:** `public/assets/figma/crowd/`, crowd registry/helper, `drawBug.ts`, `drawPointedFinger.ts`, their unit tests.

**Figma:** Bugs `44:287` / canonical art `46:1372`; finger scene `46:905` / canonical art `46:1326`.

### Task B1: Export And Register Artwork

- [ ] **Write failing tests** for local URLs, source nodes, intrinsic dimensions, valid anchors, deterministic selection, and no localhost references.
- [ ] **Export reviewed SVGs** and source metadata.
- [ ] **Implement:**

```ts
export type CrowdArtworkMode = "bugs" | "pointedFinger";
export type CrowdArtworkEntry = Readonly<{
  id: string; mode: CrowdArtworkMode; url: string; sourceNode: string;
  intrinsicWidth: number; intrinsicHeight: number;
  envelope: { widthRatio: number; heightRatio: number; anchorX: number; anchorY: number };
}>;
export function getCrowdArtwork(mode: CrowdArtworkMode, entityId: number): CrowdArtworkEntry;
```

- [ ] **Run registry tests and commit** `assets: add Figma bug and finger artwork`.

### Task B2: Shared Asset Drawer

- [ ] **Write failing tests** for ready/loading/error destination equality and balanced context state.
- [ ] **Implement:**

```ts
export function computeArtworkBounds(input: {
  pos: Vec2; sizePx: number; entry: CrowdArtworkEntry;
}): { x: number; y: number; width: number; height: number };
export function drawCrowdArtwork(ctx: CanvasRenderingContext2D, input: DrawCrowdArtworkInput): void;
```

- [ ] **Use a restrained fallback in identical bounds; never log per frame.**
- [ ] **Run tests and commit** `feat(render): add crowd artwork helper`.

### Task B3: Exact Bug Drawer

- [ ] **Replace paper-cut assertions** with exact asset bounds and deterministic scuttle tests.
- [ ] **Preserve input compatibility** while adding optional image cache and reduced motion.
- [ ] **Use the exact SVG;** remove procedural body/antenna geometry. Reduced motion removes decorative scuttle only.
- [ ] **Run tests and commit** `feat(render): draw exact Figma bugs`.

### Task B4: Exact Finger Drawer

- [ ] **Write asset-bound tests** including complete hand/wrist envelope and normalized intrinsic orientation.
- [ ] **Use simulation rotation as the only live look-at input.** Reduced motion removes decorative shake only.
- [ ] **Run tests and commit** `feat(render): draw exact Figma pointed fingers`.

### Lane B Reviews

- [ ] Spec review confirms exact self-hosted artwork, stable envelopes, deterministic selection, and no renderer/physics changes.
- [ ] Quality review confirms no per-frame allocation/logging, balanced context, and dimension-stable failure states.
- [ ] `git diff --name-only` contains only Lane B paths.

## Lane C: Subjects, VFX, Cursor, Lock

**Branch:** `overhaul/figma-subjects-vfx`

**Owns:** subject leaf drawers, `drawCollectiveEffectVisual.ts`, cursor/lock leaf drawers, render-local metrics, leaf tests.

**Must not modify:** `Renderer.ts`, `main.ts`, HUD, effect definitions/timing, shared tokens, closed files.

### Task C1: Subject Visual Metrics

- [ ] **Write failing tests** covering every illustrated and avatar subject ID.
- [ ] **Implement:**

```ts
export type SubjectVisualMetrics = Readonly<{
  widthRatio: number; heightRatio: number; anchorX: number; anchorY: number;
  crop: "contain" | "cover"; lockRadiusRatio: number;
}>;
export function getSubjectVisualMetrics(skin: SubjectSkin): SubjectVisualMetrics;
```

- [ ] **Run tests and commit** `feat(render): define Figma subject metrics`.

### Task C2: Avatar, Illustrated, And Text Composition

- [ ] **Write failing geometry tests** for exact avatar crop, stable fallback bounds, illustrated envelopes, text alignment/font/truncation, and balanced context.
- [ ] **Apply metrics inside leaf drawers only.** Preserve `SubjectSkin`, dispatch, scale ownership, and manifests.
- [ ] **Remove paper placards around Figma avatars** where the reference uses isolated artwork.
- [ ] **Run subject tests and commit** `feat(render): align subject compositions with Figma`.

### Task C3: Collective VFX

- [ ] **Write failing endpoint tests** for beam, arc, and bite contributor-to-target paths.
- [ ] **Draw contributors to target:**

```ts
ctx.beginPath();
ctx.moveTo(contributor.pos.x, contributor.pos.y);
ctx.lineTo(target.x, target.y);
ctx.stroke();
```

- [ ] **Add `reducedMotion?: boolean`** to suppress jitter/pulse while preserving progress and completion.
- [ ] **Do not edit effect definitions or consume shared RNG.**
- [ ] **Run effect tests and commit** `fix(render): converge collective attacks on target`.

### Task C4: Cursor And Lock

- [ ] **Write failing tests** for default/hover/charging/reduced cursor states and lock radius from subject metrics.
- [ ] **Keep computations pure** and preserve native cursor behavior for coarse pointers.
- [ ] **Keep lock ownership in renderer input;** leaf code changes geometry/paint only.
- [ ] **Run tests and commit** `feat(render): align cursor and lock visuals`.

### Lane C Reviews

- [ ] Spec review confirms registry/dispatch ownership, exact crops, target convergence, existing timing, and leaf-only changes.
- [ ] Quality review confirms deterministic hashes, balanced context, no mutation, and no shared-RNG use.
- [ ] `git diff --name-only` contains only Lane C paths.

## Lane D: QA Harness Expansion

**Branch:** `overhaul/figma-qa`

**Owns:** `tests/browser/**`, `tests/visual/**`, QA scripts, CI workflow. It may request production test seams but cannot edit production without integration-owner approval.

### Task D1: Scenario Matrix

- [ ] **Add fixture expectations** for bugs default, finger default, text subject, reduced motion, and asset failure.
- [ ] **Write browser tests** for cross-browser boot, interactions, keyboard, focus, and console cleanliness.
- [ ] **Keep selectors role/name based** and never use arbitrary sleeps.
- [ ] **Commit** `test: expand deterministic browser scenarios`.

### Task D2: Figma Manifest And References

- [ ] **Create `tests/visual/figma-manifest.json`** mapping nodes `0:1`, `18:113`, `44:287`, `46:905`, `103:3402`, `103:2490`, `103:3579`, `103:3593`, `109:3669` exactly once.
- [ ] **Record** scenario, viewport, DPR 1, seed, time, local reference, baseline, component clip, and deviations.
- [ ] **Add unit test** rejecting missing nodes, localhost references, duplicate nodes, and non-deterministic settings.
- [ ] **Commit** `test: record Figma parity manifest and references`.

### Task D3: Visual Evidence And Audits

- [ ] **Add Chromium baselines** only after ten fresh-page captures hash identically.
- [ ] **Add PNG overlay/difference generator** under `scripts/create-figma-overlays.mjs`.
- [ ] **Add audits** for closed files, localhost runtime URLs, leaked export labels, focused/skipped tests, and staged generated artifacts.
- [ ] **Add CI jobs** for unit/build/audit, cross-browser, and visual parity.
- [ ] **Commit** `test: enforce visual parity release gates`.

### Lane D Reviews

- [ ] Spec review verifies complete node/state/viewport mapping and all approved release gates.
- [ ] Quality review verifies deterministic readiness, no sleeps, strict artifact ownership, and actionable failures.
- [ ] `git diff --name-only` contains only Lane D paths.

## Exit Gate

- [ ] Record each approved lane tip SHA.
- [ ] Run pairwise path-collision checks; expected output is empty.
- [ ] Confirm every lane passes focused tests and build from a clean worktree.
- [ ] Confirm closed-file diff is empty in every lane.
- [ ] Hand immutable lane SHAs and review reports to the Phase 3 integration owner.
