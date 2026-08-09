# Idle Crowd Decay & Quick-Drag Resurge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the crowd's already-present fade/re-pop churn into an intentional idle-gated decay
(full population while the sticker is being dragged, decaying toward a ~2%-of-target floor after
~5 minutes of it sitting still) with a fast-drag resurge burst that floods the crowd back — plus
raise the quantity slider's ceiling from 500 to 900.

**Architecture:** All new state and logic lives in `CreatureGrid.ts`, which already receives the
sticker's position every frame via `update(avatarX, avatarY)` — nothing else moves the crowd's
attractor post-onboarding. Two new pure functions (`idleVisibleFraction`, `dragSpeedPxPerMs`)
compute the decay curve and drag speed; new private fields track the last position/activity/burst
timestamps; the existing fixed-rate re-pop tick becomes demand-driven, closing the gap toward a
computed `desiredVisibleCount` each tick, capped higher during a fast-drag burst window. The
existing fade-out tick is untouched. `QTY_MAX` in `config/tokens.ts` is a one-line bump.

**Tech Stack:** TypeScript, Vitest (`happy-dom` environment), `vi.useFakeTimers()` for
deterministic timing tests, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-10-idle-crowd-resurge-design.md`

---

## Task 1: Raise the quantity slider ceiling to 900

**Files:**
- Modify: `src/config/tokens.ts:49`
- Modify: `tests/unit/creatureGrid.test.ts:250-256`
- Modify: `tests/unit/filterPanel.test.ts:50, 100-111, 386-391`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/creatureGrid.test.ts`, replace:

```ts
    it('clamps a target above QTY_MAX (500) down to 500', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setQuantity(9999);
      expect(grid.getCreatureCount()).toBe(500);
    });
```

with:

```ts
    it('clamps a target above QTY_MAX (900) down to 900', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      grid.setQuantity(9999);
      expect(grid.getCreatureCount()).toBe(900);
    });
```

In `tests/unit/filterPanel.test.ts`, replace line 50:

```ts
      expect(qtyInput?.max).toBe("500");
```

with:

```ts
      expect(qtyInput?.max).toBe("900");
```

Replace the `"respects maximum bound (500)"` test:

```ts
    it("respects maximum bound (500)", () => {
      panel = new FilterPanel(500, 1);
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onQuantityChange(cb);

      const qtyInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-qty]");
      qtyInput!.value = "500";
      qtyInput?.dispatchEvent(new Event("input", { bubbles: true }));

      expect(panel.getQuantity()).toBe(500);
    });
```

with:

```ts
    it("respects maximum bound (900)", () => {
      panel = new FilterPanel(900, 1);
      panel.attachTo(settingsButton);
      const cb = vi.fn();
      panel.onQuantityChange(cb);

      const qtyInput = panel.getRoot().querySelector<HTMLInputElement>("[data-filter-qty]");
      qtyInput!.value = "900";
      qtyInput?.dispatchEvent(new Event("input", { bubbles: true }));

      expect(panel.getQuantity()).toBe(900);
    });
```

Replace the `"clamps to maximum"` test:

```ts
    it("clamps to maximum", () => {
      panel.attachTo(settingsButton);
      panel.setQuantity(600);

      expect(panel.getQuantity()).toBe(500);
    });
```

with:

```ts
    it("clamps to maximum", () => {
      panel.attachTo(settingsButton);
      panel.setQuantity(1000);

      expect(panel.getQuantity()).toBe(900);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/creatureGrid.test.ts tests/unit/filterPanel.test.ts`
Expected: FAIL — 4 assertions fail (`900` expected, `500` received), since `QTY_MAX` is still `500`.

- [ ] **Step 3: Bump the constant**

In `src/config/tokens.ts`, replace:

```ts
export const QTY_MAX = 500;
```

with:

```ts
export const QTY_MAX = 900;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/creatureGrid.test.ts tests/unit/filterPanel.test.ts`
Expected: PASS (all tests in both files).

- [ ] **Step 5: Commit**

```bash
git add src/config/tokens.ts tests/unit/creatureGrid.test.ts tests/unit/filterPanel.test.ts
git commit -m "feat: raise quantity slider ceiling from 500 to 900"
```

---

