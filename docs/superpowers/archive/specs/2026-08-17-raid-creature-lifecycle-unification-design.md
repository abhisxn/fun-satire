# Raid/Creature Lifecycle Unification — Design

**Status:** draft, pending user review
**Branch:** `worktree-security-raid-protest` (isolated worktree)
**Builds on:** `2026-08-15-security-raid-protest-design.md` (original raid/protest feature) — this spec refactors that feature's now-organically-grown implementation, it does not change end-user behavior.

## Summary

`CreatureGrid` (crowd) and `RaidController`/`SecurityCreature` (raid units) each independently invented a way to spawn, despawn, and reconcile entity counts over time. They've converged on the same underlying needs — staggered spawn-in, staggered despawn-out, "settle" completion signals, decay-toward-a-floor curves — but via unrelated code: a waiting/reservoir-sample pool for the crowd, and a hand-rolled `pendingRespawns` timestamp array plus two single-purpose boolean flags (`clearingViaProtestWin`, `regroupInFlight`) for security. This spec extracts the shared shape into one lifecycle module and one rules module, and turns `RaidController` into a thin state machine that drives both pools through them.

No visual or gameplay behavior changes. This is an architecture pass: same power bands, same thresholds, same escalation, same timings — expressed once instead of twice.

## Current State (what's being unified)

| Concern | Crowd (`CreatureGrid`) | Security (`RaidController`) |
|---|---|---|
| Grow | `setQuantity()` reflows grid, spawns new creatures with staggered `spawnPopAtMs` | `spawnPulse()` / backfire loop create fresh DOM units immediately, `startSecurityEntranceBurst` |
| Shrink | Excess creatures fade to `waitingRespawn = true` (kept, reusable) | Units flip `phase = 'shrinking'`, removed from DOM permanently once elapsed |
| Idle reconciliation | `update()`'s demand-driven repop block: reservoir-samples waiting creatures back in, rate-capped, burst-aware | N/A — no idle behavior once a raid ends; units just don't exist |
| "Batch finished" signal | None needed (nothing currently listens for "crowd fully repopulated") | Two separate ad hoc booleans: `clearingViaProtestWin` (win sweep done) and `regroupInFlight` (backfire respawns done) |
| Decay-toward-floor over time | `idleVisibleFraction(idleMs)` — continuous curve | `RAID_ATTRITION_INTERVAL_MS`/`RAID_ATTRITION_STEP` — discrete step timer, unrelated math |
| "How much should exist right now" | `targetCount`, mutated externally via `setQuantity()` calls scattered across `RaidController` (attrition tick, boost, full-power reset) | `units.length`, mutated by imperative push/splice scattered across `spawnPulse`, `poofAndEscalate`, `tick()`'s sweep |

Two working systems, two vocabularies, two places to introduce the same bug twice (as already happened once with `units.length === 0` vs. `chargeStartedDuringRaid`).

## Goals

- One lifecycle primitive (`EntityPool`) that both the crowd and security units reconcile through — same spawn-stagger, despawn-stagger, and settle-callback code, parameterized per pool.
- One decay primitive (`decayTowardFloor`) used for both idle-decay and raid-attrition — same curve shape, different tuning constants.
- One pure classifier (`classifyRelease`) that turns a charge fraction into a complete, declarative outcome — replacing the hand-written branching in `releaseCharge()`.
- `RaidController` shrinks to orchestration: it holds state, asks the rules module for decisions, and tells the two pools what to converge toward. It stops doing array bookkeeping (`push`/`splice`/staggered-timestamp arrays) itself.
- Zero behavior change. Every constant, threshold, and timing in the current implementation carries over unless explicitly called out below as a tuning proposal.

## Non-Goals

- No change to `CreatureGrid`'s render loop (pupil tracking, hover tones, rotation math) — only its count-reconciliation internals move onto `EntityPool`.
- No change to `SecurityCreature`'s wander/escort/collision physics — only unit creation/removal moves onto `EntityPool`.
- Security units do **not** gain crowd-style idle flicker (confirmed: they stay present-or-absent, no mid-raid fade/repop). `EntityPool` supports this as a config flag, not a forced behavior.

## Components

### `src/creatures/EntityPool.ts` (new)

