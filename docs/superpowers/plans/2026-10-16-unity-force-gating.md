# Plan: unity-gated force (step 2 of the unity redesign)

Spec: [../specs/2026-10-15-unity-and-engagement-design-DRAFT.md](../specs/2026-10-15-unity-and-engagement-design-DRAFT.md), section 3.
Branch: `feat/unity-force-gating`, cut from `main` after #56 to #62 merged (2026-10-16).

## Goal

Force works on a scattered crowd and fails on a united one. Unity is a 0 to 1 number from crowd size, clustering and variety. It weakens the raid as it rises, makes the break visible, and gates the Protest win.

Out of scope: the mixed crowd (step 3), round timer and score (step 4), echo crowd, stages. `ForceField.ts` and `Engine.ts` are not touched.

## Current code this builds on

- `RaidController.tick()` runs raid attrition (`RAID_ATTRITION_INTERVAL_MS` and `RAID_ATTRITION_STEP`) and the charge sweep. `getSecurityUnits()` hands `CreatureGrid.update()` each unit's repel radius (`SECURITY_REPEL_RADIUS` times avatar size scale). That repel is the force the player feels.
- `releaseCharge()` wins only at `FULL_POWER_THRESHOLD` (0.92 of a ping-pong sweep, `CHARGE_SWEEP_HALF_PERIOD_MS`). Any other band backfires and escalates the raid.
- `CreatureGrid` exposes `getCreatureCount()` and `getMode()` but no positions. One mode exists at a time today, so variety cannot vary yet.

## Design

### 1. Pure module `src/creatures/unity.ts` (new)

```
computeUnity({ points, maxCount, kindCounts }) -> { unity, size, cluster, variety }
```
- `size` = clamp(points.length / maxCount, 0, 1), with `maxCount` the user's crowd baseline, so a small crowd the player chose can still be united.
- `cluster` = fraction of creatures whose nearest neighbours sit within `CLUSTER_RADIUS_PX` of the crowd centroid, using a cheap centroid-distance test (not pairwise), so it stays O(n) every frame.
- `variety` = (distinct kinds - 1) / (KIND_COUNT - 1). Until step 3 only one kind exists, so variety is excluded and the other weights are renormalised, which keeps step 2 tunable on its own.
- `unity` = weighted sum. Placeholder weights: size 0.35, cluster 0.45, variety 0.20. All constants exported and tuned in playtest.
- Smoothed outside the pure function (see below) so the number does not jitter.

Also exports `forceFactor(unity)`: 1 at unity 0, falling to 0 at `FORCE_BREAK_UNITY` (placeholder 0.85), by a smoothstep so it eases rather than snaps.

### 2. `CreatureGrid`: read-only accessor

Add `getCreaturePositions(): ReadonlyArray<{ x: number; y: number }>` and `getKindCounts()`. Additive, no change to the loop. Needs the deliberate review `AGENTS.md` asks for on `CreatureGrid`.

### 3. `RaidController`: unity drives force

- Each `tick()` computes unity, then smooths it (exponential, about 400 ms) into `this.unity`. Exposed via `getUnity()`.
- Repel radius of each security unit is multiplied by `forceFactor(unity)`. At the break point units no longer push the crowd.
- Attrition step interval stretches by `1 / max(forceFactor, MIN)`, so a united crowd stops bleeding.
- New state flag `forceBroken` (true while unity is above `FORCE_BREAK_UNITY`, with hysteresis so it does not flicker). It fires `onForceBreak(broken: boolean)` once per change, for the visual layer.
- Protest win rule: `releaseCharge()` wins only when `fraction >= FULL_POWER_THRESHOLD` and `unity >= WIN_UNITY` (placeholder 0.7). A perfect-timed release below that unity is treated as MEDIUM (backfire), and the controller reports why through `onReleaseVerdict("early" | "close" | "now")`. The verdict stamp UI itself ships in step 4.

### 4. Visuals and audio (minimal, so unity is readable)

- `hud/UnityRing.ts` (new): a soft ring drawn around the crowd centroid, radius from the crowd's spread, opacity and thickness from `unity`. Pure DOM, driven from `main.ts`'s existing engine tick.
- `SecurityCreature`: on `forceBroken`, add a CSS class that desaturates and fades the units and plays a short backing-off motion (the power-pellet flip). Reuses existing despawn plumbing where possible. If the CSS-only version reads poorly, fall back to a pale tint plus slowed movement.
- Audio: raise the existing sound bed's volume or a filter with unity (single parameter), and one short cue at the break. Keep it to one new tone module in the style of `deflateTone.ts`.
- All of this sits behind the unity value, so it can be tuned without touching the rules.

## Tasks (test first for each)

1. `unity.ts` and `tests/unit/unity.test.ts`: scattered vs clustered fixtures, size scaling, single-kind renormalisation, `forceFactor` curve and monotonicity.
2. `CreatureGrid` accessors and a test that positions and kind counts reflect spawn and despawn.
3. `RaidController` unity smoothing, repel scaling, attrition scaling, hysteresis, `onForceBreak`. Extend `tests/unit/raidController.test.ts`; the existing attrition-step and repel tests must still pass unchanged at unity 0.
4. Win gate and verdict in `releaseCharge()`, with tests for: full timing with high unity wins, full timing with low unity backfires as MEDIUM, existing LOW and MEDIUM paths unchanged.
5. `UnityRing` and the security fade class, wired in `main.ts`. Unit-test the DOM and class toggling.
6. Audio cue and sound-bed modulation.
7. Docs: add ADR 017 (unity-gated force) to `system-architecture.md`, update `AGENTS.md` and `CLAUDE.md` layout lines (`unity.ts`, `UnityRing`), and mark spec section 3 as built.

## Verification

- `npm test` and `npm run build` pass (main is currently 663 passing, 0 failing).
- Human browser pass, as `AGENTS.md` requires for `physics/`, `creatures/`, `audio/`, `hud/`:
  1. Shake to start a raid with a scattered crowd: units push the crowd hard.
  2. Drag the crowd into one tight mass: units weaken, the ring thickens, attrition slows.
  3. Reach full unity: units fade and back off, the ring is at full strength.
  4. Release the Protest button at the peak with low unity: it backfires. With high unity: it wins and the sticker squeezes as before.
  5. Check frame time with `scripts/perf-benchmark.mjs` against the recorded baseline (the unity pass must not cost a visible frame).

## Risks and open tuning

- **Feel.** The constants (weights, radius, break point, win unity) are guesses. Plan a 10 minute playtest after task 5 and adjust before tasks 6 and 7.
- **Clustering cost** on 400 creatures every frame. The centroid method is O(n); if the benchmark moves, compute every second frame.
- **Discoverability.** If players do not realise they must cluster, the ring and verdict copy carry that, and the spec's first-screen teaching (step 4) reinforces it.
- **Single mode for now.** Variety only becomes real in step 3, when the weights get re-tuned.