## Task 2: Add idle-decay curve and drag-speed pure functions

**Files:**
- Modify: `src/creatures/CreatureGrid.ts` (constants block, near line 24; new functions after
  `computeSpawnProgress`, near line 70)
- Test: `tests/unit/creatureGridIdleResurge.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/creatureGridIdleResurge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  idleVisibleFraction,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_DECAY_MS,
  IDLE_FLOOR_FRACTION,
} from '../../src/creatures/CreatureGrid';

describe('idleVisibleFraction', () => {
  it('stays at 1 with no idle time', () => {
    expect(idleVisibleFraction(0)).toBe(1);
  });

  it('stays at 1 through the end of the grace period', () => {
    expect(idleVisibleFraction(IDLE_GRACE_MS)).toBe(1);
  });

  it('is partway down midway through the decay ramp', () => {
    const midIdle = IDLE_GRACE_MS + IDLE_DECAY_MS / 2;
    const fraction = idleVisibleFraction(midIdle);
    expect(fraction).toBeGreaterThan(IDLE_FLOOR_FRACTION);
    expect(fraction).toBeLessThan(1);
    expect(fraction).toBeCloseTo(1 - 0.5 * (1 - IDLE_FLOOR_FRACTION), 5);
  });

  it('reaches the floor fraction exactly at grace + decay', () => {
    expect(idleVisibleFraction(IDLE_GRACE_MS + IDLE_DECAY_MS)).toBeCloseTo(IDLE_FLOOR_FRACTION, 10);
  });

  it('holds at the floor fraction well past the decay window', () => {
    expect(idleVisibleFraction(IDLE_GRACE_MS + IDLE_DECAY_MS * 10)).toBeCloseTo(IDLE_FLOOR_FRACTION, 10);
  });
});

describe('dragSpeedPxPerMs', () => {
  it('computes distance over time', () => {
    expect(dragSpeedPxPerMs(120, 100)).toBeCloseTo(1.2, 10);
  });

  it('returns 0 for zero distance', () => {
    expect(dragSpeedPxPerMs(0, 100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: FAIL — `idleVisibleFraction` and `dragSpeedPxPerMs` are not exported from
`CreatureGrid.ts` yet (import error).

- [ ] **Step 3: Add the constants**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
/** Random re-pop cadence for invisible creatures (ms between batches). */
export const REPOP_INTERVAL_MS = 2000;
/** How many invisible creatures randomly pop back in per interval. */
export const REPOP_COUNT = 3;
/** Extra slack (px) beyond a creature's own rendered half-size for hover proximity. */
export const HOVER_PROXIMITY_PADDING = 20;
```

with:

```ts
/** Random re-pop cadence for invisible creatures (ms between batches). */
export const REPOP_INTERVAL_MS = 2000;
/** How many invisible creatures randomly pop back in per interval. */
export const REPOP_COUNT = 3;
/** Grace period before an idle sticker starts draining the crowd (ms). */
export const IDLE_GRACE_MS = 20_000;
/** How long the decay ramp takes, from grace-end to the floor (ms). */
export const IDLE_DECAY_MS = 300_000;
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
/** Extra slack (px) beyond a creature's own rendered half-size for hover proximity. */
export const HOVER_PROXIMITY_PADDING = 20;
```

- [ ] **Step 4: Add the two pure functions**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
  const progress = t / SPAWN_POP_MS;
  return {
    scale: easeOutBack(progress),
    opacity: Math.min(1, progress / 0.6),
    done: false,
  };
}

/**
 * Resolves a creature's visual state for the current frame. Handles the
```

with:

```ts
  const progress = t / SPAWN_POP_MS;
  return {
    scale: easeOutBack(progress),
    opacity: Math.min(1, progress / 0.6),
    done: false,
  };
}

/**
 * Pure function: how much of the target crowd should be visible right now,
 * given how long the sticker has sat still. 1 while within the grace
 * period, ramping linearly down to IDLE_FLOOR_FRACTION over IDLE_DECAY_MS,
 * then holding there.
 */
export function idleVisibleFraction(idleMs: number): number {
  if (idleMs <= IDLE_GRACE_MS) return 1;
  const t = Math.min(1, (idleMs - IDLE_GRACE_MS) / IDLE_DECAY_MS);
  return 1 - t * (1 - IDLE_FLOOR_FRACTION);
}

