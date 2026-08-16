# Raid/Creature Lifecycle Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is organized into **phases and lanes** (see "Execution Model" below) — dispatch parallel implementer subagents into separate git worktrees for tasks in the same phase, one lane per subagent, per `superpowers:using-git-worktrees` + `superpowers:dispatching-parallel-agents`. Never dispatch two implementer subagents into the *same* worktree/branch concurrently.

**Goal:** Replace `RaidController`'s hand-rolled unit bookkeeping (`pendingRespawns` timestamp array, `regroupInFlight`/`clearingViaProtestWin` booleans) and `CreatureGrid`'s bespoke idle-decay curve with two small shared primitives (`EntityPool`, `raidRules`), and close the gap where the Filters panel's crowd-count slider only resyncs once a raid fully ends instead of on every actual count change.

**Architecture:** Two new pure/generic modules (`src/creatures/raidRules.ts`, `src/creatures/EntityPool.ts`) land first, independently, with full unit coverage. `RaidController` and `CreatureGrid` then separately adopt them — `RaidController` for security-unit spawn/despawn/settle bookkeeping and power-band classification, `CreatureGrid` for its idle-decay curve. A small, independent third change adds a `CreatureGrid.onQuantityChange` hook so the Filters panel stays live-synced to the crowd count at every change (raid attrition tick, boost, win), not just when a raid fully ends.

**Tech Stack:** TypeScript, Vitest (`happy-dom` env where DOM is touched), existing project conventions (pure exports, `import type`, semi-implicit Euler physics — unaffected here).

**Builds on:** `docs/superpowers/specs/2026-08-17-raid-creature-lifecycle-unification-design.md` (the approved design spec this plan implements).

---

## Execution Model — Phases, Lanes, Worktrees

This plan is small enough that phases map directly to dependency tiers:

| Phase | Lanes (parallel within a phase) | Depends on | Gate to next phase |
|---|---|---|---|
| **1 — Foundations** | Lane 1 (`raidRules.ts`), Lane 2 (`EntityPool.ts`), Lane 3 (FilterPanel live-sync) | none — all three touch disjoint files | All three lanes' branches merged into `worktree-security-raid-protest` |
| **2 — Consumers** | Lane 4 (`RaidController.ts` refactor), Lane 5 (`CreatureGrid.ts` decay-curve swap) | Lane 4 needs Lane 1 + Lane 2 merged; Lane 5 needs Lane 1 + Lane 3 merged (Lane 3 already touched `CreatureGrid.ts`) | Both lanes' branches merged |
| **3 — Integration** | single lane, no worktree (runs in the feature worktree directly) | Phase 2 fully merged | Full suite green + manual browser pass |

**Why Lane 4 and Lane 5 are safe to parallelize:** they touch disjoint files (`RaidController.ts` vs. `CreatureGrid.ts`) despite sharing an upstream dependency (`raidRules.ts`), which is read-only to both once Phase 1 has merged.

**Base branch for everything in this plan:** `worktree-security-raid-protest` (the existing feature branch checked out at `.claude/worktrees/security-raid-protest`) — **not** `main`. This plan's own final output is still unmerged feature work; merging the whole feature to `main` is out of scope here.

**Worktree creation** (run from the main repo root, `/Users/abhishek/Fun Satire`, never from inside `.worktrees/` or the feature worktree itself):

```bash
# Phase 1 — all three in parallel:
git worktree add .worktrees/raid-unify-lane-1-raid-rules -b raid-unify/phase-1/lane-1-raid-rules worktree-security-raid-protest
git worktree add .worktrees/raid-unify-lane-2-entity-pool -b raid-unify/phase-1/lane-2-entity-pool worktree-security-raid-protest
git worktree add .worktrees/raid-unify-lane-3-filterpanel-sync -b raid-unify/phase-1/lane-3-filterpanel-sync worktree-security-raid-protest
```

Each new worktree needs `npm install` (package.json present) and a clean-baseline `npx vitest run` before any implementer subagent starts work in it, per `superpowers:using-git-worktrees`.

**Phase 2 worktrees are created only after Phase 1 has fully merged**, based on the post-merge tip of `worktree-security-raid-protest`:

```bash
git worktree add .worktrees/raid-unify-lane-4-raidcontroller -b raid-unify/phase-2/lane-4-raidcontroller-refactor worktree-security-raid-protest
git worktree add .worktrees/raid-unify-lane-5-creaturegrid-decay -b raid-unify/phase-2/lane-5-creaturegrid-decay worktree-security-raid-protest
```

**Merge strategy:** each lane branch merges directly back into `worktree-security-raid-protest` (fast-forward or a plain merge commit — this is an internal feature-branch integration, not a GitHub PR) once its two-stage review (below) passes. Phase 2 lanes do not branch until every Phase 1 lane has merged. Phase 3 has no branch of its own — it runs directly against `worktree-security-raid-protest` after Phase 2 merges.

