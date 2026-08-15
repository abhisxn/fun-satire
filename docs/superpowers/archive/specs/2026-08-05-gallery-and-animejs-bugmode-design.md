# Sticker/Text Gallery + anime.js Bug Mode — Design

## Context

Four related gaps, all touching the HUD/canvas overlay surface:

1. `hud-btn--bug-mode` (the *toggle*, not Cockroach mode) still runs the old avatar-repel `BugSwarm`/`BugCreature` pair from [2026-08-04-cockroach-and-bug-mode-design.md](2026-08-04-cockroach-and-bug-mode-design.md). It should instead run the crawl behavior prototyped in [bug-crawl-animejs.html](../showcases/bug-crawl-animejs.html): autonomous per-bug wander (chained anime.js tweens to random waypoints) with an independent walking-leg gait, plus click-anywhere-to-drop-a-bug. **Cockroach mode is untouched** — confirmed out of scope; it stays a primary grid mode with avatar-repel physics, unrelated to this toggle.
2. Any canvas sticker must render below the tax-tai avatar (`#draggable`, `DraggableAvatar.ts`, z-index 500) in the stacking order.
3. `GalleryPanel`'s sticker grid is placeholder emoji tiles with no click behavior. It needs to show the real avatar art from `public/avatars/`, and picking one places a draggable sticker on canvas.
4. `GalleryPanel`'s text grid is placeholder cards with no click behavior. It needs a real font gallery; picking one places editable, typeable, scalable text on canvas.

Both (3) and (4) target the same canvas slot: placing a sticker replaces whatever text was there, and placing text replaces whatever sticker was there. Only one gallery-placed item is live at a time. `tax-tai` (the physics-anchor avatar used for repulsion/eye-tracking) is a separate, permanent element — gallery selections never touch it.

## 1. Bug Mode → anime.js crawl behavior

### Dependency
Add `animejs` (v3, matching the showcase) as an npm dependency — bundled by Vite, no CDN/runtime network dependency. `import anime from "animejs"`.

### Asset
The showcase's `<template id="bug-template">` inlines body/antenna paths from `docs/superpowers/assets/icons/bug.svg` with its two multi-subpath leg strokes hand-split into 6 individually-rotatable `<path>` legs (2 tripod groups, A/B). This split geometry doesn't exist as a standalone asset today (`public/creatures/bug.svg` is a flat single sprite used by the old `BugCreature`). Port the template's inline SVG markup directly into the new module (it's small, self-contained, and already hand-tuned) rather than trying to regenerate it from the source icon.

