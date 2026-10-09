# Polish, performance, time of day and atmosphere: plan

> Status: **proposed, not started**. Independent of gameplay. Gameplay, the Protest button, the strength meter and stage rules are parked in [../specs/2026-10-09-gameplay-arc-and-lure-PARKED.md](../specs/2026-10-09-gameplay-arc-and-lure-PARKED.md) and are out of scope here.

Constraints from `CLAUDE.md` apply throughout: every module is a pure export with side effects only in `src/main.ts`; `ForceField.ts` and `Engine.ts` are deliberate-review exceptions; any task touching `physics/`, `creatures/`, `audio/` or `hud/` needs a browser check with `npm run dev` before it is called done; markdown files stay under 500 lines.

## Order of work

| # | Workstream | Size | Depends on |
|---|---|---|---|
| 1 | Performance baseline (benchmark first) | S | none |
| 2 | Asset diet | M | 1 |
| 3 | Intro copy lint and card polish | S-M | none |
| 4 | Time-of-day system | M | 1 |
| 5 | Atmosphere layers (dust, smoke, rain) | M | 4 |
| 6 | Render-loop cost | M | 1 |
| 7 | Motion polish | M | none |
| 8 | HUD polish and accessibility | M | none |
| 9 | Docs and ADRs | S | after each |

Do 1, 2, 3 first (quick, safe). Then 4 (largest visible change) and 5. 6, 7, 8 follow, and 9 runs alongside.

## 1. Performance baseline

- Add a Playwright benchmark in a scratch directory (see memory note on browser automation: `npm install playwright` in a scratch dir finds the cached Chromium). It loads the dev build, sets creature counts of 200, 500 and 900, and records frame-time p50 and p95 plus long-task counts over 10 s.
- Record results in this plan's appendix before any optimisation. Re-run after each workstream.
- Targets (to be confirmed against the baseline): 60 fps at 500 creatures on a mid-range laptop, no frame over 33 ms at 900; LCP under 2.5 s; initial JS as small as the Vite build allows.

## 2. Asset diet

Findings from the repo (2026-10-09):
- `public/avatars` is about 49 MB: 43 PNG and 69 WebP files coexist. The WebP conversion from `scripts/optimize-stickers.py` is already done, so the PNG originals are probably being shipped to `dist` unused.
- `public/assets/stickers` 13 MB, `public/creatures` 7.6 MB, `public/audio` 4 MB.
- 14 `@fontsource` packages in `package.json`, including heavy colour fonts.

Tasks:
1. Grep `src/` for every `.png` reference. Move PNG files that nothing loads out of `public/` (for example to `assets-src/`) so Vite does not copy them.
2. Convert creature PNGs (`cockroach`, `eye`, `finger`, `placard_stick`) and `public/assets/stickers` to WebP or AVIF at real display sizes; keep `srcset` where scales vary.
3. Audit which of the 14 font families are actually used. Drop the unused. Subset the rest and load the display fonts lazily.
4. Convert audio to Opus/AAC where not already, and lazy-load beds that are not needed at start.
5. Review `animejs` v3 call sites (`BugSwarm.ts` and others). Replace with the Web Animations API if the usage is simple.

Acceptance: `dist` size before and after recorded; no visual regression in a browser pass; Gallery and onboarding still load images without a visible pop.

## 3. Intro copy lint and card polish

- Run `/write --rewrite` on the six existing beats in `src/hud/onboarding/beats.ts`, keeping the dialed-down direct-address register. Known issues: an em-dash in beat 5; triplet rhythm ("Every promise. Every price. Every quiet lie."); "not X, that's Y" reversal ("That's not a mob. That's all of us."); stock contrast pair ("They forgot we were watching. We didn't.").
- Respect the real-names policy (no living person named).
- Card visuals: apply the design-taste rules (one radius scale, custom easing curves, staggered reveal, reduced-motion fallback), plus keyboard navigation and focus handling in `OnboardingCarousel`.
- The copy will be replaced later when gameplay is decided, so keep this to a clean-up, not a rewrite of the narrative.

## 4. Time-of-day system

Source: Figma node `497:6112` has day, dusk and night palettes. Dawn is missing and is added as the fourth phase so the phases can follow the arc later (day, dusk, night, dawn). A single `timeOfDay` value (phase plus 0..1 progress) is the only input, so gameplay can drive it later without changes here.

### Recolor strategy by layer

Grade the scene, do not recolor 900 elements. Per-creature style changes would trigger style recalculation across the whole crowd every frame of a transition.

