# Sticker/Text Gallery + anime.js Bug Mode — Implementation Plan

Design: [2026-08-05-gallery-and-animejs-bugmode-design.md](../specs/2026-08-05-gallery-and-animejs-bugmode-design.md)

Four independent-ish workstreams; suggested order below front-loads the shared drag helper so both overlay classes can use it from the start.

## Task 1 — Extract shared drag helper

- New `src/creatures/makeDraggable.ts`: pull the mouse/touch drag lifecycle out of `DraggableAvatar.ts` (lines ~37–102) into `attachDrag(el: HTMLElement, initial: {x,y}, onMove?: (x,y) => void)` returning `{ detach(), getPosition(), isDragging() }`.
- Refactor `DraggableAvatar` to use it; re-run existing tests for it if any exist, confirm no behavior change (still `#draggable`, still z-index 500, still same drag feel).
- Manual check: drag tax-tai around, confirm identical feel to before refactor.

## Task 2 — Bug Mode rewrite (anime.js)

- `npm install animejs` (+ `@types/animejs` if available/needed under `verbatimModuleSyntax`).
- Delete `src/creatures/BugCreature.ts`.
- Rewrite `src/creatures/BugSwarm.ts` per spec §1: bug state objects, `posAnim`/`gaitAnim` per bug, inline the showcase's split-leg SVG template, `setActive`/`isActive`/`getCount` public API, click-to-drop listener scoped to active state, drop `update()` from the public API.
- `main.ts`: remove `bugSwarm.update(center.x, center.y)` from `engine.onTick`; keep `hud.onBugModeToggle((active) => bugSwarm.setActive(active))` as-is.
- Unit tests: spawn count on activate, DOM element count matches `getCount()`, `setActive(false)` removes all elements and pauses anime instances (spy/mock `anime`), click-to-drop increments count by 1.
- Manual test (required): toggle Bug Mode on in each of Eye/Cockroach/Point mode, confirm wander + independent leg-walk gait render correctly, click empty canvas drops a bug, toggle off clears everything, no console errors from orphaned anime.js tweens.

## Task 3 — Sticker overlay + real gallery

- New `src/creatures/StickerOverlay.ts` using `makeDraggable`: image element, `z-index: 400`, `setImage(src)`.
- `GalleryPanel.ts`: replace `STICKER_DEFS` placeholders with the 13 real `public/avatars/*.png` files (list in spec §3, `tax-tai.png` excluded); `buildStickerCard` renders `<img src>` instead of emoji+gradient div; add `onStickerSelect(cb)` firing the clicked file's src.
- `main.ts`: own the `activeOverlay: StickerOverlay | TextOverlay | null` slot; wire `galleryPanel.onStickerSelect(...)` to construct/`setImage`/swap per spec's slot-replacement logic.
- Unit tests: `StickerOverlay` construction/`setImage`; slot-replacement logic (sticker→sticker updates in place, text→sticker destroys the text instance first).
- Manual test (required): open gallery, confirm all 13 real avatar thumbnails render (not emoji placeholders), click one → appears centered on canvas below tax-tai, drag it around, click a different sticker → swaps in place (same overlay instance, doesn't duplicate), confirm z-index stacking (tax-tai always on top) by dragging the sticker under/over tax-tai's position.

## Task 4 — Text overlay + font gallery

- Add Google Fonts `@import` lines for the new font set (spec §4 candidates) to `galleryPanel.css`, alongside confirming `Fraunces`/`Bungee` are actually loaded (currently only Bungee has an `@import` — Fraunces is referenced but never loaded; fix that gap here too, in `galleryPanel.css` or a shared fonts import).
- New `src/creatures/TextOverlay.ts` using `makeDraggable`: `contenteditable` div, `z-index: 400`, resize-handle-driven `font-size` scaling, `setFont(fontFamily)`.
- `GalleryPanel.ts`: `buildTextCard` already previews each font's own name — keep that, just diversify `TEXT_FONTS` beyond the current all-Fraunces list; add `onTextSelect(cb)` firing the clicked font family.
- `main.ts`: wire `galleryPanel.onTextSelect(...)` into the same `activeOverlay` slot logic (text→text updates font in place, sticker→text destroys the sticker first).
- Unit tests: `TextOverlay` construction/`setFont`; slot-replacement (text↔sticker mutual exclusion), resize handle updates `font-size` without changing position.
- Manual test (required): place text, confirm it's editable (click, type replaces placeholder), drag it without entering edit mode, drag the resize handle and confirm font-size scales smoothly, place a sticker → text instance is destroyed, place text again → confirm it reappears with default/placeholder state (not stale typed content from a destroyed instance).

## Cross-cutting

- After all four tasks: full manual pass per spec's "Testing" section — bug mode across all 3 primary modes, full sticker↔text↔sticker swap chain, z-index check, no regressions in existing drag/power/HUD interactions.
- `npm test` and `npm run build` clean before calling this done.