**Per-task review protocol** (every task below, per `superpowers:subagent-driven-development`):
1. Dispatch implementer subagent into the task's lane worktree with the task's full text (not a summary, not "read the plan file").
2. Implementer writes tests first (TDD), implements, runs the full suite, commits, self-reviews, reports DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
3. Dispatch a spec-compliance reviewer subagent (checks the task's stated requirements only — no more, no less). Loop implementer fixes ↔ reviewer until ✅.
4. Dispatch a code-quality reviewer subagent (`superpowers:requesting-code-review` template). Loop until Approved.
5. Merge the lane branch into `worktree-security-raid-protest`.

**Model tiers:**

| Task | Files touched | Judgment required | Tier |
|---|---|---|---|
| 1 (raidRules.ts) | 2 new files | Low — pure functions, fully specified below | Cheap |
| 2 (EntityPool.ts) | 2 new files | Low-medium — generic bookkeeping, fully specified below | Standard |
| 3 (FilterPanel sync) | 3 files (small edits each) | Low | Cheap |
| 4 (RaidController refactor) | 1 file, several methods | High — must preserve every existing observable behavior exactly | Most capable |
| 5 (CreatureGrid decay swap) | 1 file + 1 test file | Medium — deliberate curve-shape change, needs care with existing test semantics | Standard |
| 6 (Integration) | none (verification only) | Medium — judgment on whether a regression is real | Standard, escalate to most-capable on any doubt |

**Skills every implementer subagent loads:** `superpowers:test-driven-development`. Task 6 additionally loads `superpowers:verification-before-completion`. No task needs `high-end-visual-design` (no new visuals) or any Figma/design skill.

**Rollback triggers:**
1. **A Phase 2 lane's spec-compliance review surfaces a gap in Phase 1's design** (e.g. `EntityPool.despawn()`'s stagger math doesn't match what `RaidController` actually needs). Halt that lane, dispatch a fix subagent against the Phase 1 lane's *already-merged* code on a small follow-up branch off `worktree-security-raid-protest`, re-review, re-merge, then resume the blocked Phase 2 lane.
2. **Task 6's regression pass finds a behavior difference from pre-refactor.** This is not a "ship as known issue" case — this plan's explicit goal is zero behavior change (Task 4/5 are refactors, not redesigns). Any real diff is a bug in the refactor: fix it in the offending lane's file, re-run Task 6.
3. **An implementer reports BLOCKED because a task's "read lines X–Y first" step reveals the file no longer matches what this plan describes** (e.g. an unrelated commit landed on `worktree-security-raid-protest` mid-execution). Escalate to the controller (you) rather than guessing — re-read the current file, adjust the task inline, resume.

---

## Non-Goals (confirmed scope cuts from the design spec)

- **No `allowIdleFlicker` config flag on `EntityPool`.** The design spec proposed one; on implementation, security's controller simply never calls a "reactivate from waiting" operation, and `EntityPool` in this plan doesn't expose one at all (YAGNI — nothing in this plan's scope needs it). If a future `CreatureGrid`-onto-`EntityPool` migration needs it, add it then.
- **`CreatureGrid`'s own spawn/fade/repop bookkeeping stays on its current internals**, except for the one curve swap in Task 5. Crowd growth (randomized pop-in within a wave window) and shrink (`setQuantity`'s immediate hard cut, independent of the background fade/repop flicker) don't share `EntityPool`'s stagger/delay shape closely enough to justify forcing them through it without a speculative fit. Recommend a follow-up plan if that migration is wanted later.
- **No `raidIntensity` running score.** The design spec floated this as a future simplification for security-unit counts; on closer look, the shipped code already derives every security-unit count directly and correctly (`spawnPulse`'s random 2–3, `poofAndEscalate`'s `poofCount + bonusSpawn`) without needing an intermediate score. Introducing one now would be an unused abstraction.

---

## Phase 1, Lane 1: `raidRules.ts`

**Worktree:** `.worktrees/raid-unify-lane-1-raid-rules` — branch `raid-unify/phase-1/lane-1-raid-rules`

### Task 1: Pure raid-classification and decay-curve module

**Files:**
- Create: `src/creatures/raidRules.ts`
- Test: `tests/unit/raidRules.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/raidRules.test.ts
import { describe, it, expect } from 'vitest';
import {
  classifyRelease,
  decayTowardFloor,
  FULL_POWER_THRESHOLD,
  MEDIUM_POWER_THRESHOLD,
  QTY_BOOST_MEDIUM_CAP,
  QTY_BOOST_LOW_CAP,
} from '../../src/creatures/raidRules';
import { QTY_MAX } from '../../src/config/tokens';

describe('classifyRelease', () => {
  it('classifies exactly FULL_POWER_THRESHOLD as a full win', () => {
    const outcome = classifyRelease(FULL_POWER_THRESHOLD, 200);
    expect(outcome.band).toBe('full');
    expect(outcome.isWin).toBe(true);
    expect(outcome.crowdCount).toBe(QTY_MAX);
  });

  it('classifies just below FULL_POWER_THRESHOLD as medium, not full', () => {
    const outcome = classifyRelease(FULL_POWER_THRESHOLD - 0.001, 200);
    expect(outcome.band).toBe('medium');
    expect(outcome.isWin).toBe(false);
  });

  it('classifies exactly MEDIUM_POWER_THRESHOLD as medium', () => {
    expect(classifyRelease(MEDIUM_POWER_THRESHOLD, 200).band).toBe('medium');
  });

  it('classifies just below MEDIUM_POWER_THRESHOLD as low', () => {
    expect(classifyRelease(MEDIUM_POWER_THRESHOLD - 0.001, 200).band).toBe('low');
  });

  it('caps the medium boost at QTY_BOOST_MEDIUM_CAP for a large baseline', () => {
    expect(classifyRelease(0.5, 10000).crowdCount).toBe(QTY_BOOST_MEDIUM_CAP);
  });

  it('caps the low boost at QTY_BOOST_LOW_CAP for a large baseline', () => {
    expect(classifyRelease(0.1, 10000).crowdCount).toBe(QTY_BOOST_LOW_CAP);
  });

  it('rounds an uncapped medium boost to the nearest 10', () => {
    // 103 * 1.75 = 180.25 -> rounds to 180
    expect(classifyRelease(0.5, 103).crowdCount).toBe(180);
  });
});

describe('decayTowardFloor', () => {
  it('returns 1 at elapsed 0', () => {
    expect(decayTowardFloor(0, 0.25, 1000)).toBe(1);
  });

  it('returns 1 for negative elapsed (pre-decay / still in a grace window)', () => {
    expect(decayTowardFloor(-500, 0.25, 1000)).toBe(1);
  });

  it('returns exactly halfway between 1 and floorFraction at elapsed === halfLifeMs', () => {
    expect(decayTowardFloor(1000, 0.25, 1000)).toBeCloseTo(0.625, 6); // 0.25 + 0.75 * 0.5
  });

  it('approaches floorFraction as elapsed grows large', () => {
    expect(decayTowardFloor(20000, 0.25, 1000)).toBeCloseTo(0.25, 3);
  });

  it('never drops below floorFraction', () => {
    expect(decayTowardFloor(1_000_000, 0.1, 500)).toBeGreaterThanOrEqual(0.1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/raidRules.test.ts`
Expected: FAIL — `Cannot find module '../../src/creatures/raidRules'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/creatures/raidRules.ts
import { QTY_MAX } from "../config/tokens";

/** Threshold (inclusive) a released protest charge fraction must reach to count as FULL
 * power — the only winning outcome. Deliberately tight (top of the sweep) so landing it is a
 * real timing skill, not a coin flip. */
export const FULL_POWER_THRESHOLD = 0.92;
/** Below this fraction, a backfired release counts as LOW power rather than MEDIUM. */
export const MEDIUM_POWER_THRESHOLD = 0.4;
/** MEDIUM-power crowd boost: baseline * (1 + this), rounded to the nearest 10, capped at
 * QTY_BOOST_MEDIUM_CAP. */
export const QTY_BOOST_MEDIUM_FRACTION = 0.75;
export const QTY_BOOST_MEDIUM_CAP = 400;
/** LOW-power crowd boost: same shape as MEDIUM, smaller fraction and cap. */
export const QTY_BOOST_LOW_FRACTION = 0.3;
export const QTY_BOOST_LOW_CAP = 280;
/** Extra units added on top of the poofed count when a raid regroups after a MEDIUM/LOW
 * backfire — MEDIUM escalates faster than LOW (see RaidController.poofAndEscalate). */
export const BACKFIRE_ESCALATE_MEDIUM = 2;
export const BACKFIRE_ESCALATE_LOW = 1;
/** Hard cap on simultaneous security units, regardless of raid severity. */
export const SECURITY_MAX_UNITS = 40;
/** Crowd never drops below this fraction of its size when a raid started. */
export const RAID_FLOOR_FRACTION = 0.25;
/** Half-life (ms) of the raid-attrition decay curve — see decayTowardFloor. At this many ms
 * elapsed since the current attrition baseline was set, the crowd has decayed exactly halfway
 * from that baseline toward the floor. */
export const RAID_HALF_LIFE_MS = 45_000;

function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

export type PowerBand = "full" | "medium" | "low";

export interface PowerOutcome {
  band: PowerBand;
  /** The crowd's new count once this outcome is applied. */
  crowdCount: number;
  /** true only for "full" — the only winning outcome. */
  isWin: boolean;
}

/**
 * Pure: classifies a released protest charge fraction into one of three power bands and
 * computes the resulting crowd count. `baselineCrowdCount` must be the crowd size at the
 * moment the charge started (RaidController.chargeBaselineCount), not the current, possibly
 * already-decayed live count — MEDIUM/LOW boosts grow from that baseline.
 */
export function classifyRelease(fraction: number, baselineCrowdCount: number): PowerOutcome {
  if (fraction >= FULL_POWER_THRESHOLD) {
    return { band: "full", crowdCount: QTY_MAX, isWin: true };
  }
  const isMedium = fraction >= MEDIUM_POWER_THRESHOLD;
  const boostFraction = isMedium ? QTY_BOOST_MEDIUM_FRACTION : QTY_BOOST_LOW_FRACTION;
  const cap = isMedium ? QTY_BOOST_MEDIUM_CAP : QTY_BOOST_LOW_CAP;
  const crowdCount = Math.min(roundToTen(baselineCrowdCount * (1 + boostFraction)), cap);
  return { band: isMedium ? "medium" : "low", crowdCount, isWin: false };
}

/**
 * Pure: fraction of a starting quantity that should remain `elapsedMs` after decay began,
 * ramping from 1 down toward `floorFraction` with the given `halfLifeMs` — an exponential
 * half-life curve: at elapsedMs === halfLifeMs, exactly halfway between 1 and floorFraction
 * remains. Shared by CreatureGrid's idle-decay and RaidController's raid-attrition — same
 * shape, different (floorFraction, halfLifeMs) per caller. Callers with a grace period before
 * decay should start (e.g. CreatureGrid's IDLE_GRACE_MS) pass `Math.max(0, elapsedMs - grace)`.
 */
export function decayTowardFloor(elapsedMs: number, floorFraction: number, halfLifeMs: number): number {
  if (elapsedMs <= 0) return 1;
  const decay = Math.pow(0.5, elapsedMs / halfLifeMs);
  return floorFraction + (1 - floorFraction) * decay;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/raidRules.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/raidRules.ts tests/unit/raidRules.test.ts
git commit -m "feat: add raidRules module (power-band classification, shared decay curve)"
```

---

## Phase 1, Lane 2: `EntityPool.ts`

**Worktree:** `.worktrees/raid-unify-lane-2-entity-pool` — branch `raid-unify/phase-1/lane-2-entity-pool`

### Task 2: Generic spawn/despawn lifecycle pool

**Files:**
- Create: `src/creatures/EntityPool.ts`
- Test: `tests/unit/entityPool.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/entityPool.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EntityPool } from '../../src/creatures/EntityPool';

describe('EntityPool', () => {
  it('add() registers refs as immediately active', () => {
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    pool.add([{ id: 1 }, { id: 2 }]);
    expect(pool.activeCount).toBe(2);
    expect(pool.allRefs).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('despawn() removes refs only after despawnMs elapses, firing onDespawn once per ref', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const despawned: number[] = [];
    const pool = new EntityPool<{ id: number }>({ onDespawn: (ref) => despawned.push(ref.id) });
    const refs = [{ id: 1 }, { id: 2 }];
    pool.add(refs);

    pool.despawn(refs, 100);
    pool.tick(50);
    expect(despawned).toEqual([]);
    expect(pool.activeCount).toBe(0); // no longer 'active' (now 'despawning')
    expect(pool.allRefs.length).toBe(2); // still tracked until removal

    pool.tick(100);
    expect(despawned.sort()).toEqual([1, 2]);
    expect(pool.allRefs.length).toBe(0);
  });

  it('despawn() staggers removal by staggerMs per ref', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const despawned: number[] = [];
    const pool = new EntityPool<{ id: number }>({ onDespawn: (ref) => despawned.push(ref.id) });
    const refs = [{ id: 1 }, { id: 2 }];
    pool.add(refs);

    pool.despawn(refs, 100, { staggerMs: 50 });
    pool.tick(100); // first ref's window (0*50+100=100) elapsed, second's (1*50+100=150) not yet
    expect(despawned).toEqual([1]);
    pool.tick(150);
    expect(despawned).toEqual([1, 2]);
  });

  it('despawn() fires onSettled exactly once, after every ref in the batch is removed', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const refs = [{ id: 1 }, { id: 2 }];
    pool.add(refs);
    const onSettled = vi.fn();

    pool.despawn(refs, 100, { staggerMs: 50, onSettled });
    pool.tick(100);
    expect(onSettled).not.toHaveBeenCalled();
    pool.tick(150);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('despawn() never fires onSettled for an empty refs list', () => {
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const onSettled = vi.fn();
    pool.despawn([], 100, { onSettled });
    pool.tick(1000);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('spawnScheduled() creates refs via factory only once fireAtMs has elapsed, respecting delayMs/staggerMs', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1000);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    let nextId = 1;

    pool.spawnScheduled({ count: 2, factory: () => ({ id: nextId++ }), delayMs: 500, staggerMs: 200 });
    pool.tick(1400); // before first fireAtMs (1000+500=1500)
    expect(pool.activeCount).toBe(0);

    pool.tick(1500); // first fires
    expect(pool.activeCount).toBe(1);

    pool.tick(1700); // second fires (1000+500+200=1700)
    expect(pool.activeCount).toBe(2);
  });

  it('spawnScheduled() returns spawned refs from tick() and fires onSettled once the whole batch has fired', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const onSettled = vi.fn();
    let nextId = 1;

    pool.spawnScheduled({ count: 2, factory: () => ({ id: nextId++ }), staggerMs: 100, onSettled });
    const result1 = pool.tick(0);
    expect(result1.spawned).toEqual([{ id: 1 }]);
    expect(onSettled).not.toHaveBeenCalled();

    const result2 = pool.tick(100);
    expect(result2.spawned).toEqual([{ id: 2 }]);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('cancelScheduledSpawns() drops any pending spawns and their onSettled', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const onSettled = vi.fn();
    pool.spawnScheduled({ count: 3, factory: () => ({ id: 1 }), delayMs: 1000, onSettled });

    pool.cancelScheduledSpawns();
    pool.tick(5000);
    expect(pool.activeCount).toBe(0);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('removeAll() clears every tracked ref without firing onDespawn', () => {
    const despawned: number[] = [];
    const pool = new EntityPool<{ id: number }>({ onDespawn: (ref) => despawned.push(ref.id) });
    pool.add([{ id: 1 }, { id: 2 }]);
    pool.removeAll();
    expect(pool.allRefs.length).toBe(0);
    expect(despawned).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/entityPool.test.ts`
Expected: FAIL — `Cannot find module '../../src/creatures/EntityPool'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/creatures/EntityPool.ts

export type PoolPhase = "active" | "despawning";

interface PoolEntry<T> {
  ref: T;
  phase: PoolPhase;
  removeAtMs: number;
}

interface ScheduledSpawn<T> {
  fireAtMs: number;
  factory: () => T;
}

interface BatchTracker {
  remaining: number;
  onSettled?: () => void;
}

export interface DespawnOptions {
  /** ms between each ref's own removal window starting — 0 (default) removes every ref in
   * this call after the same despawnMs delay. */
  staggerMs?: number;
  /** Fires exactly once, the tick every ref in this call has actually been removed. Never
   * fires for an empty refs list. */
  onSettled?: () => void;
}

export interface SpawnScheduleOptions<T> {
  count: number;
  /** Creates one new ref per call — invoked once per scheduled spawn, in no particular
   * relative order; close over any per-call state (e.g. a running index) the caller needs. */
  factory: () => T;
  /** ms between each spawn's own fire time — 0 (default) fires every spawn in this call at
   * the same time. */
  staggerMs?: number;
  /** ms from now before the first spawn in this call fires — 0 (default) fires immediately
   * (next tick()). */
  delayMs?: number;
  /** Fires exactly once, the tick every spawn in this call has actually fired. */
  onSettled?: () => void;
}

export interface TickResult<T> {
  spawned: T[];
  despawned: T[];
}

export interface EntityPoolConfig<T> {
  /** Called once per ref, the tick its despawn timer elapses — do DOM/resource cleanup here. */
  onDespawn: (ref: T) => void;
}

/**
 * Generic lifecycle bookkeeping shared by any pooled entity type that needs "some exist now,
 * grow/shrink toward a count, notify once a batch of that growth/shrink has visibly landed."
 * Deliberately doesn't know about rendering, physics, or DOM — callers own all of that; this
 * only tracks which refs exist, which are mid-despawn, and which spawns are still pending.
 */
export class EntityPool<T> {
  private entries: PoolEntry<T>[] = [];
  private scheduledSpawns: ScheduledSpawn<T>[] = [];
  private spawnBatch: BatchTracker | null = null;
  private despawnBatch: BatchTracker | null = null;
  private readonly onDespawnCb: (ref: T) => void;

  constructor(config: EntityPoolConfig<T>) {
    this.onDespawnCb = config.onDespawn;
  }

  /** Registers already-created refs as immediately active — for entities the caller spawned
   * itself, outside of spawnScheduled(). */
  add(refs: readonly T[]): void {
    for (const ref of refs) this.entries.push({ ref, phase: "active", removeAtMs: 0 });
  }

  /** Every ref this pool is still tracking, regardless of phase (active or despawning). */
  get allRefs(): T[] {
    return this.entries.map((e) => e.ref);
  }

  get activeCount(): number {
    return this.entries.filter((e) => e.phase === "active").length;
  }

  /** Marks `refs` despawning; each is removed (onDespawn fired) `despawnMs` after its own
   * stagger slot. No-op for an empty `refs` list. Calling this again before a prior despawn
   * batch has fully settled replaces this pool's single outstanding despawn-batch tracker —
   * callers should not start overlapping despawn batches on the same pool. */
  despawn(refs: readonly T[], despawnMs: number, opts: DespawnOptions = {}): void {
    if (refs.length === 0) return;
    const refSet = new Set(refs);
    const now = Date.now();
    const stagger = opts.staggerMs ?? 0;
    let i = 0;
    for (const e of this.entries) {
      if (!refSet.has(e.ref) || e.phase === "despawning") continue;
      e.phase = "despawning";
      e.removeAtMs = now + i * stagger + despawnMs;
      i++;
    }
    this.despawnBatch = { remaining: i, onSettled: opts.onSettled };
  }

  /** Schedules `opts.count` new refs to spawn via `opts.factory`, one per fired slot. No-op
   * for count 0. Calling this again before a prior spawn batch has fully fired replaces this
   * pool's single outstanding spawn-batch tracker — see cancelScheduledSpawns() to explicitly
   * drop a superseded batch first. */
  spawnScheduled(opts: SpawnScheduleOptions<T>): void {
    if (opts.count === 0) return;
    const now = Date.now();
    const delay = opts.delayMs ?? 0;
    const stagger = opts.staggerMs ?? 0;
    for (let i = 0; i < opts.count; i++) {
      this.scheduledSpawns.push({ fireAtMs: now + delay + i * stagger, factory: opts.factory });
    }
    this.spawnBatch = { remaining: opts.count, onSettled: opts.onSettled };
  }

  /** Drops every not-yet-fired scheduled spawn and its onSettled — for a caller that needs a
   * new outcome to supersede an in-flight regroup (e.g. a full-power win cancelling a
   * MEDIUM/LOW backfire's trickle-in). */
  cancelScheduledSpawns(): void {
    this.scheduledSpawns = [];
    this.spawnBatch = null;
  }

  /** Call once per engine frame. Removes any despawning ref whose window has elapsed (firing
   * onDespawn), fires any scheduled spawn whose fireAtMs has elapsed (adding it as active),
   * and fires each batch's onSettled the instant that batch fully lands. Returns exactly
   * which refs were spawned/despawned this call, so callers can react (e.g. re-run a
   * formation layout only when something actually spawned). */
  tick(nowMs: number): TickResult<T> {
    const despawned: T[] = [];
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]!;
      if (e.phase === "despawning" && nowMs >= e.removeAtMs) {
        this.entries.splice(i, 1);
        despawned.push(e.ref);
        this.onDespawnCb(e.ref);
        if (this.despawnBatch) {
          this.despawnBatch.remaining--;
          if (this.despawnBatch.remaining <= 0) {
            const cb = this.despawnBatch.onSettled;
            this.despawnBatch = null;
            cb?.();
          }
        }
      }
    }

    const spawned: T[] = [];
    for (let i = this.scheduledSpawns.length - 1; i >= 0; i--) {
      const s = this.scheduledSpawns[i]!;
      if (nowMs < s.fireAtMs) continue;
      this.scheduledSpawns.splice(i, 1);
      const ref = s.factory();
      this.add([ref]);
      spawned.push(ref);
      if (this.spawnBatch) {
        this.spawnBatch.remaining--;
        if (this.spawnBatch.remaining <= 0) {
          const cb = this.spawnBatch.onSettled;
          this.spawnBatch = null;
          cb?.();
        }
      }
    }

    return { spawned, despawned };
  }

  /** Drops every tracked ref immediately, without firing onDespawn — for teardown, where the
   * caller does its own cleanup loop over allRefs first. */
  removeAll(): void {
    this.entries = [];
    this.scheduledSpawns = [];
    this.spawnBatch = null;
    this.despawnBatch = null;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/entityPool.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/EntityPool.ts tests/unit/entityPool.test.ts
git commit -m "feat: add generic EntityPool spawn/despawn lifecycle module"
```

---

## Phase 1, Lane 3: FilterPanel live crowd-count sync

**Worktree:** `.worktrees/raid-unify-lane-3-filterpanel-sync` — branch `raid-unify/phase-1/lane-3-filterpanel-sync`

### Task 3: Sync the Filters "Numbers" slider on every crowd-count change, not just raid-end

**Context for the implementer:** Today, `main.ts` only calls `filterPanel.setQuantity(grid.getCreatureCount())` when `raidController.getState()` transitions from non-idle back to `idle` (see `src/main.ts` around line 260–268). This means the slider stays stale for the entire duration of a raid — during attrition drain, a MEDIUM/LOW boost, or the instant a full-power win maxes the crowd, the panel doesn't reflect the live count until the raid fully ends. This task adds a `CreatureGrid.onQuantityChange` hook fired from inside `setQuantity()` itself (every time the count actually changes, regardless of who called it — the Filters slider, or `RaidController`'s attrition/boost/win logic), and wires it to a new `FilterPanel.syncQuantity()` method that updates the displayed value without re-firing the panel's own user-driven change callback (avoiding a redundant round-trip back into `grid.setQuantity()`).

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:230-259` (field + constructor), `src/creatures/CreatureGrid.ts:328-375` (`setQuantity`)
- Modify: `src/hud/FilterPanel.ts:176-188` (near `setQuantity`)
- Modify: `src/main.ts:200-268` (wiring)
- Test: `tests/unit/creatureGrid.test.ts`, `tests/unit/filterPanel.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/creatureGrid.test.ts` (inside the existing `describe('CreatureGrid', ...)` block, as a sibling of the existing `describe('setQuantity', ...)` block):

```typescript
describe('onQuantityChange', () => {
  it('fires with the new count when setQuantity actually changes the count', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240
    const cb = vi.fn();
    grid.onQuantityChange(cb);
    grid.setQuantity(250);
    expect(cb).toHaveBeenCalledWith(250);
  });

  it('does not fire when setQuantity is called with the current count', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240
    const cb = vi.fn();
    grid.onQuantityChange(cb);
    grid.setQuantity(240);
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires on a shrink as well as a growth', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240
    const cb = vi.fn();
    grid.onQuantityChange(cb);
    grid.setQuantity(200);
    expect(cb).toHaveBeenCalledWith(200);
  });
});
```

Add to `tests/unit/filterPanel.test.ts` (as a new top-level `describe`, alongside the existing ones):

```typescript
describe("syncQuantity", () => {
  it("updates the displayed quantity without firing onQuantityChange", () => {
    const cb = vi.fn();
    panel.onQuantityChange(cb);
    panel.syncQuantity(150);
    expect(panel.getQuantity()).toBe(150);
    expect(cb).not.toHaveBeenCalled();
  });

  it("clamps and rounds to the nearest step, same as setQuantity", () => {
    panel.syncQuantity(157);
    expect(panel.getQuantity()).toBe(160);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/creatureGrid.test.ts tests/unit/filterPanel.test.ts`
Expected: FAIL — `grid.onQuantityChange is not a function` / `panel.syncQuantity is not a function`

- [ ] **Step 3: Implement `CreatureGrid.onQuantityChange`**

In `src/creatures/CreatureGrid.ts`, add a new private field next to the other callback-shaped state (near `private repulsor: Repulsor | null = null;` around line 247):

```typescript
  private quantityChangeCb: ((count: number) => void) | null = null;
```

Add a new public method anywhere in the class body (e.g. directly above `getCreatureCount()`):

```typescript
  /** Fires with the new count every time setQuantity() actually changes the creature count —
   * whether the caller was a user dragging the Filters slider or RaidController's own
   * attrition/boost/win logic. Never fires for a no-op setQuantity() call. */
  onQuantityChange(cb: (count: number) => void): void {
    this.quantityChangeCb = cb;
  }
```

In `setQuantity()` (`src/creatures/CreatureGrid.ts:328-375`), add one line at the very end of the method, after the reflow loop closes (right before the method's closing `}`):

```typescript
    this.quantityChangeCb?.(clampedTarget);
```

(The existing early return `if (clampedTarget === current) return;` at the top of the method already guarantees this only fires on a genuine change.)

- [ ] **Step 4: Implement `FilterPanel.syncQuantity`**

In `src/hud/FilterPanel.ts`, add a new public method directly after `setQuantity()` (after line 183):

```typescript
  /** Updates the displayed quantity from an external change (e.g. a raid's live crowd count)
   * without firing quantityChangeCb — that callback is reserved for user-driven slider input,
   * so an external sync doesn't round-trip back into a redundant grid.setQuantity() call. */
  syncQuantity(quantity: number): void {
    const clamped = Math.max(QTY_MIN, Math.min(QTY_MAX, Math.round(quantity / QTY_STEP) * QTY_STEP));
    this.quantity = clamped;
    this.qtyValue.textContent = String(clamped);
    this.qtyInput.value = String(clamped);
    this.updateQtyFill(clamped);
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/creatureGrid.test.ts tests/unit/filterPanel.test.ts`
Expected: PASS

- [ ] **Step 6: Wire it up in `main.ts`, replacing the raid-end-only polling sync**

In `src/main.ts`, find this block (around line 205-208, where `filterPanel.onQuantityChange` is already wired):

```typescript
    filterPanel.onQuantityChange((qty) => {
      grid.setQuantity(qty);
```

Immediately after that `filterPanel.onQuantityChange(...)` call's closing `});`, add:

```typescript
    grid.onQuantityChange((count) => {
      filterPanel.syncQuantity(count);
    });
```

Then find the polling block this replaces (around line 260-268):

```typescript
    let prevRaidState = raidController.getState();
    engine.onTick(() => {
      powerMeter.setFraction(raidController.getChargeFraction());
      const raidState = raidController.getState();
      if (raidState === "idle" && prevRaidState !== "idle") {
        filterPanel.setQuantity(grid.getCreatureCount());
      }
      prevRaidState = raidState;
    });
```

Replace it with:

```typescript
    engine.onTick(() => {
      powerMeter.setFraction(raidController.getChargeFraction());
    });
```

(`prevRaidState` is not used anywhere else in the file — confirm with `grep -n "prevRaidState" src/main.ts` before deleting; it should show zero remaining references after this edit.)

- [ ] **Step 7: Manual browser verification**

Run `npm run dev`. Open the Filters panel. Shake the avatar to start a raid and watch the Numbers slider — it should now visibly tick down during attrition (previously it stayed frozen until Protest ended the raid). Hold Protest to a MEDIUM/LOW release and confirm the slider jumps up to the boosted value immediately. Hold to FULL and confirm it jumps to max immediately. This is a `hud/`-touching change per CLAUDE.md's human-testing rule — do not skip this step.

- [ ] **Step 8: Commit**

```bash
git add src/creatures/CreatureGrid.ts src/hud/FilterPanel.ts src/main.ts tests/unit/creatureGrid.test.ts tests/unit/filterPanel.test.ts
git commit -m "feat: live-sync Filters panel quantity slider to every crowd-count change"
```

---

## Phase 2, Lane 4: `RaidController` refactor onto `EntityPool` + `raidRules`

**Worktree:** `.worktrees/raid-unify-lane-4-raidcontroller` — branch `raid-unify/phase-2/lane-4-raidcontroller-refactor` (create only after all three Phase 1 lanes have merged into `worktree-security-raid-protest`)

**Context for the implementer:** This is a pure internals refactor of `src/creatures/RaidController.ts`. Its public API (`onAvatarMove`, `startCharging`, `releaseCharge`, `tick`, `getState`, `getSecurityUnits`, `getRaidFloor`, `startRecovery`, `destroy`, `setAvatarWidth`, `syncAvatarCenter`) does not change, and every existing test in `tests/unit/raidController.test.ts` should keep passing unmodified — that file is the regression oracle for this task. The refactor replaces: the raw `units: SecurityUnitState[]` array with an `EntityPool<SecurityUnitState>`; the `pendingRespawns`/`regroupInFlight` bookkeeping with `EntityPool.spawnScheduled()`'s built-in `onSettled`; the `clearingViaProtestWin` boolean with `EntityPool.despawn()`'s `onSettled`; the inline power-band branching in `releaseCharge()` with `classifyRelease()`; and the discrete attrition step-timer with `decayTowardFloor()`.

### Task 4: Refactor RaidController internals

**Files:**
- Modify: `src/creatures/RaidController.ts` (whole-file internals rewrite; public API unchanged)
- Verify only (no edits expected): `tests/unit/raidController.test.ts`

- [ ] **Step 1: Establish the regression baseline**

Run: `npx vitest run tests/unit/raidController.test.ts`
Expected: PASS (all existing tests green, before any change — this is the baseline the rest of this task must not break)

- [ ] **Step 2: Add re-exports so existing imports keep working**

`tests/unit/raidController.test.ts` and `src/main.ts` import `FULL_POWER_THRESHOLD`, `MEDIUM_POWER_THRESHOLD`, and `SECURITY_MAX_UNITS` from `../../src/creatures/RaidController` / `./creatures/RaidController`. These constants are moving to live in `raidRules.ts` (Phase 1, Lane 1, already merged) — re-export them from `RaidController.ts` so no import site needs to change. At the top of `src/creatures/RaidController.ts`, after the existing `SecurityCreature` import block, add:

```typescript
import {
  classifyRelease,
  decayTowardFloor,
  FULL_POWER_THRESHOLD,
  MEDIUM_POWER_THRESHOLD,
  SECURITY_MAX_UNITS,
  RAID_FLOOR_FRACTION,
  RAID_HALF_LIFE_MS,
  BACKFIRE_ESCALATE_MEDIUM,
  BACKFIRE_ESCALATE_LOW,
} from "./raidRules";
import { EntityPool } from "./EntityPool";

export {
  FULL_POWER_THRESHOLD,
  MEDIUM_POWER_THRESHOLD,
  SECURITY_MAX_UNITS,
} from "./raidRules";
```

Then **delete** these now-duplicated local `const` declarations from `RaidController.ts` (they're superseded by the imports above): `SECURITY_MAX_UNITS` (line 86), `RAID_FLOOR_FRACTION` (line 104), `RAID_ATTRITION_INTERVAL_MS` (line 106), `RAID_ATTRITION_STEP` (line 108), `FULL_POWER_THRESHOLD` (line 138), `MEDIUM_POWER_THRESHOLD` (line 140), `QTY_BOOST_MEDIUM_FRACTION`/`QTY_BOOST_MEDIUM_CAP`/`QTY_BOOST_LOW_FRACTION`/`QTY_BOOST_LOW_CAP` (lines 143-147), `BACKFIRE_ESCALATE_MEDIUM`/`BACKFIRE_ESCALATE_LOW` (lines 161-162), and the local `roundToTen` helper (lines 164-166, now unused since `classifyRelease` owns that math). Keep `SPAWN_MIN_PER_PULSE`, `SPAWN_MAX_PER_PULSE`, `SECURITY_REPEL_RADIUS`, `AVATAR_REPEL_RADIUS_AFTER_WIN`, `BACKFIRE_POOF_FRACTION`, `BACKFIRE_RESPAWN_DELAY_MS`, `BACKFIRE_RESPAWN_STAGGER_MS`, `CHARGE_SWEEP_HALF_PERIOD_MS`, `SHAKE_*` constants exactly as they are — these stay local to `RaidController.ts`.

- [ ] **Step 3: Replace the `units` array with an `EntityPool`, and update `getSecurityUnits()`**

Replace the field declarations (originally lines 220-224):

```typescript
  private state: RaidState = "idle";
  private units: SecurityUnitState[] = [];
  private pendingRespawns: number[] = [];
```

with:

```typescript
  private state: RaidState = "idle";
  private readonly securityPool = new EntityPool<SecurityUnitState>({
    onDespawn: (unit) => {
      this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
      removeSecurityUnit(unit);
    },
  });
```

Delete the `regroupInFlight` and `clearingViaProtestWin` fields entirely (both become unnecessary once `EntityPool`'s `onSettled` callbacks own this signaling — see Step 5).

Replace `getSecurityUnits()`:

```typescript
  getSecurityUnits(): SecurityUnit[] {
    const now = Date.now();
    return this.securityPool.allRefs.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius:
        u.phase === "shrinking"
          ? SECURITY_REPEL_RADIUS * computeSecurityShrinkFraction(u.phaseStartMs, now)
          : SECURITY_REPEL_RADIUS,
    }));
  }
```

(Only the source array changed, from `this.units` to `this.securityPool.allRefs` — the mapping logic is identical.)

- [ ] **Step 4: Rewrite `spawnPulse()` to use the pool, and add attrition-baseline tracking**

Add two new private fields alongside `raidStartCount` (which stays, unchanged, for `getRaidFloor()`):

```typescript
  /** Crowd count the attrition decay curve is currently decaying from — reset every time the
   * crowd is deliberately bumped up (a fresh raid start, or a MEDIUM/LOW boost), so attrition
   * always resumes decaying from wherever the crowd actually is, not from the raid's original
   * starting count. */
  private attritionBaselineCount = 0;
  private attritionBaselineAtMs = 0;
```

Replace `spawnPulse()`:

```typescript
  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
      this.attritionBaselineCount = this.raidStartCount;
      this.attritionBaselineAtMs = Date.now();
      this.grid.setAvatarRepelRadius(null);
    }

    const available = SECURITY_MAX_UNITS - this.securityPool.allRefs.length;
    if (available <= 0) return;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const desired = Math.round(rand(SPAWN_MIN_PER_PULSE, SPAWN_MAX_PER_PULSE));
    const n = Math.min(desired, available);
    const kinds = pickPulseKinds(n);

    const newUnits = kinds.map((kind) => {
      const unit = createSecurityUnit(this.avatarLayer, x, y, kind);
      startSecurityEntranceBurst(unit, vw, vh);
      return unit;
    });
    this.securityPool.add(newUnits);
    assignEscortFormation(this.securityPool.allRefs);
  }