/** Pure function: drag speed in px/ms from a frame's movement distance and elapsed time. */
export function dragSpeedPxPerMs(distancePx: number, dtMs: number): number {
  return distancePx / dtMs;
}

/**
 * Resolves a creature's visual state for the current frame. Handles the
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGridIdleResurge.test.ts
git commit -m "feat: add idle-decay curve and drag-speed pure functions to CreatureGrid"
```

---

## Task 3: Track sticker activity and fast-drag bursts in `update()`

No observable behavior changes yet — this task only adds state tracking, verified by inspecting
`CreatureGrid`'s private fields directly (same pattern the existing test suite already uses).
Task 4 makes the re-pop logic actually read this state.

**Files:**
- Modify: `src/creatures/CreatureGrid.ts` (constants block; class fields near line 200; `update()`
  method start near line 346)
- Test: `tests/unit/creatureGridIdleResurge.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/creatureGridIdleResurge.test.ts`, replace the import line:

```ts
import { describe, it, expect } from 'vitest';
import {
  idleVisibleFraction,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_DECAY_MS,
  IDLE_FLOOR_FRACTION,
} from '../../src/creatures/CreatureGrid';
```

with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreatureGrid,
  idleVisibleFraction,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_DECAY_MS,
  IDLE_FLOOR_FRACTION,
  MOVEMENT_NOISE_PX,
  FAST_DRAG_SPEED_PX_MS,
  BURST_DURATION_MS,
} from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';
```

Then append a new describe block at the end of the file:

```ts

describe('CreatureGrid update — activity & fast-drag tracking', () => {
  let container: HTMLElement;
  let config: CreatureGridConfig;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
    config = { container, mode: 'cockroach' };
  });

  it('does not record activity on the very first update() call (no baseline yet)', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const state = grid as unknown as { lastActivityMs: number; burstUntilMs: number };
    const initialActivityMs = state.lastActivityMs;

    grid.update(400, 300);

    expect(state.lastActivityMs).toBe(initialActivityMs);
    expect(state.burstUntilMs).toBe(0);
  });

  it('resets the idle clock on any movement above the noise threshold', () => {
    vi.useFakeTimers();
    try {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.update(400, 300);

      vi.advanceTimersByTime(5000);
      grid.update(400 + MOVEMENT_NOISE_PX + 1, 300);

      const state = grid as unknown as { lastActivityMs: number };
      expect(state.lastActivityMs).toBe(Date.now());
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores sub-noise-threshold jitter', () => {
    vi.useFakeTimers();
    try {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.update(400, 300);
      const state = grid as unknown as { lastActivityMs: number };
      const activityAfterFirstCall = state.lastActivityMs;

      vi.advanceTimersByTime(5000);
      grid.update(400 + MOVEMENT_NOISE_PX * 0.5, 300);

      expect(state.lastActivityMs).toBe(activityAfterFirstCall);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens a burst window when movement crosses the fast-drag speed threshold', () => {
    vi.useFakeTimers();
    try {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.update(400, 300);

      vi.advanceTimersByTime(16);
      // 16ms frame, moving 100px — 6.25px/ms, well over FAST_DRAG_SPEED_PX_MS (1.2).
      grid.update(400 + 100, 300);

      const state = grid as unknown as { burstUntilMs: number };
      expect(state.burstUntilMs).toBe(Date.now() + BURST_DURATION_MS);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not open a burst window for slow movement', () => {
    vi.useFakeTimers();
    try {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      grid.update(400, 300);

      vi.advanceTimersByTime(1000);
      // 1000ms frame, moving 10px — 0.01px/ms, well under the threshold.
      grid.update(410, 300);

      const state = grid as unknown as { burstUntilMs: number };
      expect(state.burstUntilMs).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

Also add `beforeEach` to the vitest import at the very top of the file if not already present (it
isn't, from Task 2) — the final import line from vitest should read:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: FAIL — `MOVEMENT_NOISE_PX`, `FAST_DRAG_SPEED_PX_MS`, `BURST_DURATION_MS` aren't exported
yet, and `CreatureGrid` has no `lastActivityMs`/`burstUntilMs` fields (import/type errors).

- [ ] **Step 3: Add the new constants**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
/** Extra slack (px) beyond a creature's own rendered half-size for hover proximity. */
export const HOVER_PROXIMITY_PADDING = 20;
```

with:

```ts
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
/** Sub-pixel jitter below this doesn't count as sticker movement. */
export const MOVEMENT_NOISE_PX = 1.5;
/** Drag speed (px/ms) above which a movement counts as a "fast" resurge trigger. */
export const FAST_DRAG_SPEED_PX_MS = 1.2;
/** How long a fast-drag burst window stays open after the last qualifying movement (ms). */
export const BURST_DURATION_MS = 3_000;
/** Extra slack (px) beyond a creature's own rendered half-size for hover proximity. */
export const HOVER_PROXIMITY_PADDING = 20;
```

- [ ] **Step 4: Add the new private fields**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
  private lastFadePickMs: number = 0;
  private lastRepopPickMs: number = 0;
  private repulsor: Repulsor | null = null;
```

