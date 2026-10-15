# Plan: remove the mid-game sticker inflate (step 1 of the unity redesign)

Spec: [../specs/2026-10-15-unity-and-engagement-design-DRAFT.md](../specs/2026-10-15-unity-and-engagement-design-DRAFT.md), section 5.
Branch: `refactor/remove-sticker-inflate`, cut from fresh `main` (see Preconditions).

## Goal

The sticker's size changes exactly once: a full-power win deflates it to its floor and locks it (kept). The 4-tier ladder that swells it as the raid grows, and the inflate cue, go.

## Preconditions

1. The working tree on `feat/placard-text` has unrelated uncommitted changes (deleted docs, edited `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, graphify files, plus the two new spec/plan files). Commit or set them aside first. Do not carry them onto this branch.
2. `git checkout main && git pull && git checkout -b refactor/remove-sticker-inflate`.
3. Copy the spec and this plan onto the new branch so they ship with it.

## Open PR overlap (checked 2026-10-15, none merged)

None of #60, #59, #58, #57, #56, #42 touch `StickerOverlay.ts`, `RaidController.ts`, `inflateTone.ts`, or the inflate tests. Only #58 edits `src/main.ts` (gallery prefetch, lazy drag-scratch sound), in a different region from the `onCrowdSizeChanged` handler, so any conflict should be a trivial one. #58 is stacked on #57 (its base is `chore/asset-diet`). #60 fixes stale tests on `main`, so `npm test` on a fresh `main` may fail for reasons unrelated to this work. Record the baseline failures before starting and compare against them.

## Findings that shape the scope

- The inflate is driven by `RaidController.onCrowdSizeChanged(count, tierBump)` into `StickerOverlay.setScaleForRaidSize`. `tierBump` exists only to feed the tiers.
- `getWidth()` (width times `baseScale`) feeds the escort ring (`raidController.setAvatarWidth`) and the avatar repel radius every frame in `main.ts`. With tiers gone, `baseScale` is 1, or the win-lock value, so the win still tightens the crowd around the deflated sticker. That is a payoff worth keeping, so `main.ts`'s per-frame math stays as is.
- The resize handle and pinch zoom are user cosmetics. They stay. They do change `getWidth()`, so a resized sticker still shifts the radius. This is existing behaviour and is out of scope here (revisit in the unity step).
- `lockSqueeze` solves for an absolute target width, so it does not depend on tiers. `unlock` stays.

## Tasks

Each task: write or adjust the test first, see it fail, change the code, see it pass.

1. **`StickerOverlay`** (`src/creatures/StickerOverlay.ts`)
   - Delete `TIER_SCALES`, `TIER_COUNT`, `currentTierIndex`, and `setScaleForRaidSize`.
   - `unlock()` now also restores `baseScale = 1`, resets the transform, and swaps the face back to `currentSrc`. The old `setScaleForRaidSize` did this implicitly on the next raid; this keeps that behaviour.
   - Update the doc comments that mention inflate/tiers (lines near 27-33, 56-70, 251-256, 358-361).
   - Tests (`tests/unit/stickerOverlay.test.ts`): remove the tier tests (lines about 103-190), keep lockSqueeze tests, and add "unlock restores scale 1 and the calm face" and "getWidth equals width at rest and the floor width after lockSqueeze".
2. **`RaidController`** (`src/creatures/RaidController.ts`)
   - Remove the `onCrowdSizeChanged` config option, its stored value, the `tierBump` computation, and the notify call (about lines 189-197, 264-284, 610-620).
   - Check `lastBackfireBand` is still used elsewhere before deleting it. Keep it if so.
   - Tests (`tests/unit/raidController.test.ts`, block starting near line 774): delete the three `onCrowdSizeChanged` tests, keep the `onProtestWin` and `onRaidStart` timing tests.
3. **`main.ts`**
   - Delete the `onCrowdSizeChanged` handler and the `playInflateTone` import.
   - Keep `playDeflateTone` in `onProtestWin`, and `unlock()` in `onRaidStart`.
   - Remove the stale comments about tiers (lines near 34-38, 93-99, 120-124). Check whether `SECURITY_MAX_UNITS` is still imported or used, and drop it if not (`noUnusedLocals`).
4. **Audio**
   - Delete `src/audio/inflateTone.ts`.
   - Edit `tests/unit/inflateDeflateTones.test.ts`: remove the inflate block and the "mirror of playInflateTone" wording. Consider renaming the file to `deflateTone.test.ts`.
   - Keep `deflateTone.ts`.
5. **Docs**
   - `docs/superpowers/system-architecture.md`: update any ADR text that mentions tiers or inflate. Search for "tier", "inflate", "squeeze".
   - Update the parked note's section 8 with a one-line pointer saying the tiers were removed.

## Verification

1. `npm test` (all green) and `npm run build` (typecheck, catches unused imports and leftovers).
2. Search the repo for `inflate`, `TIER_SCALES`, `setScaleForRaidSize`, and `tierBump`. The only remaining hits should be the deflate-related names and docs history.
3. Human test, as `AGENTS.md` requires for `creatures/` and `audio/` changes. Run `npm run dev` and check in a browser:
   - Shake to trigger a raid. The sticker stays the same size while units spawn and grow.
   - No rising blip while the raid grows.
   - Hold and release at full power. The sticker deflates to its floor with the falling tone, the face swaps, and the crowd closes in.
   - Start a new raid. The sticker returns to normal size and its calm face.
   - Corner-drag and pinch resize still work.

## Out of scope

Unity gating, the mixed crowd, and anything in `ForceField.ts` or `Engine.ts`. Do not touch those here.

## Commit and PR

Small conventional commits, for example `refactor(sticker): remove raid-size tier inflate` and `refactor(audio): remove inflate tone`. Push with `git push -u origin refactor/remove-sticker-inflate`, open a PR with `gh pr create`, and do not merge it.