```

(This spawns immediately via `add()`, not `spawnScheduled()` — `spawnPulse()` has no delay/stagger in the original behavior, so there's no need to wait a `tick()` for it to land. `spawnScheduled()` is reserved for the genuinely delayed backfire trickle-in, in Step 5.)

- [ ] **Step 5: Rewrite `poofAndEscalate()`, `releaseCharge()`, `beginUnitsShrinkSweep()`, `startRecovery()`**

Replace `poofAndEscalate()`:

```typescript
  private poofAndEscalate(bonusSpawn: number): void {
    const now = Date.now();
    const standing = this.securityPool.allRefs.filter((u) => u.phase !== "shrinking");
    const poofCount =
      standing.length === 0 ? 0 : Math.min(standing.length, Math.max(1, Math.round(standing.length * BACKFIRE_POOF_FRACTION)));
    const targets = standing.slice(0, poofCount);
    targets.forEach((unit) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now;
    });
    this.securityPool.despawn(targets, SECURITY_SHRINK_MS);

    const respawnCount = poofCount + bonusSpawn;
    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    this.securityPool.spawnScheduled({
      count: respawnCount,
      factory: () => {
        const unit = createSecurityUnit(this.avatarLayer, this.lastAvatarX, this.lastAvatarY, pickSecurityKind());
        startSecurityEntranceBurst(unit, vw, vh);
        return unit;
      },
      staggerMs: BACKFIRE_RESPAWN_STAGGER_MS,
      delayMs: BACKFIRE_RESPAWN_DELAY_MS,
      onSettled: () => this.onProtestBackfireSettled?.(this.securityPool.activeCount),
    });
  }
