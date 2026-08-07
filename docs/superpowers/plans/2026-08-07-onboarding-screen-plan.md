# Onboarding Carousel — Implementation Plan

## Context

`docs/superpowers/specs/2026-08-07-onboarding-screen-design.md` (commit `baac904`) specifies a 4-beat narrative carousel shown before the HUD appears, over the live eyes-mode crowd. It has a spec but no plan, and two behavioral details weren't fully pinned down by the spec text — they were clarified with the user before this plan was written:

1. **Repel behavior**: the card is visually styled like `.sticker-card`/text-overlay treatment (radius, shadow, hover lift) for family resemblance, but it does **not** become the crowd's attractor. The crowd keeps reacting to the cursor/avatar throughout onboarding, exactly as the spec's "Background crowd during onboarding" section already states.
2. **Avatar visibility**: the draggable avatar ("Tax Tai") is **not** shown during onboarding. Since onboarding runs on every visit (no suppression, per spec) and its exit sequence already ends with a sticker becoming the crowd's permanent attractor — the same terminal state the app reaches today the first time a user manually picks a sticker — showing the avatar first just to immediately retire it adds a visual step with no payoff. The avatar is deferred out of the startup path entirely.

This plan corrects one factual gap the spec assumed: there is **no existing sticker-vs-sticker or sticker-vs-cursor pairwise repel system** anywhere in the codebase. ADR 006 (pairwise crowd separation) was decided but never implemented — `ForceField.ts` exists but is dead/unimported code (confirmed via `grep`, zero import sites). The only real repel mechanic is crowd-vs-single-attractor repulsion in `src/creatures/creaturePhysics.ts`. This plan does not build a new repel system — see clarification 1 above.

## Architecture contract (locks the seam between design and wiring work)

- `main.ts` currently does, synchronously, at startup: create `DraggableAvatar` → append/attach it → build `CreatureGrid` → build `Hud` → attach it → wire `FilterPanel`/`GalleryPanel` → start `Engine.onTick` reading `currentAttractor.getCenter()`.
- New flow: `CreatureGrid` + `Engine` start immediately (crowd is live from frame 1, per spec). `DraggableAvatar` and `Hud` construction move into a `mountPostOnboarding()` closure that only runs after the carousel finishes. Until then, `currentAttractor` is driven by raw pointer position (plain `mousemove` listener storing `{x, y}` in client coordinates — the same coordinate space `DraggableAvatar.getCenter()` already returns, so no coordinate-space seam to worry about) rather than the avatar.
- `OnboardingCarousel` is a self-contained DOM component with exactly one public seam back into `main.ts`: a completion callback (`onComplete(cardCenter: {x, y})`, fired identically whether the user clicked "Begin" on beat 4 or "Skip intro" on any beat). It does **not** need to implement the `Attractor` interface (per clarification 1) and does **not** touch `currentAttractor`, `CreatureGrid`, or `Engine` directly — this is what lets the visual-design work and the wiring work proceed independently.
- Exit sequence, triggered by that one callback, reuses the exact pattern already in `main.ts`'s `replaceOverlay`/`poofElement`: `spawnPoof(cardCenterX, cardCenterY)` → on resolve, pick a random entry from `GalleryPanel`'s sticker roster → `new StickerOverlay(src, cardCenterX, cardCenterY)` → append, set `activeOverlay`/`currentAttractor` to it → call `mountPostOnboarding()` (constructs `Hud`, calls `attachTo`). `Hud`'s entrance is already pure CSS (`hud-slide-up` + staggered `hud-btn-pop` in `hud.css:48,382-414`) and autoplays on DOM insertion — gating construction behind the callback is sufficient to satisfy "HUD flies in only after onboarding," no new animation code needed.

## Files

**New:**
- `src/hud/onboarding/OnboardingCarousel.ts` — component class: builds the fixed-size card (same width/height across all 4 beats — the spec's beats vary in copy length, so the card must be sized for the longest beat, not auto-sized per beat), dot-progress row, Next→/Begin button swap, Skip-intro link, beat-to-beat crossfade (`EASE.fade` / `DURATION.base` per spec), and the exit sequence described above. Exposes `attachTo(container)` and `onComplete(cb)`.
- `src/hud/onboarding/onboarding.css` — scoped styles. Reuses `.sticker-card`'s existing values (`12px` border-radius, white bg, drop-shadow-on-hover convention from `galleryPanel.css:117-129`) rather than inventing new ones; uses `UI_TOKENS.ui.attack` (`#f4a15d → #df713e`, border `#c95f32`) for the beat-4 dot/button per spec; body copy in `"Fraunces", serif` (the app's existing display serif, `visualTokens.json` → `ui.typography.displayFamily`), UI chrome (dots, buttons, skip link) in `Inter`/`ui.typography.uiFamily` to match `galleryPanel.css`'s own split between quote-text and chrome fonts.
- `src/hud/onboarding/beats.ts` — the 4 beats as content-as-data (`{ copy: string; }[]`), consistent with the project's registry/content-as-data convention (CLAUDE.md: "Adding content should be additive, not require engine changes"). Exact copy from the spec's "Narrative beats" section.

