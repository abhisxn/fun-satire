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
| 1024×768 | tablet | `screenshots/viewport-1024x768.png` | **FAIL** | The fixed 542 px control bar still fits mathematically, but the audio panel (fixed `right: 16px; bottom: 18px`) visually overlaps the control bar’s right end and truncates the "LASER BURN" power label. This is a CSS layer collision, not a scene-policy bug. |
| 768×1024 | tablet (portrait override) | `screenshots/viewport-768x1024.png` | **FAIL** | Control bar is clipped on the right side; only the left portion (mode buttons through the quantity stepper) is visible. The 542 px fixed width exceeds the usable horizontal space once safe areas and panel gutters are considered. |
| 390×844 | portrait-sheet | `screenshots/viewport-390x844.png` | **FAIL** | Control bar is severely clipped; only the eye-mode button and a sliver of the next controls are visible. The fixed 542 px bar is far wider than the 390 px viewport. Crowd ring is smaller but not visibly denser because the narrow viewport forces vertical spreading. |
| 844×390 | landscape-tray | `screenshots/viewport-844x390.png` | **FAIL** | Control bar is clipped on the right; audio panel overlaps the control bar area and obscures the power label. The 542 px bar plus the audio panel exceed the 844 px width budget. |

## Root cause

`src/render/responsiveScene.ts` correctly classifies every target viewport and supplies the expected `controlVariant` (`desktop`, `tablet`, `portrait-sheet`, `landscape-tray`) to the HUD root via `data-control-variant`. However, the HUD CSS (`src/hud/controlBar.css`, `src/hud/audioControl.css`, `src/hud/overlayLayout.css`) does not consume this attribute:

- `.control-bar` has a hard-coded `width: 542px` with no responsive scaling.
- `.audio-control` has a fixed `right: 16px; bottom: 18px` position and is not repositioned for small or tray variants.
- No `[data-control-variant]` selectors exist in the stylesheet to adapt layout, spacing, or font size.

Consequently, the responsive scene policy exists but the chrome does not adapt to it.

## Fixes attempted / blocked

- This lane’s allowlist is limited to `src/render/responsiveScene.ts`, `tests/unit/responsiveScene.test.ts`, `tests/unit/viewport.test.ts`, and `docs/superpowers/plans/screenshot-comparisons/`.
- The actual clipping/overlap defects live in the HUD CSS, which is outside the allowlist.
- No changes were made to `src/render/responsiveScene.ts` because its classification logic already matches the style-guide breakpoints (desktop ≥1200, tablet ≥900, phone/tablet floor ≥700, portrait/landscape split by aspect ratio) and all existing/targeted tests pass.

## Test additions

Added focused unit tests in `tests/unit/responsiveScene.test.ts` to guard the viewport-to-policy mapping that the screenshots rely on:

- Boundary at 1200 px width (desktop threshold).
- Boundary at 900 px width (tablet threshold).
- Boundary at 700 px shorter edge (phone/tablet floor).
- Square small viewport (e.g. 699×699) resolves to a non-desktop variant.
- Landscape phone (844×390) and portrait phone (390×844) never resolve to desktop or tablet.

## Verification

```bash
npm test -- tests/unit/responsiveScene.test.ts tests/unit/viewport.test.ts
# Test Files  2 passed (2)
# Tests  23 passed (23)

npm test
# Test Files  90 passed (90)
# Tests  701 passed (701)

npm run build
# figma:verify ✓
# tokens:check ✓
# tsc ✓
# vite build ✓
```

## Recommendations for follow-up lanes

1. **HUD responsive chrome lane:** Add `[data-control-variant]` selectors or media queries to `src/hud/controlBar.css`, `src/hud/audioControl.css`, and `src/hud/overlayLayout.css` so the control bar shrinks/reflows and the audio panel relocates on `tablet`, `portrait-sheet`, and `landscape-tray`.
2. **Portrait density lane:** Consider increasing `targetCrowdCount` for `portrait-sheet` or reducing the spawn-area vertical spread so the mobile portrait screenshot shows a visibly denser ring, not just smaller eyes.
3. **Style guide:** The referenced `docs/superpowers/visual-style-guide.md` does not exist in this worktree; create or restore it so breakpoint/safe-area/density expectations are documented for future lanes.