```

Replace `beginUnitsShrinkSweep()` to take an optional settle callback:

```typescript
  /** Marks every unit shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so they
   * pop out one after another, and hands the whole despawn batch to the pool so `onSettled`
   * fires exactly once every unit has actually been removed. */
  private beginUnitsShrinkSweep(onSettled?: () => void): void {
    const now = Date.now();
    const units = this.securityPool.allRefs;
    units.forEach((unit, i) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now + i * SECURITY_SHRINK_MS;
    });
    this.securityPool.despawn(units, SECURITY_SHRINK_MS, { staggerMs: SECURITY_SHRINK_MS, onSettled });
  }
```

Replace `releaseCharge()`:

```typescript
  releaseCharge(): void {
    if (this.state !== "charging") return;

    const fraction = this.chargeFraction;
    this.chargeFraction = 0;
    const outcome = classifyRelease(fraction, this.chargeBaselineCount);

    if (outcome.isWin) {
      this.grid.setQuantity(outcome.crowdCount);
      // A complete win cancels any regrouping a prior MEDIUM/LOW release already queued —
      // otherwise those respawns would still trickle in afterward.
      this.securityPool.cancelScheduledSpawns();
      if (this.securityPool.allRefs.length === 0) {
        this.state = "idle";
        this.grid.setAvatarRepelRadius(AVATAR_REPEL_RADIUS_AFTER_WIN);
        this.onProtestWin?.();
        return;
      }
      this.state = "recovering";
      this.beginUnitsShrinkSweep(() => {
        this.grid.setAvatarRepelRadius(AVATAR_REPEL_RADIUS_AFTER_WIN);
        this.onProtestWin?.();
      });
      return;
    }

    // MEDIUM or LOW power: backfire. Grant the capped crowd boost for this band *before*
    // resetting the attrition baseline, so attrition resumes decaying from the boosted total.
    this.grid.setQuantity(outcome.crowdCount);
    this.attritionBaselineCount = outcome.crowdCount;
    this.attritionBaselineAtMs = Date.now();

    if (!this.chargeStartedDuringRaid) {
      // No raid running when this charge began — starts one immediately, exactly like a
      // shake. spawnPulse() only runs its idle->raiding initialization when the prior state
      // is 'idle', so set that explicitly first. The spawn burst is immediate, so it's
      // settled the moment it's created.
      this.state = "idle";
      this.spawnPulse(this.lastAvatarX, this.lastAvatarY);
      this.onProtestBackfireSettled?.(this.securityPool.activeCount);
      return;
    }

    // A raid is already running: it regroups AND escalates rather than just topping up —
    // some units poof out now, and more than that many trickle back in one at a time after a
    // beat (see poofAndEscalate()). MEDIUM escalates harder than LOW.
    this.state = "raiding";
    this.poofAndEscalate(outcome.band === "medium" ? BACKFIRE_ESCALATE_MEDIUM : BACKFIRE_ESCALATE_LOW);
  }