**Modified:**
- `src/hud/GalleryPanel.ts` — export `STICKER_DEFS` (currently module-private, `GalleryPanel.ts:10`) or add an exported `getStickerDefs()` accessor, so the onboarding exit sequence can pick a random entry without duplicating the roster.
- `src/main.ts` — restructure per "Architecture contract" above: defer avatar + Hud construction into `mountPostOnboarding()`; add the onboarding-phase pointer-follow attractor; instantiate `OnboardingCarousel` before the deferred block; wire its `onComplete` to the exit sequence. Remove the now-dead `avatarActive` branch in `replaceOverlay` (avatar is never constructed at startup anymore, so that branch is unreachable) — `replaceOverlay` keeps only the `activeOverlay` branch, used when a user picks a *second* sticker/text from the gallery after onboarding.
- Leave `src/creatures/DraggableAvatar.ts` itself untouched (still a valid, self-contained class) — only its startup instantiation in `main.ts` is removed. Flag, don't act on: if a repo-wide `grep` during implementation confirms it's imported nowhere else, it's a candidate for later cleanup, but deleting it is out of scope here.

## Execution pipeline — sub-agent driven, worktree-isolated, phased sprints

Each sprint below runs via `dispatching-parallel-agents`/`subagent-driven-development` conventions; worktrees are set up per the `using-git-worktrees` skill so parallel workstreams never collide on the same file mid-edit.

**Sprint 0 — Worktree setup**
Create two isolated worktrees off `main`: `onboarding-visual` and `onboarding-wiring`. The architecture contract above is the interface between them, so they can run fully in parallel — visual work only ever touches the new `src/hud/onboarding/*` files; wiring work only touches `src/main.ts` and `GalleryPanel.ts`'s export.

**Sprint 1 — Parallel build (2 agents, concurrent)**
- *Design agent* (worktree `onboarding-visual`, role: designer): invoke `/high-end-visual-design` then `/frontend-design:frontend-design` to execute `OnboardingCarousel.ts` + `onboarding.css` to an agency-grade standard — fixed-dimension card, dot progress, button-state swap, skip link, beat crossfade — strictly within the existing token system (no new colors/easing/radii invented; pull from `visualTokens.json`/`tokens.ts` and the `.sticker-card` conventions cited above). Deliverable is fully self-contained and testable in isolation (e.g. a throwaway harness page) since it has no dependency on `main.ts`.
- *Implementation agent* (worktree `onboarding-wiring`, role: engineer): makes the `main.ts`/`GalleryPanel.ts` changes per "Files → Modified" above, coding against the architecture contract's callback signature before the visual component exists (stub `OnboardingCarousel` locally if needed, swapped for the real one at merge).

**Sprint 2 — Integrate**
Merge both worktrees into one integration branch; wire the real `OnboardingCarousel` into `main.ts` in place of the stub. This is a small, mechanical merge because the contract was fixed in Sprint 0 — the only new code here is the two-line `onComplete` wire-up.

**Sprint 3 — Review** (role: reviewer)
Run `/code-review` at high effort over the integrated diff: correctness of the exit-sequence ordering (poof completes → sticker spawns → Hud mounts, not overlapping), styling-token adherence (no hardcoded colors/radii that duplicate existing tokens), and confirmation the dead `avatarActive` branch was actually removed rather than left half-migrated.

**Sprint 4 — Test** (role: tester)
- Unit (vitest): beat-advance logic (Next/Begin/Skip all reach the same exit callback), progress-dot active-state per beat including the beat-4 attack-gradient swap, exit-sequence ordering (mock/observe `spawnPoof` — it already resolves via `Promise.resolve()` fallback when `Element.animate` is absent, which jsdom satisfies naturally, so ordering is testable without fake timers).
- Manual (required — touches `hud/` and `effects/` per project convention): `npm run dev`; click through all 4 beats; separately test "Skip intro" from beat 1; confirm the card stays a fixed size across all 4 beats; confirm the crowd tracks the cursor throughout onboarding (not frozen, not tracking the card); confirm poof → sticker-at-same-spot → HUD-fly-in reads correctly; confirm the crowd switches to tracking the new sticker immediately after; confirm the onboarding screen reappears on a hard reload (no localStorage suppression, per spec).

**Sprint 5 — Finalize**
Use `finishing-a-development-branch` to decide the merge/PR path once Sprint 3 and 4 are clean.

## Verification

- `npm test` — new vitest suite for `OnboardingCarousel` beat/exit logic passes alongside the existing suite.
- `npm run build` — typecheck clean (new files respect `verbatimModuleSyntax`/`noUnusedLocals`; `avatarActive` removal doesn't leave an unused import).
- `npm run dev` manual pass per Sprint 4 above — this is the real bar, since unit tests won't catch feel/motion regressions in this canvas app.
