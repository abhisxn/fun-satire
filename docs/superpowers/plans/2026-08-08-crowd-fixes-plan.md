# Quantity Sync, Face-Only Stickers, Onboarding Copy, Sound Bed, Hover SFX, Placard Icon — Implementation Plan

## Context

Six issues surfaced in the crowd/onboarding experience, grouped into one plan because several share the same file (`main.ts`) and are cheap to sequence together:

1. Creature quantity isn't reliably 300 after onboarding, and the slider desyncs specifically at the onboarding→post-onboarding handoff.
2. Random sticker selection can pick non-face stickers (objects/placeholders), diluting the "face" gag.
3. Onboarding narrative needs tightening — sharper, more current (broken promises / unaccountable power), while keeping the existing no-real-names constraint from `docs/superpowers/specs/2026-08-07-onboarding-screen-design.md`.
4. `public/audio/azaadi.mp3` exists but nothing plays it — needs a background sound bed with a small floating mute/volume control.
5. No hover feedback sound exists for any creature type — needs four distinct, harmonized tones for eyes/finger/cockroach/placard.
6. The placard HUD icon uses a hand-drawn inline SVG instead of the correct `public/creatures/placard_icon.svg`.

Decisions locked in before this plan was written:
- Slider ceiling **stays 500**; 300 remains just the post-onboarding default, not a hard cap.
- Hover SFX are **synthesized via Web Audio oscillators** — no new audio files, no dependency.
- Sound bed UX is a **small floating mute/unmute + volume widget** that doubles as the play control, so no separate autoplay-policy strategy is needed — the widget's state always reflects reality and retries playback on first user gesture if the browser blocked it.

## Root causes (confirmed via code exploration)

- **Qty desync**: `src/main.ts:182` calls `grid.setQuantity(FULL_CREATURE_QUANTITY)` directly on onboarding completion, bypassing `FilterPanel`. `FilterPanel`'s internal `quantity` state (defaulted to `300` via its own constructor param, `src/hud/FilterPanel.ts:28`) never learns the grid changed — slider UI and live grid count are two unsynced sources of truth, plus `FULL_CREATURE_QUANTITY` (`main.ts:14`) is a third, disconnected duplicate of "300." The respawn fade/repop cycle (`CreatureGrid.update()`, `CreatureGrid.ts:338-363`) only toggles opacity/state on existing creatures — it does not mutate array length, so it is not a source of count drift. `CreatureGrid.setQuantity()` (`CreatureGrid.ts:222`) currently does zero validation, so any direct caller can push an out-of-range count.
- **Sticker selection**: `src/hud/GalleryPanel.ts` defines `StickerDef { src; label }` with no face/category flag; `src/main.ts:174-176` picks uniformly from all 25 `STICKER_DEFS`. No manifest/schema system exists on `main` (only on unrelated branches) — this is a small in-file fix, not a schema migration.
- **Onboarding copy**: lives in `src/hud/onboarding/beats.ts` (4 beats), matching `docs/superpowers/specs/2026-08-07-onboarding-screen-design.md`'s three pillars (insult reclaimed, numbers as the weapon, watched become watchers). No beat currently names the "broken promises / unaccountable power" thread explicitly.
- **No audio system exists**: zero `Audio`/`AudioContext` usage anywhere in `src/` — greenfield.
- **No hover concept exists**: `PointerTracker.ts` only tracks raw x/y/pressed; no per-creature proximity/hover flag is computed anywhere today. Creature types are `'eyes' | 'pointedFinger' | 'cockroach' | 'placard'` (`src/creatures/creatureTypes.ts:18`), one module each (`EyeCreature.ts`, `FingerCreature.ts`, `CockroachCreature.ts`, `PlacardCreature.ts`), orchestrated by `CreatureGrid.ts`.
- **Placard icon**: `Hud.ts:29-33` defines an inline hand-drawn `SVG_PLACARD` constant used in `MODE_BTNS[3]` (`Hud.ts:63`) instead of loading `public/creatures/placard_icon.svg`. `EyeCreature.ts:138` already shows the fetch-an-SVG-file-at-runtime pattern (`fetch('/creatures/eye.svg')`) to mirror.