### Module changes
- **Delete** `src/creatures/BugCreature.ts` (the flat-sprite, repel-physics bug). Nothing else references it once `BugSwarm` is rewritten — confirmed `CockroachCreature.ts` is a separate, independent file.
- **Rewrite** `src/creatures/BugSwarm.ts`:
  - Owns an array of bug state objects (position, heading, per-leg gait phase), each backed by two anime.js instances: a `posAnim` (position/heading, re-targets itself via `complete` to a new random waypoint clamped to the viewport) and a `gaitAnim` (loops a `gaitPhase` 0→360, drives `sin(phase)` rotation on each leg, alternating tripod groups — logic ported near-verbatim from the showcase's `wanderTo`/`startGait`).
  - `setActive(true)`: scatters an initial batch (10–16 bugs, matching the showcase's `scatter()`) into the container; also attaches a `click` listener on the container that drops one additional bug at the click point (matching the showcase's click-to-add). `setActive(false)`: pauses every `posAnim`/`gaitAnim` (anime.js instances must be explicitly paused, not just DOM-removed, to stop their internal rAF ticking) and removes the click listener and all bug elements.
  - `update(avatarX, avatarY)`: becomes a no-op and is dropped from the public API — anime.js drives its own rAF loop internally, so the engine tick no longer needs to push bug updates. Remove the `bugSwarm.update(...)` call from `main.ts`'s `engine.onTick`.
  - `isActive()` / `getCount()` stay as-is for interface stability.
- **Delete** `src/physics` coupling for bugs: bug crawl no longer reads `creaturePhysics.ts`'s `PhysicsParams`/`updateCreature` — those stay in place for Cockroach/Eye/Finger modes, which are unaffected.

### Click-to-drop conflict check
`PointerTracker`/`PowerController` already attach `pointerdown`-based listeners to the stage for drag and power interactions. The bug-drop listener is a plain `click` (fires post-`pointerup`, no drag threshold) attached only while Bug Mode is active, so it should be additive rather than conflicting — **verify manually** during implementation that dropping a bug doesn't fire alongside an in-progress drag or power-trigger click, per the project's human-testing convention for anything touching `effects/`/`input/`-adjacent behavior.

### Out of scope
- Cockroach mode (`hud-btn--bug` primary mode) — untouched.
- `hud.css`'s existing `.hud-btn--bug-mode.active` subtle-highlight style — untouched, still correct for the toggle.
- `ForceField.ts` / `Engine.ts` / `CreatureGrid.ts` — untouched.

## 2. Sticker z-index below tax-tai

`DraggableAvatar.el` (`#draggable`, tax-tai) stays at `z-index: 500` — the ceiling for anything gallery-placed. Both new overlay classes (§3, §4) get `z-index: 400`, so tax-tai always renders on top regardless of drag order or placement order. (HUD itself stays at 1000/1001, galleryPanel overlay at 900 — both already above this whole layer and unaffected.)

## 3. Sticker gallery — real stickers, draggable, single-slot replace

### Gallery content
Replace `STICKER_DEFS` (emoji + gradient placeholders) with the real files in `public/avatars/`: `adalat_sharma`, `chronology`, `ethanol`, `gutter`, `kaleshi`, `leak-pradhan`, `mananiya-sadasya`, `naya_leak`, `petroleum`, `reel-minister`, `republic`, `sticker_38`–`sticker_48`, `vishwaguru` (13 total; `tax-tai.png` excluded — it's the permanent avatar, not a gallery pick). `buildStickerCard` renders an `<img>` instead of an emoji div; card interaction/hover styling in `galleryPanel.css` stays as-is.

### New module: `StickerOverlay`
A new draggable canvas element, parallel to `DraggableAvatar` but decorative (no physics/repulsion role):
- Constructed with an image src, appended to `document.body` (or `#stage`, matching where `DraggableAvatar` lives) at `z-index: 400`.
- Drag behavior identical to `DraggableAvatar`'s mouse/touch handlers — see refactor note below.
- Default placement: centered on screen (or wherever the panel was opened from — center is simpler and matches "drop it in, then drag it where you want").
- `setImage(src: string)`: swaps the sticker in place (used when a second sticker is picked while one is already active — no need to destroy/recreate).

### Wiring
`GalleryPanel` needs a selection callback (`onStickerSelect(cb: (src: string) => void)`) fired when a sticker card is clicked. `main.ts` owns a single `activeOverlay: StickerOverlay | TextOverlay | null` slot:
- On sticker select: if a `TextOverlay` is active, destroy it; if a `StickerOverlay` is already active, `setImage()`; otherwise construct a new `StickerOverlay` and store it as `activeOverlay`.
- Mirrored for text select (§4).

## 4. Text gallery — real fonts, replaces sticker/text, typeable + scalable

### Gallery content
Replace the 8 identical "Fraunces" placeholder cards with 8 distinct fonts, each card previewing its own name in its own face (e.g. `Fraunces`, `Bungee` — both already referenced in the codebase — plus new Google Fonts pulled in the same `@import url(...)` way `hud.css` already loads Bungee: candidates `Space Grotesk`, `Anton`, `Caveat`, `Playfair Display`, `Archivo Black`, `DM Serif Display`). Add the `@import` line(s) to `galleryPanel.css` (or a new `fonts.css`) alongside the existing Bungee import in `hud.css`.

### New module: `TextOverlay`
A draggable, editable, scalable canvas element:
- A `contenteditable` `div` (not `input`/`textarea`, so it inherits the free-form font/size styling and stays trivially draggable) with the selected `font-family`, default placeholder text (e.g. "Type here"), positioned/dragged the same way as `StickerOverlay`/`DraggableAvatar`, `z-index: 400`.
- Typing: click to focus and edit inline (contenteditable handles this natively); a drag-start on the text itself should not fight with caret placement — use a small drag handle or require a modifier/border-grab zone, mirroring how design tools typically separate "grab to move" from "click to edit" (concrete UX left to implementation, but the two interactions must not fight each other).
- Scaling: a corner resize handle (visible on hover/focus) drags to set `font-size` (scale, not container width/height, so the text re-flows naturally).
- `setFont(fontFamily: string)`: swaps the face in place if a `TextOverlay` is already active (same "replace vs already-active" logic as stickers).

### Wiring
Same pattern as §3: `GalleryPanel.onTextSelect(cb: (fontFamily: string) => void)`, `main.ts`'s `activeOverlay` slot swap logic (destroy the other type, or update the current one).

## Shared: drag behavior extraction

`DraggableAvatar`, `StickerOverlay`, and `TextOverlay` all need the same mouse/touch drag lifecycle (`mousedown`/`mousemove`/`mouseup` + `touchstart`/`touchmove`/`touchend`, offset tracking, `attach()`/`detach()`). Three near-identical ~60-line copies is exactly the "same three lines" case the project's anti-duplication convention is meant to catch — extract a small shared helper (e.g. `src/creatures/makeDraggable.ts` exporting `attachDrag(el, onMove): { detach(): void }`) and refactor `DraggableAvatar` to use it alongside the two new overlays. This is the one new shared utility this spec introduces; no other abstraction is proposed.

## Out of scope

- No changes to `ForceField.ts`, `Engine.ts`, `StateMachine.ts`, `EntityStore.ts`, or `CreatureGrid.ts` (all four items here are HUD/overlay-layer work).
- No persistence — gallery selections and dropped bugs reset on page reload, matching current behavior for `DraggableAvatar`'s position.
- No multi-sticker or multi-text canvas (single active slot, per the "replaces" requirement).
- Cockroach mode, Eye mode, Point mode — untouched.

## Testing

- Unit tests: `BugSwarm` spawn/click-drop count, `setActive` toggling creates/removes DOM + pauses anime instances; `StickerOverlay`/`TextOverlay` construction, `setImage`/`setFont`, and the `activeOverlay` slot-replacement logic in isolation (mock DOM).
- Manual (required — this spec touches `render/`/`effects/`-adjacent overlay and HUD-triggered visuals per the project's human-testing convention): toggle Bug Mode in each of Eye/Cockroach/Point mode and confirm wander + leg-walk + click-to-drop all work without fighting existing pointer/power interactions; open the gallery, place a sticker, drag it, place a different sticker (confirms swap-in-place), place text (confirms sticker is destroyed), type into the text, drag the resize handle, place another sticker (confirms text is destroyed); confirm tax-tai always renders above any placed sticker/text at every drag position.