with:

```ts
  private lastFadePickMs: number = 0;
  private lastRepopPickMs: number = 0;
  private lastAvatarX: number | null = null;
  private lastAvatarY: number | null = null;
  private lastFrameMs: number = 0;
  private lastActivityMs: number = Date.now();
  private burstUntilMs: number = 0;
  private repulsor: Repulsor | null = null;
```

- [ ] **Step 5: Wire movement tracking into `update()`**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
  update(avatarX: number, avatarY: number): void {
    const avatar = { x: avatarX, y: avatarY };
    const now = Date.now();

    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams, this.repulsor);
    }
```

with:

```ts
  update(avatarX: number, avatarY: number): void {
    const avatar = { x: avatarX, y: avatarY };
    const now = Date.now();

    if (this.lastAvatarX !== null && this.lastAvatarY !== null) {
      const dx = avatarX - this.lastAvatarX;
      const dy = avatarY - this.lastAvatarY;
      const dist = Math.hypot(dx, dy);
      if (dist > MOVEMENT_NOISE_PX) {
        this.lastActivityMs = now;
        const dt = Math.max(1, now - this.lastFrameMs);
        if (dragSpeedPxPerMs(dist, dt) > FAST_DRAG_SPEED_PX_MS) {
          this.burstUntilMs = now + BURST_DURATION_MS;
        }
      }
    }
    this.lastAvatarX = avatarX;
    this.lastAvatarY = avatarY;
    this.lastFrameMs = now;

    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams, this.repulsor);
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`
Expected: all tests pass — this task only adds inert state tracking, so no other file's behavior
changes.

- [ ] **Step 8: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGridIdleResurge.test.ts
git commit -m "feat: track sticker activity and fast-drag bursts in CreatureGrid"
```

---

## Task 4: Make re-pop demand-driven — idle decay and resurge burst

This is where the crowd's behavior actually changes: full population while active, decaying
toward the idle floor, flooding back on a fast drag.

**Files:**
- Modify: `src/creatures/CreatureGrid.ts` (constants block; `spawn()` near line 230; `update()`'s
  re-pop tick near line 440)
- Test: `tests/unit/creatureGridIdleResurge.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/creatureGridIdleResurge.test.ts`, replace the import line:

```ts
import {
  CreatureGrid,
  idleVisibleFraction,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_DECAY_MS,
  IDLE_FLOOR_FRACTION,
  MOVEMENT_NOISE_PX,
  FAST_DRAG_SPEED_PX_MS,
  BURST_DURATION_MS,
} from '../../src/creatures/CreatureGrid';
```

with:

```ts
import {
  CreatureGrid,
  idleVisibleFraction,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_DECAY_MS,
  IDLE_FLOOR_FRACTION,
  MOVEMENT_NOISE_PX,
  FAST_DRAG_SPEED_PX_MS,
  BURST_DURATION_MS,
  REPOP_COUNT,
} from '../../src/creatures/CreatureGrid';
```

Then append a new describe block at the end of the file:

```ts

describe('CreatureGrid update — demand-driven re-pop (idle decay + resurge)', () => {
  let container: HTMLElement;
  let config: CreatureGridConfig;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
    config = { container, mode: 'cockroach' };
  });

  it('fully refills a small deficit while active (idle time near zero)', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240 creatures for cockroach mode's 20x12 grid
    const creatures = (grid as unknown as {
      creatures: Array<{ waitingRespawn: boolean; spawnDone: boolean }>;
    }).creatures;
    for (let i = 0; i < 3; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as { lastFadePickMs: number; lastRepopPickMs: number };
    state.lastFadePickMs = Date.now(); // suppress the fade tick for this frame
    state.lastRepopPickMs = 0; // force the re-pop tick to fire

    grid.update(400, 300);

    expect(creatures.filter((c) => c.waitingRespawn).length).toBe(0);
  });

  it('stops replenishing once the crowd has decayed to the idle floor', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240 creatures
    const creatures = (grid as unknown as {
      creatures: Array<{ waitingRespawn: boolean; spawnDone: boolean }>;
    }).creatures;
    for (let i = 0; i < creatures.length - 2; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as {
      lastActivityMs: number;
      lastFadePickMs: number;
      lastRepopPickMs: number;
    };
    state.lastActivityMs = Date.now() - (IDLE_GRACE_MS + IDLE_DECAY_MS + 60_000);
    state.lastFadePickMs = Date.now();
    state.lastRepopPickMs = 0;

    grid.update(400, 300);

    // Floor for 240 creatures at IDLE_FLOOR_FRACTION (2%) is round(240*0.02) = 5,
    // above IDLE_FLOOR_MIN_COUNT (3). Deficit is 5 - 2 = 3, all closeable in one tick.
    expect(creatures.filter((c) => !c.waitingRespawn).length).toBe(5);
  });

  it('uses the larger burst cap while a fast-drag burst window is open', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240 creatures
    const creatures = (grid as unknown as {
      creatures: Array<{ waitingRespawn: boolean; spawnDone: boolean }>;
    }).creatures;
    for (let i = 0; i < 200; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as {
      lastActivityMs: number;
      burstUntilMs: number;
      lastFadePickMs: number;
      lastRepopPickMs: number;
    };
    state.lastActivityMs = Date.now(); // fully active — desired = target = 240
    state.burstUntilMs = Date.now() + 1000; // burst window open
    state.lastFadePickMs = Date.now();
    state.lastRepopPickMs = 0;

    grid.update(400, 300);

    // Burst cap for 240 target = max(REPOP_COUNT_BURST_MIN=40, round(240*0.15)=36) = 40.
    // 40 already visible + 40 repopped this tick = 80.
    expect(creatures.filter((c) => !c.waitingRespawn).length).toBe(80);
  });

  it('falls back to the normal per-tick cap once the burst window has closed', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240 creatures
    const creatures = (grid as unknown as {
      creatures: Array<{ waitingRespawn: boolean; spawnDone: boolean }>;
    }).creatures;
    for (let i = 0; i < 200; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as {
      lastActivityMs: number;
      burstUntilMs: number;
      lastFadePickMs: number;
      lastRepopPickMs: number;
    };
    state.lastActivityMs = Date.now();
    state.burstUntilMs = 0; // no burst
    state.lastFadePickMs = Date.now();
    state.lastRepopPickMs = 0;

    grid.update(400, 300);

    expect(creatures.filter((c) => !c.waitingRespawn).length).toBe(40 + REPOP_COUNT);
  });

  it('spawn() resets the idle clock and clears any open burst window', () => {
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach');
    const state = grid as unknown as { lastActivityMs: number; burstUntilMs: number };
    state.lastActivityMs = Date.now() - 999_999;
    state.burstUntilMs = Date.now() + 999_999;

    const before = Date.now();
    grid.spawn('cockroach');
    const after = Date.now();

    expect(state.lastActivityMs).toBeGreaterThanOrEqual(before);
    expect(state.lastActivityMs).toBeLessThanOrEqual(after);
    expect(state.burstUntilMs).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: FAIL — `REPOP_COUNT` import works (already existed), but the re-pop tick still uses the
old fixed `REPOP_COUNT` (3) unconditionally, so e.g. the "fully refills a small deficit" test
already happens to pass by coincidence while the burst/floor-specific tests fail (repop still
picks a flat 3 regardless of desired count, and `spawn()` doesn't touch
`lastActivityMs`/`burstUntilMs` yet).

- [ ] **Step 3: Update the re-pop constants**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
/** Random re-pop cadence for invisible creatures (ms between batches). */
export const REPOP_INTERVAL_MS = 2000;
/** How many invisible creatures randomly pop back in per interval. */
export const REPOP_COUNT = 3;
/** Grace period before an idle sticker starts draining the crowd (ms). */
export const IDLE_GRACE_MS = 20_000;
/** How long the decay ramp takes, from grace-end to the floor (ms). */
export const IDLE_DECAY_MS = 300_000;
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
/** Sub-pixel jitter below this doesn't count as sticker movement. */
export const MOVEMENT_NOISE_PX = 1.5;
```

