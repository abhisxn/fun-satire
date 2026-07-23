# Browser matrix (T24)

The automated unit suite covers resize, DPR clamping, viewport listeners, and per-frame math deterministically (216/216 tests across 25 files). The browser-matrix portion of T24 (`docs/superpowers/plans/2026-07-23-fun-satire-v1-plan.md:107`) requires a real browser and was not run inside this session.

## Manual checks to perform before shipping

These are blocking per the plan's exit criteria. They are not automated because the dev environment lacks a browser runtime.

- [ ] **Chromium 1280×720 and 1440×900** — verify first-paint, idle frame, cursor render, drag, charge-and-burn, respawn.
- [ ] **Firefox (latest) at the same sizes** — same checklist.
- [ ] **Safari 17+ on macOS** — same checklist; watch for font-weight fallback on Fraunces Variable italic.
- [ ] **Mobile emulator 390×844 portrait + landscape** — touch-drag moves eye, tap-and-hold charges and burns, early lift cancels, HUD respects safe-area-inset.
- [ ] **Resize test** — drag window across breakpoints; eye homes re-project into the new viewport; HUD never clips.
- [ ] **DPR test** — toggle devicePixelRatio (browser zoom or `cmd-+` on macOS); canvas stays crisp; no scale-on-scale accumulation.

## Automated checks already wired

| Concern | Where | Test |
|---|---|---|
| `applyDpr` math | `src/render/CanvasUtils.ts` | `tests/unit/viewport.test.ts:11-37` |
| dpr clamp [1, 3] | `src/render/CanvasUtils.ts:6` | `tests/unit/viewport.test.ts:18-23` |
| `resize` listener | `src/render/CanvasUtils.ts:51-56` | `tests/unit/viewport.test.ts:46-58` |
| Touch / pointer events | `src/input/PointerTracker.ts` | `tests/unit/pointerTracker.test.ts` |
| Static deploy config | `vercel.json` | `package.json:scripts.build` |

## Notes for the eventual browser run

- The `Engine` accepts injectable RAF/time sources (`src/core/Engine.ts:EngineOptions`) which a Playwright fixture can drive to make E2E deterministic.
- `Rng.fromQueryString("?seed=N", fallback)` (in `src/core/Rng.ts`) seeds the layout; use this in any browser snapshot test to make eye positions reproducible.
- `PowerController.cooldownMs` and `targetRadius` are exported via `PowerControllerArgs` so a Playwright test can verify the threshold/cancel behavior with explicit dtMs values.
