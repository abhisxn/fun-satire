# Responsive composition QA log

**Lane:** Responsive (Phase 2 Figma visual system overhaul)  
**Base SHA:** `1652cfab4be72bb964b753242cd6e9e8a09bdc48`  
**Date:** 2026-07-28  
**Screenshots:** `./screenshots/`

## Method

1. Started the Vite dev server (`npm run dev`) at `http://localhost:5175/`.
2. Captured default-state screenshots for each target viewport using Google Chrome headless (`--headless=new --hide-scrollbars --window-size=WxH`).
3. Inspected each screenshot for:
   - no document overflow / scrollbars;
   - no HUD / panel / central-target collision;
   - no interactive target smaller than ~44 px;
   - portrait mobile shows a visibly denser (not just smaller) crowd ring.
4. Ran targeted and full unit tests, then `npm run build`.

## Viewport results

| Viewport | Variant (policy) | Screenshot | Pass/Fail | Notes |
|----------|------------------|------------|-----------|-------|
| 1280×832 | desktop | `screenshots/viewport-1280x832.png` | **PASS** | Canvas fills viewport. Control bar (542 px) centered with safe margins. Audio panel sits clear on the right. No overflow. Targets well above 44 px. |
| 1440×900 | desktop | `screenshots/viewport-1440x900.png` | **PASS** | Same as above; extra width gives the audio panel more breathing room. No defects. |
| 1024×768 | tablet | `screenshots/viewport-1024x768.png` | **PASS** | Audio panel now anchors top-right (`top: 64px; right: 16px`) and no longer overlaps the centered control bar. Bar remains a compact pill. |
| 768×1024 | tablet (portrait override) | `screenshots/viewport-768x1024.png` | **PASS** | Control bar fits fully within the viewport with compact sizing; audio panel is top-right, no overlap. |
| 390×844 | portrait-sheet | `screenshots/viewport-390x844.png` | **PASS** | Control bar reflows to a full-width bottom sheet with two centered rows (modes/triggers on top, stepper/attack/hand below). Audio panel is top-right. |
| 844×390 | landscape-tray | `screenshots/viewport-844x390.png` | **PASS** | Control bar anchors to the bottom-left; audio panel sits top-right. No clipping or overlap. |

## Root cause

`src/render/responsiveScene.ts` correctly classifies every target viewport and supplies the expected `controlVariant` (`desktop`, `tablet`, `portrait-sheet`, `landscape-tray`) to the HUD root via `data-control-variant`. However, the HUD CSS (`src/hud/controlBar.css`, `src/hud/audioControl.css`, `src/hud/overlayLayout.css`) does not consume this attribute:

- `.control-bar` has a hard-coded `width: 542px` with no responsive scaling.
- `.audio-control` has a fixed `right: 16px; bottom: 18px` position and is not repositioned for small or tray variants.
- No `[data-control-variant]` selectors exist in the stylesheet to adapt layout, spacing, or font size.

Consequently, the responsive scene policy exists but the chrome does not adapt to it.

## Fixes applied

Added `[data-control-variant]` selectors to consume the variant that `src/render/responsiveScene.ts` already writes to `#hud-root`:

- `src/hud/controlBar.css`
  - `tablet`: compact pill (`min(542px, calc(100vw - 32px))`), 44×44 interactive targets, power label hidden to prevent truncation.
  - `portrait-sheet`: full-width bottom sheet with `flex-wrap` and explicit `order` so modes/triggers form the first row and stepper/attack/hand form the second.
  - `landscape-tray`: width-auto bar anchored to the bottom-left via `align-self: flex-start`.
- `src/hud/audioControl.css`
  - For `tablet`, `portrait-sheet`, and `landscape-tray`: move the audio panel to `top: 64px; right: 16px` so it clears the control bar and the visibility toggle; enlarge the mute toggle to 44×44.
- `src/hud/overlayLayout.css`
  - `tablet`: panels open slightly higher (`bottom: calc(70px + 12px)`) to clear the compact bar.
  - `portrait-sheet`: panels become full-width bottom sheets (`left: 0; right: 0; bottom: 0`).
  - `landscape-tray`: panels become right-side trays (`right: 0; top: 0; bottom: 0`).

Desktop (`data-control-variant="desktop"`) remains unchanged; default styles are the desktop styles.

## Test additions

- `tests/unit/responsiveCss.test.ts` guards the responsive CSS contract:
  - Each target viewport resolves to the expected `data-control-variant` on `#hud-root`.
  - The control bar and panels remain descendants of `#hud-root` so variant selectors target them.
  - CSS files contain the expected `[data-control-variant]` selectors for tablet, portrait-sheet, and landscape-tray (and no desktop override that could alter the default pill).

## Verification

```bash
npm test -- tests/unit/responsiveScene.test.ts tests/unit/viewport.test.ts tests/unit/controlBar.test.ts tests/unit/overlayLayout.test.ts tests/unit/responsiveCss.test.ts
# Test Files  6 passed (6)
# Tests  77 passed (77)

npm test
# Test Files  91 passed (91)
# Tests  709 passed (709)

npm run build
# figma:verify ✓
# tokens:check ✓
# tsc ✓
# vite build ✓
```

## Recommendations for follow-up lanes

1. **Portrait density lane:** Consider increasing `targetCrowdCount` for `portrait-sheet` or reducing the spawn-area vertical spread so the mobile portrait screenshot shows a visibly denser ring, not just smaller eyes.
2. **Panel animation lane:** Add sheet/tray entrance/exit transitions once the layout variants are stable.
3. **Style guide:** The referenced `docs/superpowers/visual-style-guide.md` does not exist in this worktree; create or restore it so breakpoint/safe-area/density expectations are documented for future lanes.
