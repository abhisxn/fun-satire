# Figma-First Overhaul Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an approved, deterministic eyes-mode vertical slice using exact Figma assets, semantic HUD components, adaptive mobile composition, and objective parity evidence.

**Architecture:** Add tokens, assets, readiness, and browser fixtures before changing visuals. Keep simulation state and paint order intact; make leaf drawers and DOM components consume reviewed contracts.

**Tech Stack:** TypeScript, Canvas 2D, DOM/CSS, Vitest, Playwright, axe-core, Figma SVG/PNG exports.

---

## Task 1: Semantic Visual Tokens

**Files:** Create `src/config/visualTokens.json`, `src/config/visualTokens.ts`, `scripts/generate-visual-tokens.mjs`; modify `src/config/tokens.ts`, `src/styles/tokens.css`, `tests/unit/tokens.test.ts`, `package.json`.

- [ ] **Write the failing parity test.** Assert stage colors `#ebe9e0/#cdc0b8/#aa988e`, 542x70 bar, 46px wells, 44px touch minimum, 139x170 filter panel, and 284px gallery. Remove exact palette-count and Figma-color bans.
- [ ] **Run red:** `npm test -- tests/unit/tokens.test.ts`. Expected: missing `visualTokens` module.
- [ ] **Create the inventory and typed export:** 

```ts
import inventory from "./visualTokens.json";
export const UI_TOKENS = Object.freeze(inventory);
export const CANVAS_ART = Object.freeze({
  cream: "#EDE7DD", slate: "#5B7A8C", sage: "#6D7A5E",
  ink: "#2A2420", coral: "#E8A9A0",
});
export const PALETTE = CANVAS_ART;
```

- [ ] **Generate CSS and drift check.** Add `tokens:generate` and `tokens:check`; make `build` run `tokens:check` before `tsc && vite build`.
- [ ] **Run green:** `npm run tokens:generate && npm test -- tests/unit/tokens.test.ts && npm run build`.
- [ ] **Commit:** `git commit -am "feat: establish figma semantic visual tokens"` after staging new files.

## Task 2: Audited Figma Asset Export

**Files:** Create `figma-assets.source.json`, `scripts/export-figma-assets.mjs`, `public/assets/figma/{eyes,subjects,icons,references}/`, `src/assets/figmaAssetRegistry.ts`, `src/assets/eyeAssetRegistry.ts`, `tests/unit/figmaAssetRegistry.test.ts`.

- [ ] **Write failing registry tests.** Require local `/assets/figma/` URLs, positive dimensions, unique IDs, stable eye selection, and no runtime `localhost:3845`.
- [ ] **Run red:** `npm test -- tests/unit/figmaAssetRegistry.test.ts`. Expected: registry missing.
- [ ] **Export all assets used by nodes `18:113`, `103:2490`, `103:3579`, `103:3593`, and `109:3669`.** Record node ID, source hash, destination, dimensions, and SHA-256.
- [ ] **Implement the registry:**

```ts
export type FigmaAssetEntry = Readonly<{
  id: string; role: "eye" | "subject" | "control-icon" | "reference";
  nodeId: string; url: string; width: number; height: number;
  requiredFor: readonly string[];
}>;
export const FIGMA_ASSETS = Object.freeze([...entries] satisfies readonly FigmaAssetEntry[]);
export function requiredAssetsFor(id: string): readonly FigmaAssetEntry[] {
  return FIGMA_ASSETS.filter((entry) => entry.requiredFor.includes(id));
}
```

- [ ] **Verify:** `npm run figma:verify && npm test -- tests/unit/figmaAssetRegistry.test.ts`; `rg -n "localhost:3845" src public` prints nothing.
- [ ] **Commit:** `git commit -m "feat: add audited self-hosted figma assets"`.

## Task 3: Awaitable Image Readiness