with:

```ts
/** Random re-pop cadence for invisible creatures (ms between batches). */
export const REPOP_INTERVAL_MS = 1500;
/** How many invisible creatures randomly pop back in per interval outside a burst. */
export const REPOP_COUNT = 5;
/** Per-tick re-pop cap during a fast-drag burst, as a fraction of the target quantity. */
export const REPOP_COUNT_BURST_FRACTION = 0.15;
/** Floor for the burst cap so small target quantities still flood back quickly. */
export const REPOP_COUNT_BURST_MIN = 40;
/** Grace period before an idle sticker starts draining the crowd (ms). */
export const IDLE_GRACE_MS = 20_000;
/** How long the decay ramp takes, from grace-end to the floor (ms). */
export const IDLE_DECAY_MS = 300_000;
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
/** Absolute minimum visible count at the idle floor, regardless of target quantity. */
export const IDLE_FLOOR_MIN_COUNT = 3;
/** Sub-pixel jitter below this doesn't count as sticker movement. */
export const MOVEMENT_NOISE_PX = 1.5;
```

- [ ] **Step 4: Reset activity state in `spawn()`**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;
    const modeConfig = MODE_CONFIGS[mode];
    const { cols, rows } = this.gridDimsFor(mode, this.targetCount);
```

with:

```ts
  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;
    this.lastActivityMs = Date.now();
    this.burstUntilMs = 0;
    const modeConfig = MODE_CONFIGS[mode];
    const { cols, rows } = this.gridDimsFor(mode, this.targetCount);
```

- [ ] **Step 5: Replace the re-pop tick with demand-driven logic**

In `src/creatures/CreatureGrid.ts`, replace:

```ts
    // Random respawn: invisible creatures pop back in independently.
    if (now - this.lastRepopPickMs >= REPOP_INTERVAL_MS) {
      const waiting = this.creatures.filter((c) => c.waitingRespawn);
      if (waiting.length > 0) {
        this.lastRepopPickMs = now;
        const count = Math.min(REPOP_COUNT, waiting.length);
        for (let i = 0; i < count; i++) {
          const picked = waiting.splice(Math.floor(Math.random() * waiting.length), 1)[0];
          picked.waitingRespawn = false;
          picked.spawnPopAtMs = now;
        }
      }
    }
  }