```

Replace `startRecovery()`:

```typescript
  startRecovery(): void {
    if (this.state === "recovering" || this.state === "charging") return;

    this.grid.setQuantity(QTY_MAX);
    this.securityPool.cancelScheduledSpawns();

    if (this.securityPool.allRefs.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    this.beginUnitsShrinkSweep();
  }
```

- [ ] **Step 6: Rewrite `tick()` to drive the pool and use `decayTowardFloor` for attrition**

```typescript
  tick(nowMs: number): void {
    const { spawned } = this.securityPool.tick(nowMs);
    if (spawned.length > 0) assignEscortFormation(this.securityPool.allRefs);

    for (const unit of this.securityPool.allRefs) {
      applyEscortStep(unit, this.lastAvatarX, this.lastAvatarY, nowMs, this.avatarWidth);
      applyEscortRangeConstraint(unit, this.lastAvatarX, this.lastAvatarY, this.avatarWidth);
    }
    applySecurityCollisions(this.securityPool.allRefs);

    if (this.state === "raiding") {
      const elapsed = nowMs - this.attritionBaselineAtMs;
      const floor = this.getRaidFloor();
      const decayed = Math.round(
        this.attritionBaselineCount * decayTowardFloor(elapsed, RAID_FLOOR_FRACTION, RAID_HALF_LIFE_MS),
      );
      const desired = Math.max(floor, decayed);
      if (desired < this.grid.getCreatureCount()) {
        this.grid.setQuantity(desired);
      }
    }

    if (this.state === "recovering") {
      if (this.securityPool.allRefs.length === 0) {
        this.state = "idle";
      }
      return;
    }

    if (this.state !== "charging") return;

    const elapsed = nowMs - this.chargeStartAtMs;
    const period = CHARGE_SWEEP_HALF_PERIOD_MS * 2;
    const cyclePos = (elapsed % period) / CHARGE_SWEEP_HALF_PERIOD_MS;
    this.chargeFraction = cyclePos <= 1 ? cyclePos : 2 - cyclePos;
  }
```

- [ ] **Step 7: Rewrite `destroy()`**

```typescript
  destroy(): void {
    for (const unit of this.securityPool.allRefs) {
      removeSecurityUnit(unit);
    }
    this.securityPool.removeAll();
    this.state = "idle";
  }
```

- [ ] **Step 8: Run the full regression suite**

Run: `npx vitest run tests/unit/raidController.test.ts`
Expected: PASS, same test count as the Step 1 baseline, zero modifications to the test file itself. If any test fails, the refactor introduced a real behavior difference — fix `RaidController.ts` (not the test) until green, since this task's contract is zero behavior change.

Run: `npx vitest run` (full suite)
Expected: PASS — no other file imports `RaidController`'s internals directly, so nothing else should be affected.

Run: `npx tsc --noEmit` (or `npm run build`)
Expected: no type errors — confirms every deleted/renamed local constant was fully replaced by its `raidRules` import.

- [ ] **Step 9: Manual browser verification**

Run `npm run dev`. Shake to trigger a raid (confirm units spawn, escort, and repel the crowd as before). Watch the crowd count drain smoothly over time (attrition now uses a decay curve instead of a fixed step — it's fine if the exact drain rate feels slightly different, since `RAID_HALF_LIFE_MS` is a fresh tuning constant, but it must still visibly and steadily drain toward the floor, never stall or drop instantly). Hold Protest to FULL and confirm the win sequence (units shrink out, sticker locks, crowd maxes) looks identical to before. Hold to MEDIUM/LOW with a raid active and confirm the poof-then-escalating-trickle-back regroup still reads correctly. Hold to MEDIUM/LOW with no raid active and confirm a fresh raid still spawns immediately. This touches `creatures/` per CLAUDE.md's human-testing rule — do not skip.

- [ ] **Step 10: Commit**

```bash
git add src/creatures/RaidController.ts
git commit -m "refactor: rebuild RaidController's security-unit lifecycle on EntityPool + raidRules"
```

---

## Phase 2, Lane 5: `CreatureGrid` idle-decay curve swap

**Worktree:** `.worktrees/raid-unify-lane-5-creaturegrid-decay` — branch `raid-unify/phase-2/lane-5-creaturegrid-decay` (create only after all three Phase 1 lanes have merged — this lane edits `CreatureGrid.ts`, which Phase 1 Lane 3 already touched, so it must branch from the post-Phase-1 tip, not an earlier commit)

**Context for the implementer:** This replaces `CreatureGrid`'s bespoke linear `idleVisibleFraction` ramp with the shared `decayTowardFloor` from `raidRules.ts` (merged in Phase 1, Lane 1). This is a deliberate curve-shape change (linear → exponential half-life), not a pure refactor — the user has explicitly signed off on re-tuning this curve as part of this work. The existing `describe('idleVisibleFraction', ...)` block in `tests/unit/creatureGridIdleResurge.test.ts` tests the old linear curve's exact shape (e.g. "reaches the floor fraction exactly at grace + decay") and must be replaced, not just left in place, since those assertions are specific to the linear model and don't hold for an exponential one. `decayTowardFloor`'s own curve-shape correctness is already fully covered by Phase 1 Lane 1's `raidRules.test.ts` — this file only needs to confirm `CreatureGrid.update()` actually calls it correctly, not re-prove the curve math.

### Task 5: Swap `idleVisibleFraction` for `decayTowardFloor`

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:29-34` (constants), `src/creatures/CreatureGrid.ts:96-106` (remove `idleVisibleFraction`), `src/creatures/CreatureGrid.ts:487-493` (call site)
- Modify: `tests/unit/creatureGridIdleResurge.test.ts:1-42`, `:196`, `:231`

- [ ] **Step 1: Read the current state of the two integration tests this task must keep passing**

Run: `sed -n '180,242p' tests/unit/creatureGridIdleResurge.test.ts` and confirm the two tests ("stops replenishing once the crowd has decayed to the idle floor" and "never desires more visible creatures than exist for a crowd smaller than the idle floor") still match what's quoted below. Both use `IDLE_GRACE_MS + IDLE_DECAY_MS + 60_000` purely as "comfortably past full decay" — neither depends on the curve being linear, only on the elapsed time being far enough past decay that the crowd has settled at its floor. If the file has diverged from what's shown here (e.g. a different commit landed on `worktree-security-raid-protest` in the meantime), stop and report BLOCKED rather than guessing.

- [ ] **Step 2: Rename the decay constant and update the failing/updated test assertions**

In `tests/unit/creatureGridIdleResurge.test.ts`, replace the import block (lines 3-16):

```typescript
import {
  CreatureGrid,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_HALF_LIFE_MS,
  IDLE_FLOOR_FRACTION,
  MOVEMENT_NOISE_PX,
  FAST_DRAG_SPEED_PX_MS,
  BURST_DURATION_MS,
  REPOP_COUNT,
} from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';
import { decayTowardFloor } from '../../src/creatures/raidRules';
import { QTY_MIN } from '../../src/config/tokens';
```

Replace the entire `describe('idleVisibleFraction', ...)` block (original lines 18-42) with a much smaller integration-only check — the curve math itself is already covered by `raidRules.test.ts`:

```typescript
describe('CreatureGrid idle-decay call site', () => {
  it('feeds decayTowardFloor the grace-adjusted elapsed time and the idle floor fraction', () => {
    // Confirms the two constants CreatureGrid.update() actually uses match what
    // raidRules.test.ts already proved the curve does with them — this is a wiring
    // check, not a re-proof of decayTowardFloor's own math.
    const atGrace = decayTowardFloor(0, IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
    expect(atGrace).toBe(1);
    const wellPast = decayTowardFloor(IDLE_HALF_LIFE_MS * 10, IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
    expect(wellPast).toBeCloseTo(IDLE_FLOOR_FRACTION, 3);
  });
});
```

Update the two elapsed-time computations at (originally) lines 196 and 231, in both cases replacing `IDLE_DECAY_MS` with a comfortably-converged multiple of the new half-life constant:

```typescript
    state.lastActivityMs = Date.now() - (IDLE_GRACE_MS + IDLE_HALF_LIFE_MS * 8);
```

(Applies to both occurrences — this is a rename plus swapping the old fixed `+ 60_000` pad for an `* 8` half-life margin, since an exponential curve needs several half-lives to be "comfortably converged" the way the old linear curve was exactly-converged at `grace + decay`. At 8 half-lives, the residual above the floor is under 0.4% — negligible against `Math.round()`.)

- [ ] **Step 3: Run the tests to verify the updated ones fail (old exports gone) and confirm the two integration tests' expected behavior**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: FAIL — `IDLE_HALF_LIFE_MS` is not exported yet from `CreatureGrid.ts`

- [ ] **Step 4: Implement the swap in `CreatureGrid.ts`**

Replace the constant block (lines 29-34):

```typescript
/** Grace period before an idle sticker starts draining the crowd (ms). */
export const IDLE_GRACE_MS = 20_000;
/** Half-life (ms) of the idle-decay curve — see raidRules.decayTowardFloor. At this many ms
 * past IDLE_GRACE_MS, the visible crowd has decayed exactly halfway from full to the idle
 * floor. */
export const IDLE_HALF_LIFE_MS = 70_000;
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
```

Add the import at the top of the file, alongside the existing `creaturePhysics`/`EyeCreature` imports:

```typescript
import { decayTowardFloor } from "./raidRules";
```

Delete the `idleVisibleFraction` function entirely (originally lines 96-106, including its doc comment).

In `update()`'s demand-driven repop block (originally lines 487-493), replace:

```typescript
      const idleMs = now - this.lastActivityMs;
      const desiredVisibleCount = Math.min(
        this.targetCount,
        Math.max(IDLE_FLOOR_MIN_COUNT, Math.round(this.targetCount * idleVisibleFraction(idleMs))),
      );
```

with:

```typescript
      const idleMs = now - this.lastActivityMs;
      const decayFraction = decayTowardFloor(Math.max(0, idleMs - IDLE_GRACE_MS), IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
      const desiredVisibleCount = Math.min(
        this.targetCount,
        Math.max(IDLE_FLOOR_MIN_COUNT, Math.round(this.targetCount * decayFraction)),
      );
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: PASS

Run: `npx vitest run` (full suite)
Expected: PASS

Run: `npx tsc --noEmit`
Expected: no type errors (confirms no other file imports the now-deleted `idleVisibleFraction` or `IDLE_DECAY_MS` — check with `grep -rn "idleVisibleFraction\|IDLE_DECAY_MS" src/ tests/` and fix any straggler import before proceeding)

- [ ] **Step 6: Manual browser verification**

Run `npm run dev`. Drop the avatar somewhere and leave it untouched for a couple of minutes — confirm the crowd visibly, smoothly thins toward the idle floor (no stalling, no instant jump) and that dragging the avatar again brings it back via the existing burst-recovery behavior (unaffected by this change). This touches `creatures/` per CLAUDE.md's human-testing rule.

- [ ] **Step 7: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGridIdleResurge.test.ts
git commit -m "refactor: swap CreatureGrid's idle-decay curve for the shared decayTowardFloor"
```

---

## Phase 3: Integration & Regression

**Runs directly in the feature worktree** (`.claude/worktrees/security-raid-protest`), after both Phase 2 lanes have merged into `worktree-security-raid-protest`. No new worktree.

### Task 6: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Merge both Phase 2 lane branches into `worktree-security-raid-protest`**

```bash
cd "/Users/abhishek/Fun Satire/.claude/worktrees/security-raid-protest"
git merge raid-unify/phase-2/lane-4-raidcontroller-refactor
git merge raid-unify/phase-2/lane-5-creaturegrid-decay
```

If either merge conflicts, stop and resolve manually — the plan's file-disjointness claim in the Execution Model section is what should prevent this; a conflict here means that claim didn't hold and needs investigating before continuing.

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS. Per the project's own `CLAUDE.md`, 17 pre-existing failures in `hoverTones`/`filterPanel`/`onboarding` copy tests are known-unrelated to this work (noted in the feature's prior session) — confirm the failure count and names match that known set exactly, and that nothing new has broken.