**Files:** Modify `src/render/imageAssets.ts`, `tests/unit/imageAssets.test.ts`; create `tests/unit/visualAssetReadiness.test.ts`.

- [ ] **Write failing tests** for decode-before-ready, concurrent-load deduplication, one warning per failed URL, and dimension-stable error state.
- [ ] **Run red:** `npm test -- tests/unit/imageAssets.test.ts tests/unit/visualAssetReadiness.test.ts`. Expected: `load` absent.
- [ ] **Implement:**

```ts
export type AssetLoadResult =
  | { url: string; status: "ready"; image: HTMLImageElement }
  | { url: string; status: "error"; error: Error };
export class ImageAssetCache {
  get(url: string): ImageAssetEntry;
  load(url: string): Promise<AssetLoadResult>;
  preload(urls: readonly string[]): Promise<readonly AssetLoadResult[]>;
  hasFailure(url: string): boolean;
}
```

- [ ] **Run green** with the focused tests and commit `feat: expose deterministic image asset readiness`.

## Task 4: Deterministic Fixture Runtime

**Files:** Create `src/testing/visualFixture.ts`, `src/testing/eyesFixtures.ts`, `tests/unit/visualFixture.test.ts`; modify `src/main.ts`, `src/vite-env.d.ts`, `tests/unit/boot.test.ts`.

- [ ] **Write failing parser tests** for `eyes-default`, `eyes-filter`, `eyes-gallery`, `eyes-attack`, fixed seed/time, and unknown fixture rejection.
- [ ] **Run red:** `npm test -- tests/unit/visualFixture.test.ts tests/unit/boot.test.ts`.
- [ ] **Implement the explicit contract:**

```ts
export type VisualFixtureId = "eyes-default" | "eyes-filter" | "eyes-gallery" | "eyes-attack";
export type VisualFixtureConfig = Readonly<{
  id: VisualFixtureId; seed: number; nowMs: number; quantity: number;
  panel: "none" | "filter" | "gallery"; attackProgress: number | null;
}>;
export function readVisualFixture(search: string): VisualFixtureConfig | null;
```

- [ ] **Wire existing injection seams only.** Pass fixed `now` to `Engine`; do not edit `Engine.ts`. Await required assets and `document.fonts.ready`, render once, then set `document.documentElement.dataset.visualReady` and `window.__FUN_SATIRE_VISUAL__`.
- [ ] **Run green:** focused tests plus `npm run build`; commit `feat: add deterministic visual fixture runtime`.

## Task 5: Playwright And Determinism Gate

**Files:** Create `playwright.config.ts`, `tests/browser/helpers/visualFixture.ts`, `tests/browser/boot.spec.ts`, `tests/browser/determinism.spec.ts`; modify `package.json`, lockfile, `.gitignore`.

- [ ] **Run red:** `npm run test:browser:boot`. Expected: missing script.
- [ ] **Install:** `npm install -D @playwright/test @axe-core/playwright && npx playwright install chromium firefox webkit`.
- [ ] **Configure** Chromium, Firefox, WebKit, and `visual-chromium` at 1280x832/DPR 1.
- [ ] **Implement readiness helper:**

```ts
export async function openVisualFixture(page: Page, id: string): Promise<void> {
  await page.goto(`/?visualFixture=${id}`);
  await page.waitForFunction(() => window.__FUN_SATIRE_VISUAL__?.ready === true);
}
```

- [ ] **Assert ten screenshot SHA-256 hashes are identical** and collect console/page errors.
- [ ] **Run green:** `npm run build && npm run test:browser:boot && npm run test:determinism`; commit `test: bootstrap deterministic playwright fixtures`.

## Task 6: Exact Eyes With Live Gaze

**Files:** Modify `src/render/drawers/drawEye.ts`, `src/render/Renderer.ts`, `tests/unit/drawEye.test.ts`, `tests/unit/rendererCrowdDispatch.test.ts`; create `tests/unit/eyeAssetGeometry.test.ts`.