```

with:

```ts
    // Demand-driven respawn: closes the gap toward how much of the crowd
    // should be visible right now (full while active, decaying toward the
    // idle floor the longer the sticker sits still), capped per tick so the
    // recovery still animates rather than jumping instantly. A fast drag
    // opens a burst window that raises the cap so the crowd floods back.
    if (now - this.lastRepopPickMs >= REPOP_INTERVAL_MS) {
      this.lastRepopPickMs = now;
      const idleMs = now - this.lastActivityMs;
      const desiredVisibleCount = Math.max(
        IDLE_FLOOR_MIN_COUNT,
        Math.round(this.targetCount * idleVisibleFraction(idleMs)),
      );
      const visibleCount = this.creatures.filter((c) => !c.waitingRespawn).length;
      const deficit = desiredVisibleCount - visibleCount;
      if (deficit > 0) {
        const waiting = this.creatures.filter((c) => c.waitingRespawn);
        const burstCap = Math.max(
          REPOP_COUNT_BURST_MIN,
          Math.round(this.targetCount * REPOP_COUNT_BURST_FRACTION),
        );
        const cap = now < this.burstUntilMs ? burstCap : REPOP_COUNT;
        const count = Math.min(cap, deficit, waiting.length);
        for (let i = 0; i < count; i++) {
          const picked = waiting.splice(Math.floor(Math.random() * waiting.length), 1)[0];
          picked.waitingRespawn = false;
          picked.spawnPopAtMs = now;
        }
      }
    }
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureGridIdleResurge.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`
Expected: all tests pass, including `tests/unit/creatureGridPopIn.test.ts`'s
`'randomly re-pops invisible creatures via a separate pick'` test — it references `REPOP_COUNT`
symbolically (not the literal `3`), and its scenario (20 waiting out of 240, sticker untouched
since construction) produces a deficit of 20, well above the new `REPOP_COUNT` (5), so the
assertion `expect(repopped.length).toBe(REPOP_COUNT)` still holds. If it fails instead, re-check
that `visibleCount`/`deficit` math against the test's setup before changing the test itself — the
spec's intent is for existing pop-in/fade-out behavior to keep working unmodified.

- [ ] **Step 8: Typecheck and build**

Run: `npx tsc --noEmit`, then `npm run build`
Expected: both succeed with no errors.

- [ ] **Step 9: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGridIdleResurge.test.ts
git commit -m "feat: make crowd re-pop demand-driven for idle decay and fast-drag resurge"
```

---

## Task 5: Manual verification in the browser

Per this project's CLAUDE.md, changes touching `creatures/` must be checked in a real browser
before being considered complete — unit tests don't catch visual/feel regressions, and the exact
`FAST_DRAG_SPEED_PX_MS` / `REPOP_COUNT_BURST_FRACTION` defaults are starting points that likely
need tuning by feel.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify the quantity slider**

Open the app, go through onboarding, open the settings/filter panel, and drag the quantity slider
to its new maximum. Confirm it reads 900 and the crowd grows to match. Eyeball frame rate/feel at
900 — this roughly doubles the previous ceiling (500).

- [ ] **Step 3: Verify idle decay**

At the default quantity (300), stop touching the sticker entirely and wait. Confirm the crowd
stays fully populated for the first ~20 seconds (grace period), then visibly thins over the next
~5 minutes, settling to a small trickle (roughly 6 creatures at the default 300 target — 2% of
300, above the 3-creature absolute floor).

- [ ] **Step 4: Verify slow-drag pause (no burst)**

While the crowd is partway decayed, slowly drag the sticker a short distance. Confirm decay stops
and the crowd gently recovers over the following seconds/minutes, without a dramatic flood-back.

- [ ] **Step 5: Verify fast-drag resurge**

While the crowd is decayed (near the floor), quickly flick-drag the sticker. Confirm the crowd
visibly floods back in within a couple seconds, reaching (or nearly reaching) full population
within roughly 10 seconds of continued fast dragging. If the trigger feels too easy or too hard to
hit, adjust `FAST_DRAG_SPEED_PX_MS` in `src/creatures/CreatureGrid.ts` and re-test.

- [ ] **Step 6: Verify across creature modes**

Repeat a quick idle → resurge cycle in at least one non-default mode (e.g. switch to `eyes` or
`placard` via the HUD) to confirm the behavior is mode-agnostic, as designed.

- [ ] **Step 7: Verify mode switch / respawn don't start mid-decay**

Switch modes (or trigger a respawn, if exposed in the HUD) while the crowd is idle-decayed.
Confirm the new crowd spawns at full population rather than immediately looking decayed.

- [ ] **Step 8: Report result**

If all checks pass, the feature is complete. If timing/thresholds feel off, note the specific
constant (`IDLE_GRACE_MS`, `IDLE_DECAY_MS`, `IDLE_FLOOR_FRACTION`, `FAST_DRAG_SPEED_PX_MS`,
`BURST_DURATION_MS`, `REPOP_COUNT_BURST_FRACTION`/`REPOP_COUNT_BURST_MIN`) and what was observed,
so it can be tuned before calling the feature done.

---

## Post-implementation

All tasks above produce working, independently-testable increments. Once Task 5's manual
verification passes (and any constant tuning it surfaces is applied), the feature is done — no
further cleanup tasks are needed.