| Layer | Approach | Per-frame cost |
|---|---|---|
| Backdrop (currently a `body` radial gradient with hard-coded hex in `index.html`) | Move the colours to CSS variables. Stack one backdrop element per phase and crossfade by `opacity` only. | Compositor only |
| Vignette | One variable-driven gradient, opacity changes per phase | Compositor only |
| Whole scene grade (tint of eyes, cockroaches, fingers, placards) | One fixed, `pointer-events: none` overlay above the crowd with `mix-blend-mode: multiply` (and a second `soft-light` for warmth). Crossfade its opacity. White sclera becomes salmon at dusk and periwinkle at night, dark irises stay dark. | One composite |
| Eye sclera accents | CSS variable `--eye-sclera` on the SVG, switched once per phase boundary (under the overlay dip), never animated | One style recalc per phase change |
| Raster creatures (`cockroach.png`, `finger.png`, `placard_stick.png`) | Rely on the grade overlay. If cockroaches vanish against night indigo, bake a lighter variant with a script like `optimize-stickers.py` and swap at phase boundaries. Avoid `filter: brightness()` on hundreds of layers. | None per frame |
| Placards (23 images) | Grade overlay only. Legibility floor already exists (scale floor 0.20); verify contrast at night. | None |
| Villain sticker (one element) | The pasted-on look is the biggest visual gap in the Figma frames. Use a phase-tinted `drop-shadow` rim light and a soft contact shadow, plus a mild brightness/saturation adjustment. Cheap because it is a single element. | Negligible |
| Security units (police/RAF stickers) | Same treatment as the villain, via a shared class | Negligible |
| HUD glass (`hudGlass.css`) | Tokenise tint and border; darker glass at night; recheck text contrast at every phase | None per frame |
| Grain | Already tokenised (`grainOpacity` 0.04 in `visualTokens.json`). Vary by phase (for example 0.07 at night). Fixed, `pointer-events: none` only. | Negligible |

### Implementation notes

- Extend the token source so `npm run tokens:generate` / `tokens:check` keep `visualTokens.ts` in sync. Do not hand-edit generated files.
- A pure module `timeOfDay.ts` (phase table, interpolation, easing) with unit tests. Applying it to the DOM happens in `src/main.ts`.
- Transitions are 15-25 s crossfades, not hard switches. Skip or shorten when `prefers-reduced-motion` is set.
- Read exact palette values from Figma (`get_design_context` / variable defs) at implementation time; do not eyeball them from screenshots.

## 5. Atmosphere layers (dust, smoke, rain)

Yes, but with a budget, and weather is separate from time of day so it can carry story beats rather than decorate automatically.

| Effect | Where it fits | Technique |
|---|---|---|
| Dust motes and light shafts | Day, dawn | Tiled specks texture drifting slowly; static diagonal gradient shafts |
| Warm haze and drifting embers | Dusk | Large pre-blurred sprites, opacity drift |
| Rain | Night, or a deliberate low-point beat | Two parallax tiled streak textures scrolling diagonally (far and near) |
| Smoke | Raids or the villain's anger (gameplay-driven, parked) | 2-3 large pre-blurred blobs |
| Film grain | All phases | Existing grain tile, opacity per phase |

Rules:
- Two layers only: a background layer behind the crowd (dust) and a foreground layer above it (rain, smoke). Both `pointer-events: none`, below the HUD.
- Tiled textures moved with `transform` (compositor). No per-particle DOM nodes, no runtime `blur()` or `backdrop-filter`, no JavaScript per frame.
- Atmosphere opacity at most 0.25 so eyes and placards stay legible.
- One active effect at a time. Respect `prefers-reduced-motion` (static or off), pause when the tab is hidden, and add an adaptive switch that drops the effect if frame time degrades.
- Rain pairs with a rain audio bed; coordinate with `AudioManager`.
- Smoke imagery relates to the real event (tear gas); keep it raid-driven and handle with care.

## 6. Render-loop cost (after the baseline)

- Sleeping creatures that skip updates when settled; spatial hash for the repel pass; `contain: layout paint` on the crowd layer.
- Lazy-load Gallery, Menu and Onboarding code; Vite `manualChunks` review.
- Decision gate: if the trace shows main-thread bound at 900 creatures, evaluate a WebGL/Pixi sprite batch for creatures. That reverses the DOM-first ADRs (011-013), so it needs its own ADR. Do not start it before the baseline says it is needed.
- Any change to `ForceField.ts` or `Engine.ts` is a deliberate, reviewed exception.

## 7. Motion polish

- Replace the 1 s `cubic-bezier(0.4, 0, 0.2, 1)` inflate tween in `StickerOverlay` with squash, overshoot and settle for tier increases, and a slower exhale for decreases. Motion only; the mechanic is parked.
- Tune spawn/despawn (`poofEffect`), hover scale and HUD transitions to custom curves.
- Audit `will-change` use and reduced-motion handling across `creatures/` and `hud/`.

## 8. HUD polish and accessibility

- One corner-radius scale and tokenised glass across Hud, FilterPanel, GalleryPanel, MenuPanel and the onboarding cards.
- Contrast checks on every phase of the time-of-day system; focus states; touch targets of at least 44 px; keyboard paths for every panel; `aria-live` for mentor blurbs; an audio-unlock affordance.
- The PowerMeter files have uncommitted edits in the working tree (the meter is parked). Do not touch them in this plan.

## 9. Docs

- New ADR for the time-of-day and atmosphere system.
- Refresh the stale ADRs noted in `CLAUDE.md`.
- Update the layout section in `CLAUDE.md` when new modules land.

## Verification (every workstream)

1. `npm test` and `npm run build` pass.
2. Benchmark re-run and compared to the baseline.
3. `npm run dev` browser check at each phase (and with reduced motion on) for any change under `physics/`, `creatures/`, `audio/` or `hud/`.
4. No UI-polish unit tests for small visual tweaks; unit tests only for pure modules such as `timeOfDay.ts`.

## Appendix: baseline results

_To be filled in by workstream 1._