- [ ] **Write failing geometry tests** for exact intrinsic ratio, iris offset, blink scale, stable asset selection, fallback bounds, balanced context state, and the three-stop radial stage gradient.
- [ ] **Run red:** focused eye tests. Expected: no asset-aware input or `drawImage` call.
- [ ] **Implement the leaf input:**

```ts
export type DrawEyeInput = {
  pos: Vec2; visualWidthPx: number; asset: EyeAssetEntry;
  imageCache: ImageAssetCache; blinkScaleY: number;
  pupilOffset: Vec2; rotation: number;
};
```

- [ ] **Draw** the exact socket asset, clip to the exported path, then draw the exact iris at source coordinates plus live pupil offset. Loading/error uses the same envelope.
- [ ] **Wire renderer dispatch without changing paint order.** Replace the flat Canvas clear color with a radial gradient using the semantic stage center/mid/outer tokens.
- [ ] **Run green** and commit `feat: render figma eye assets with live gaze`.

## Task 7: Semantic Control Bar

**Files:** Create `src/hud/ControlBar.ts`, `src/hud/controlBar.css`, `tests/unit/controlBar.test.ts`; modify `src/hud/Hud.ts`, `src/hud/hudIcons.ts`, existing HUD tests, fonts/dependencies.

- [ ] **Write failing tests** for native buttons, independent mode selection, `aria-pressed`, panel `aria-expanded`, and native Attack `disabled`.
- [ ] **Install exact core fonts:** `npm install @fontsource/inter @fontsource/bungee`.
- [ ] **Implement:**

```ts
export type ControlBarState = Readonly<{
  mode: HudMode; filterExpanded: boolean; galleryExpanded: boolean;
  attackDisabled: boolean; attackPressed: boolean;
}>;
export class ControlBar {
  constructor(root: HTMLElement, callbacks: ControlBarCallbacks);
  setState(state: ControlBarState): void;
  getFilterTrigger(): HTMLButtonElement;
  getGalleryTrigger(): HTMLButtonElement;
}
```

- [ ] **Render the exact exported control SVGs** from the typed Figma asset registry; selected wells remain state surfaces rather than alternate icon geometry.
- [ ] **Style** 542x70 glass capsule, 46px wells, exact green selected well and orange Attack. Remove torn HUD SVG/grain and superseded source-string tests.
- [ ] **Run focused HUD tests and build; commit** `feat: replace placard with semantic figma control bar`.

## Task 8: Filter Panel

**Files:** Create `src/hud/FilterPanel.ts`, `src/hud/filterPanel.css`, `tests/unit/filterPanel.test.ts`; modify `Hud.ts` and HUD controls tests.

- [ ] **Write failing tests** for quantity clamp, repel callback, closed `hidden`/`inert`, focus on open, Escape, and trigger restoration.
- [ ] **Implement:**

```ts
export class FilterPanel {
  constructor(root: HTMLElement, trigger: HTMLButtonElement, callbacks: FilterPanelCallbacks);
  setState(state: { open: boolean; quantity: number; repelMultiplier: number }): void;
  open(): void; close(): void; isOpen(): boolean;
}
```

- [ ] **Style** 139x170 desktop geometry and mobile sheet variant; keep native range input and 44px hit areas.
- [ ] **Run tests and commit** `feat: add accessible figma filter panel`.

## Task 9: Avatar Gallery

**Files:** Create `src/hud/AvatarGallery.ts`, `src/hud/avatarGallery.css`, `tests/unit/avatarGallery.test.ts`; modify avatar registry, `SubjectDrawer.ts`, `Hud.ts`, `main.ts`, and tests.