## Files

**Task 1 — Quantity/respawn/slider/onboarding sync**
- `src/config/tokens.ts` — add single exported `DEFAULT_CREATURE_QUANTITY = 300` (and hoist `QTY_MIN`/`QTY_MAX` here if not already shared).
- `src/hud/FilterPanel.ts` — constructor default reads from the token instead of a local literal.
- `src/creatures/CreatureGrid.ts` — `setQuantity()` (`:222`) clamps to `[QTY_MIN, QTY_MAX]` as a defensive floor/ceiling.
- `src/main.ts` — onboarding-completion block (~line 182): call `filterPanel.setQuantity(DEFAULT_CREATURE_QUANTITY)` instead of `grid.setQuantity(...)` directly, so the already-wired `onQuantityChange` callback is the single write path keeping slider UI and live grid count in sync.

**Task 2 — Face-only random sticker selection**
- `src/hud/GalleryPanel.ts` — add `hasFace: boolean` to `StickerDef`; tag all 25 `STICKER_DEFS` entries (the 14 named-caricature entries — DNA Tihari, Tax Tai, Ethanol, Chronology, Gutter, Adalat Sharma, Kaleshi, Leak Pradhan, Mananiya Sadasya, Naya Leak, Petroleum, Reel Minister, Republic, Vishwaguru — are confirmed/strongly-patterned face portraits; visually spot-check `sticker_38.png`–`sticker_48.png` before tagging, don't assume); export `getFaceStickerDefs()`.
- `src/main.ts` — sticker-spawn line (~174) selects from `getFaceStickerDefs()` instead of the full roster.

**Task 3 — Placard HUD icon fix**
- `src/hud/Hud.ts` — replace inline `SVG_PLACARD` with a runtime fetch of `/creatures/placard_icon.svg` (mirrors `EyeCreature.ts:138`), wired into `MODE_BTNS[3]`.

**Task 4 — Onboarding narrative rewrite**
- `src/hud/onboarding/beats.ts` — tighten all 4 beats; keep the existing 3-pillar structure and no-real-names constraint, add a sharper broken-promises/unaccountable-power thread. See "Updated narrative beats" below (also reflected in the spec doc).
- `tests/unit/onboardingCarousel.test.ts` — update copy assertions to match; UI chrome strings (`"Skip intro"`, `"Next →"`, `"Begin"`) stay unchanged.

**Task 5 — Audio foundation + sound bed widget**
- New `src/audio/AudioManager.ts` — wraps a single `<audio loop>` pointed at `public/audio/azaadi.mp3` (`play()/pause()/setVolume()/isMuted()`), plus owns a shared `AudioContext` for Task 6's tones (one context avoids per-hover allocation).
- New floating widget (mute/unmute toggle + volume slider), fixed-position, independent of `FilterPanel`/main HUD — attempts playback on mount, retries on first pointer/touch interaction if blocked, icon always reflects real playing/paused state.
- `src/main.ts` — one new, isolated init block; no other task's code path touched.

**Task 6 — Hover feedback tones per creature type** (depends on Task 5's shared `AudioContext`)
- New `src/audio/hoverTones.ts` — 4 short envelope-shaped oscillator blips from one chord/scale (e.g. major triad + octave: eyes=root, finger=third, cockroach=fifth, placard=octave) so they read as one instrument, different notes.
- `src/creatures/CreatureGrid.ts` — hover-enter edge detection per creature (nothing like this exists yet; needs a debounced/edge-triggered flag so a tone fires once per hover-enter, not every frame), plus a simple cooldown/voice-cap to avoid audio spam when many creatures are hovered in a burst.
- `EyeCreature.ts` / `FingerCreature.ts` / `CockroachCreature.ts` / `PlacardCreature.ts` — trigger point only (call into `hoverTones` on hover-enter).

## Updated narrative beats (Task 4, mirrored into the design spec)

**Beat 1** — insult, rooted in broken promises
> Another promise came and went. Then a word, tossed down like it would end the conversation:
> disposable.

**Beat 2** — reclaimed
> We didn't hand the word back. We picked it up and wore it.
> Turns out it fits better than they meant it to.

**Beat 3** — surveillance flip
> They're built for watching from far away — a podium, a headline, a scroll.
> Not for this. Not for being surrounded.

**Beat 4** — numbers, no face
> No leader to arrest. No face to blame. Just thousands, done waiting.
> Move. They'll notice.

## Execution pipeline — sub-agent driven, worktree-isolated

Follows `dispatching-parallel-agents`/`subagent-driven-development` conventions; worktrees set up per `using-git-worktrees` so parallel workstreams never collide mid-edit on `main.ts`.

**Sprint 0 — Worktree setup**
Four worktrees for the file-disjoint tasks: `fix-qty-sync` (Task 1), `fix-sticker-faces` (Task 2), `fix-placard-icon` (Task 3), `fix-onboarding-copy` (Task 4). A fifth, `feat-audio`, is sequential internally (Task 5 must land before Task 6 since Task 6 needs Task 5's shared `AudioContext`) but can start alongside the other four.

**Sprint 1 — Parallel build (5 agents, concurrent)**
- Agent A (`fix-qty-sync`): Task 1 exactly as scoped in Files above.
- Agent B (`fix-sticker-faces`): Task 2 — includes visually spot-checking `sticker_38–48.png` before tagging.
- Agent C (`fix-placard-icon`): Task 3.
- Agent D (`fix-onboarding-copy`): Task 4 — apply the beats above verbatim, update the test file's assertions.
- Agent E (`feat-audio`): Task 5 first; once merged internally, immediately continues to Task 6 in the same worktree (or hands off to a follow-up agent) since it owns the only file (`AudioManager.ts`) Task 6 depends on.

**Sprint 2 — Integrate**
Merge all five worktrees into one integration branch. Tasks 1–4 touch disjoint files (bar tiny, non-overlapping `main.ts` blocks) so this is mechanical. Task 5/6's `main.ts` init block is also isolated from the others' edits.

**Sprint 3 — Review**
Run `/code-review` at high effort over the integrated diff: confirm the qty single-write-path actually goes through `FilterPanel` everywhere, confirm no non-face sticker can still be picked, confirm hover-tone edge-detection doesn't fire every frame, confirm the audio widget's state never lies about whether sound is actually playing.

**Sprint 4 — Test**
- Unit (vitest): extend `tests/unit/creaturePhysics.test.ts` (qty clamp), `tests/unit/galleryPanel.test.ts` (face filter), `tests/unit/hud.test.ts` (placard icon swap), `tests/unit/onboardingCarousel.test.ts` (new copy).
- Manual (required — touches `physics/`, `render/`, `effects/`, `hud/` per project convention): `npm run dev`; run onboarding start-to-finish and confirm creature count AND slider both read 300, then drag the slider and confirm live count tracks it; spawn several stickers and confirm only faces appear; read the new onboarding beats live for pacing; confirm azaadi.mp3 plays (or the widget clearly shows blocked-autoplay state) and mute/volume controls work; hover each of the 4 creature types and confirm distinct-but-harmonized tones with no audio garbage on rapid multi-hover; confirm the placard HUD button shows the correct clipboard icon.

**Sprint 5 — Finalize**
Use `finishing-a-development-branch` to decide the merge/PR path once Sprints 3 and 4 are clean.

## Verification

- `npm test` — all extended suites above pass alongside the existing suite.
- `npm run build` — typecheck clean (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals` — new `src/audio/*` files respect these too).
- `npm run dev` manual pass per Sprint 4 — this is the real bar; unit tests won't catch feel/motion/audio regressions in this canvas app.