- [ ] **Step 3: Type-check and build**

Run: `npm run build`
Expected: PASS, no type errors, no new bundle warnings.

- [ ] **Step 4: Full manual regression pass in the browser**

Run `npm run dev` and walk through, end to end:
1. Idle decay: leave the avatar untouched, confirm smooth thinning toward the floor (Task 5).
2. Shake to raid: confirm security spawns, escorts, repels the crowd; confirm the Filters panel's Numbers slider live-updates during attrition (Task 3 + Task 4 interacting).
3. Protest FULL power: confirm win sequence (security shrink-sweep, sticker lock, crowd max, Filters slider jumps to max) is identical to pre-refactor behavior.
4. Protest MEDIUM/LOW with an active raid: confirm poof-then-escalating-trickle regroup, Filters slider updates on the boost.
5. Protest MEDIUM/LOW with no active raid: confirm a fresh raid spawns immediately.
6. Resize the avatar mid-raid: confirm the escort ring rescales correctly (unaffected by this plan, but a good smoke test that nothing in the refactor broke `avatarWidth` plumbing).

- [ ] **Step 5: Final code review**

Dispatch a final code-reviewer subagent (`superpowers:requesting-code-review`) over the full diff from before Task 1 started to the current `worktree-security-raid-protest` tip, covering all five prior tasks together — this catches cross-task issues no single lane's reviewer would see (e.g. a naming mismatch between what Lane 1 exported and what Lane 4 expected, even though both passed their own review).