- [ ] **Write failing tests** for 2-column cards, lazy decode, semantic labels, `aria-pressed`, focus lifecycle, and no visible export names.
- [ ] **Implement** `open(): Promise<void>`, `close()`, `toggle()`, `setSelected()`, and `isOpen()` with explicit trigger ownership.
- [ ] **Replace synthetic click coordination** with `hud.toggleAvatarGallery()`; verify `rg -n "dispatchEvent\(new MouseEvent" src` has no panel bridge.
- [ ] **Style** 284px desktop panel, 120px cards, 88px art, portrait peek sheet, landscape tray.
- [ ] **Run focused tests and commit** `feat: add accessible figma avatar gallery`.

## Task 10: Canonical Subject And Eyes Attack

**Files:** Modify `src/main.ts`, `drawSubjectAvatar.ts`, `drawCollectiveEffectVisual.ts`, related tests; create `tests/unit/eyesVerticalSlice.test.ts`.

- [ ] **Write failing tests** proving DOM Attack targets the locked subject without active Canvas cursor and every beam path runs contributor-to-target.
- [ ] **Introduce the control-source contract and locked-target adapter:**

```ts
export type ChargeSource =
  | { kind: "canvas"; point: Vec2 }
  | { kind: "control" };

// PowerController public API
tryPress(targetId: EntityId, source: ChargeSource, nowMs: number): boolean;

export function pressLockedSubject(input: {
  subjectId: EntityId | null; store: EntityStore; nowMs: number;
  power: Pick<PowerController, "tryPress">;
}): boolean;
```

- [ ] **Apply pointer-range cancellation only to Canvas-origin charging.** HUD passes `{ kind: "control" }`; Canvas passes `{ kind: "canvas", point }`. Preserve thresholds, cooldown, effect IDs, destruction, and respawn.
- [ ] **Fix beam geometry:** `moveTo(contributor.pos.x, contributor.pos.y); lineTo(target.x, target.y);` while preserving effect timing.
- [ ] **Use exact central subject crop** and mapped glow colors for node `109:3669`.
- [ ] **Run focused tests and commit** `feat: complete eyes target and collective attack`.

## Task 11: Independent Responsive Policies

**Files:** Create `src/hud/OverlayLayout.ts`, `src/hud/overlayLayout.css`, `tests/unit/overlayLayout.test.ts`; modify overlay CSS, global CSS, tokens, `main.ts`.

- [ ] **Write failing resolver tests:**

```ts
export type OverlayVariant = "desktop" | "tablet" | "portrait-phone" | "landscape-phone";
export function resolveOverlayVariant(input: { width: number; height: number }): OverlayVariant;
export function resolveSceneScale(input: { width: number; height: number }): number;
```

- [ ] **Assert** 390x844 scene scale is smaller than 1280x832 while visible control wells remain 46px.
- [ ] **Implement safe-area composition** with no `#stage` transform and no horizontal document overflow.
- [ ] **Run tests/build and commit** `feat: adapt eyes scene and overlays responsively`.

## Task 12: Eyes Vertical-Slice Acceptance

**Files:** Create eyes browser specs, Figma reference PNGs, and reviewed Playwright baselines.

- [ ] **Add role-based interaction tests** for mode, filter, quantity, repel, gallery, avatar, keyboard Attack, Escape, and focus restoration.
- [ ] **Add axe test** rejecting serious/critical violations.
- [ ] **Add viewport matrix** for 320x568, 390x844, 844x390, 768x1024, 1280x832, 1440x900. Assert containment, no scroll, target visibility, and 44px touch targets.
- [ ] **Capture deterministic baselines** for eyes default/filter/gallery/attack only after ten-capture stability passes.
- [ ] **Generate Figma overlays** for mapped nodes and obtain visual approval.
- [ ] **Run full gate:** `npm ci && npm test && npm run build && npm run test:browser:cross && npm run test:a11y && npm run test:responsive && npm run test:determinism && npm run test:visual`.
- [ ] **Run closed-file audit** and commit `test: gate eyes slice visual and browser fidelity`.
- [ ] **Record and tag approved SHA** as `figma-eyes-approved-2026-07-28`.