Generic lifecycle manager, one instance per entity type (crowd, security). Owns nothing about rendering or physics — only *how many exist and what phase each is in*.

```ts
interface EntityPoolConfig<T> {
  /** true: shrinking moves entities to a reusable "waiting" reserve (crowd).
   *  false: shrinking despawns entities permanently; growth always spawns fresh (security). */
  allowIdleFlicker: boolean;
  factory: (spawnPopAtMs: number) => T;
  onDespawn: (entity: T) => void;
  spawnStaggerMs: number;   // crowd: SPAWN_WAVE_MS; security: BACKFIRE_RESPAWN_STAGGER_MS
  despawnMs: number;        // crowd: fade duration; security: SECURITY_SHRINK_MS
}

class EntityPool<T> {
  setDesiredCount(n: number, opts?: { onSettled?: () => void }): void;
  tick(nowMs: number): void;
  get activeEntities(): readonly T[];
  get liveCount(): number;   // active + waiting, for flicker pools; active only otherwise
}
```

`setDesiredCount()` reconciliation rules:
- **Growing, flicker-capable:** reactivate from `waiting` first (reservoir-sampled, same algorithm as today's crowd repop), then spawn new if still short.
- **Growing, non-flicker:** always spawns fresh entities via `factory`, staggered by `spawnStaggerMs` — this *is* today's entrance burst / backfire trickle-in, unified into one path.
- **Shrinking, flicker-capable:** moves excess to `waiting` (today's crowd fade-out).
- **Shrinking, non-flicker:** despawns excess outright via `onDespawn` after `despawnMs` (today's security shrink-and-remove).
- **`onSettled`:** fires exactly once, the tick a batch this call started (spawns queued, or despawns marked) finishes fully landing on screen. This is the generalized `onProtestWin` / `onProtestBackfireSettled` mechanism — one code path instead of two duplicated booleans. Firing happens *after* the relevant DOM state change (last despawn removed / last spawn's pop-in complete), preserving the ordering contract `main.ts` depends on (see below).

`CreatureGrid` internals (`spawn`, `setQuantity`, the repop block in `update()`) become a thin wrapper around one `EntityPool<Creature>` with `allowIdleFlicker: true`. `SecurityCreature`'s `createSecurityUnit`/`removeSecurityUnit` become the `factory`/`onDespawn` for a second `EntityPool<SecurityUnitState>` with `allowIdleFlicker: false`, owned by `RaidController`.

### `src/creatures/raidRules.ts` (new)

Pure functions, fully unit-testable without DOM or timers:

```ts
/** 1 → floorFraction, continuous, parameterized by a half-life. Replaces both
 *  idleVisibleFraction (idle decay) and the discrete attrition step timer (raid decay) —
 *  same shape, different (floorFraction, halfLifeMs) per caller. */
function decayTowardFloor(elapsedMs: number, floorFraction: number, halfLifeMs: number): number;

type PowerBand = "full" | "medium" | "low";

interface PowerOutcome {
  band: PowerBand;
  /** Crowd's new desired count. */
  crowdCount: number;
  /** Change to the running raid-intensity score. -Infinity clears it entirely (full win). */
  intensityDelta: number;
  /** Only true for "full" — drives StickerOverlay.lockSqueeze() via onProtestWin. */
  isWin: boolean;
}

function classifyRelease(fraction: number, baselineCrowdCount: number): PowerOutcome;

/** Maps the running intensity score to a concrete security unit count, clamped to SECURITY_MAX_UNITS. */
function intensityToUnitCount(intensity: number): number;
```

`classifyRelease` folds in the already-shipped asymmetry directly:
- **FULL** (`≥ FULL_POWER_THRESHOLD`): `crowdCount = QTY_MAX`, `intensityDelta = -Infinity` (clears raid entirely), `isWin = true`.
- **MEDIUM** (`≥ MEDIUM_POWER_THRESHOLD`): `crowdCount = min(roundToTen(baseline * (1 + QTY_BOOST_MEDIUM_FRACTION)), QTY_BOOST_MEDIUM_CAP)`, `intensityDelta = +BACKFIRE_ESCALATE_MEDIUM`.
- **LOW**: same shape with `QTY_BOOST_LOW_FRACTION`/`QTY_BOOST_LOW_CAP`/`BACKFIRE_ESCALATE_LOW`.

### `RaidController.ts` (refactored, not rewritten)

Keeps its public API (`onAvatarMove`, `startCharging`, `releaseCharge`, `tick`, `getState`, etc.) unchanged — this is an internals-only refactor, so `main.ts` and existing call sites don't move. Internally:

- Owns `raidIntensity: number` instead of inferring raid severity from `units.length`.
- Owns two `EntityPool` instances (crowd pool is actually owned by `CreatureGrid`, but `RaidController` calls `grid.setDesiredCount()` — same shape as today's `grid.setQuantity()` call sites, just routed through the pool).
- `spawnPulse()` becomes `securityPool.setDesiredCount(intensityToUnitCount(raidIntensity += SHAKE_INTENSITY_STEP))`.
- `releaseCharge()` becomes: `classifyRelease(fraction, baseline)` → apply `crowdCount`/`intensityDelta` → `crowdPool.setDesiredCount(...)` / `securityPool.setDesiredCount(intensityToUnitCount(intensity), { onSettled })`.
- **Preserves the `chargeStartedDuringRaid`-style rule explicitly, generalized:** any decision spanning a staggered/async window reads a field snapshotted when the action *started*, never re-derives state from a pool's live count (`liveCount === 0`) at a later instant, since pools can be transiently empty mid-reconciliation. This is written into the module doc comment as a standing rule, not just a one-off fix.
- The `tick()` method no longer manually loops `this.units` for shrink-sweep/respawn-spawn bookkeeping — it becomes `securityPool.tick(nowMs)` plus the escort/collision physics loop (`applyEscortStep`, `applySecurityCollisions`), which stay as-is since they're physics, not lifecycle.

### Ordering contract (`onSettled` callback)

`main.ts`'s `onProtestWin`/`onProtestBackfireSettled` wiring depends on the callback firing **after** the pool has actually mutated the DOM (last unit removed / last unit's entrance animation started), so that `StickerOverlay.lockSqueeze()` and `getWidth()` reads inside the callback see current, not stale, state. `EntityPool.setDesiredCount`'s `onSettled` must fire from inside `tick()`, in the same frame the last outstanding spawn/despawn of that batch resolves — never from within the synchronous `setDesiredCount()` call itself, since the batch (by definition) hasn't landed yet at that point. This is called out explicitly because it's the exact bug class the current code avoids by hand (the `pendingRespawns`/`regroupInFlight` sequencing) and would be easy to silently break in a generic pool if `onSettled` were fired eagerly for a "no batch needed" case.

## Data Flow

```
RaidController (state: idle | raiding | charging | recovering)
   │  owns: raidIntensity, chargeStartedDuringRaid (snapshot)
   │
   ├─ onAvatarMove → shake detected → raidIntensity += step
   │                                → securityPool.setDesiredCount(intensityToUnitCount(raidIntensity))
   │
   ├─ tick(nowMs), each engine frame:
   │     ├─ if raiding: crowdPool.setDesiredCount(raidStartCount * decayTowardFloor(elapsed, RAID_FLOOR_FRACTION, RAID_HALF_LIFE_MS))
   │     ├─ securityPool.tick(nowMs)  → sweeps despawns, fires spawns, fires onSettled
   │     └─ crowdPool.tick(nowMs)     → sweeps fades, reservoir-samples repops, fires onSettled
   │
   └─ releaseCharge(fraction):
         outcome = classifyRelease(fraction, chargeBaselineCount)
         crowdPool.setDesiredCount(outcome.crowdCount)
         raidIntensity = outcome.intensityDelta === -Infinity ? 0 : raidIntensity + outcome.intensityDelta
         securityPool.setDesiredCount(intensityToUnitCount(raidIntensity), { onSettled: outcome.isWin ? onProtestWin : onProtestBackfireSettled })
```

Idle decay (no raid) stays entirely inside `CreatureGrid`, using the same `decayTowardFloor` function with `IDLE_FLOOR_FRACTION`/`IDLE_HALF_LIFE_MS` in place of the raid's constants — the only change from today is the underlying math shape (continuous decay replacing the current `idleVisibleFraction` curve, which can be re-expressed as the same function family).

## Tuning Proposals

Kept as *proposals*, not commitments — defaults below reproduce current feel; each is independently adjustable once the unified model lands:

- `RAID_HALF_LIFE_MS`: choose so `decayTowardFloor` reaches roughly the same crowd count at the same elapsed time as today's `-1 every 400ms` step (i.e., calibrate the continuous curve against the old discrete one, then round). This removes the discrete step's minor artifact of attrition rate scaling only with `RAID_ATTRITION_STEP`, not with raid size.
- `SHAKE_INTENSITY_STEP`: currently each shake spawns a *random* 2–3 units (`SPAWN_MIN_PER_PULSE`/`SPAWN_MAX_PER_PULSE`). Proposal: keep the randomness, but express it as `raidIntensity += rand(SHAKE_INTENSITY_MIN, SHAKE_INTENSITY_MAX)` so the same intensity→unit-count mapping (`intensityToUnitCount`) governs both shake-driven growth and backfire-driven growth, instead of shake having its own direct-to-unit-count path.
- Everything else (`FULL_POWER_THRESHOLD`, `MEDIUM_POWER_THRESHOLD`, boost fractions/caps, `BACKFIRE_ESCALATE_*`, `SECURITY_MAX_UNITS`, `AVATAR_REPEL_RADIUS_AFTER_WIN`) carries over unchanged — they're already tuned and don't interact with the pool/decay refactor.

## Error Handling / Edge Cases

- `setDesiredCount()` called again before a prior batch's `onSettled` has fired (e.g., rapid low-power clicks): the pool reconciles toward the *new* desired count from wherever it currently is — no queued-batch stacking, matching today's intent behind `chargeStartedDuringRaid` (a raid mid-regroup is still "a raid," so a new release targets its current live state, not a fresh spawn on top).
- `intensityToUnitCount` clamps at `SECURITY_MAX_UNITS` — `raidIntensity` itself is allowed to keep climbing unclamped (so repeated failed protests keep "meaning something" internally even once the visible cap is hit), consistent with today's `SECURITY_MAX_UNITS` check happening at spawn time, not at intensity-accumulation time.
- Full-power win while a backfire regroup is mid-flight: `raidIntensity` resets to 0 and `securityPool.setDesiredCount(0)` immediately supersedes the in-flight regroup target — mirrors today's explicit `pendingRespawns = []; regroupInFlight = false` cancellation.

## Testing

- `EntityPool` gets direct unit tests: growth/shrink reconciliation math, flicker vs. non-flicker behavior, `onSettled` firing exactly once and only after the batch fully lands (including the "no batch needed" no-op case never firing it).
- `raidRules.ts` gets direct unit tests: `decayTowardFloor` at boundary times (0, half-life, several half-lives), `classifyRelease` at exact threshold boundaries (0.4, 0.92) and just inside/outside each band, `intensityToUnitCount` clamping.
- `RaidController`'s existing test file (825 lines) shrinks substantially — attrition-stepping, backfire-timing, and unit-array-management tests move to `EntityPool`/`raidRules` tests; what remains in `RaidController`'s suite is state-machine sequencing (idle→raiding→charging→recovering transitions) and the two modules' wiring together.
- Manual browser verification per project convention (touches `creatures/`): shake to raid, hold-release at FULL/MEDIUM/LOW, confirm identical visual/timing behavior to the current build (this is a refactor — a regression here is a bug, not a design choice).

## Migration Plan

1. Add `EntityPool.ts` and `raidRules.ts` with full unit test coverage, unused by any consumer yet.
2. Port `CreatureGrid`'s internals onto `EntityPool` first (lower risk — no raid coupling), verify unit tests + manual pass.
3. Port `SecurityCreature`/`RaidController` onto the second `EntityPool` instance, replacing `pendingRespawns`/`regroupInFlight`/`clearingViaProtestWin` with `onSettled` callbacks.
4. Replace the discrete attrition timer and `idleVisibleFraction` with `decayTowardFloor` calls.
5. Replace `releaseCharge()`'s inline branching with `classifyRelease()`.
6. Full regression pass against the current build (side-by-side manual comparison of raid feel, timings, sticker scale/lock behavior).

## Out of Scope

- Any new gameplay mechanic (this is a pure refactor of existing, shipped behavior).
- Changing which entities are pooled (no new creature/unit types introduced).
- Mobile/device-motion shake input (unrelated to lifecycle management).