- [ ] **Step 6: Clean up worktrees**

```bash
cd "/Users/abhishek/Fun Satire"
git worktree remove .worktrees/raid-unify-lane-1-raid-rules
git worktree remove .worktrees/raid-unify-lane-2-entity-pool
git worktree remove .worktrees/raid-unify-lane-3-filterpanel-sync
git worktree remove .worktrees/raid-unify-lane-4-raidcontroller
git worktree remove .worktrees/raid-unify-lane-5-creaturegrid-decay
git branch -d raid-unify/phase-1/lane-1-raid-rules raid-unify/phase-1/lane-2-entity-pool raid-unify/phase-1/lane-3-filterpanel-sync raid-unify/phase-2/lane-4-raidcontroller-refactor raid-unify/phase-2/lane-5-creaturegrid-decay
```

(Only after confirming every commit from each branch is present on `worktree-security-raid-protest` — `git log worktree-security-raid-protest --oneline | grep -c <lane-branch-tip-sha>` or simply `git branch --merged worktree-security-raid-protest` should list all five before deleting.)

---

## Spec Coverage Table

| Design spec section | Implemented by |
|---|---|
| `EntityPool` (spawn/despawn/settle) | Task 2 |
| `decayTowardFloor` (shared idle/raid decay curve) | Task 1 (definition), Task 4 (raid attrition consumer), Task 5 (idle consumer) |
| `classifyRelease` (power-band classification) | Task 1 (definition), Task 4 (consumer) |
| `onSettled` ordering contract (fires after DOM state change) | Task 2 (mechanism), Task 4 (`onProtestWin`/`onProtestBackfireSettled` wiring) |
| `chargeStartedDuringRaid`-style snapshot rule | Already shipped pre-plan; preserved unchanged by Task 4 (not re-derived from `securityPool` emptiness) |
| Security stays flicker-free | Task 4 — `securityPool` never calls a reactivate-from-waiting operation (none exists) |
| Filter-panel update logic at spawn/despawn/win | Task 3 |
| Tuning proposals (`RAID_HALF_LIFE_MS`, `IDLE_HALF_LIFE_MS`) | Task 1 (raid), Task 5 (idle) — both ship as concrete defaults, adjustable later |
