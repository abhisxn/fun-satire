// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreatureGrid,
  dragSpeedPxPerMs,
  IDLE_GRACE_MS,
  IDLE_HALF_LIFE_MS,
  IDLE_FLOOR_FRACTION,
  IDLE_FLOOR_MIN_COUNT,
  MOVEMENT_NOISE_PX,
  FAST_DRAG_SPEED_PX_MS,
  BURST_DURATION_MS,
  REPOP_COUNT,
} from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';
import { decayTowardFloor } from '../../src/creatures/raidRules';
import { QTY_MIN } from '../../src/config/tokens';

describe('decayTowardFloor constants used by CreatureGrid', () => {
  it('IDLE_FLOOR_FRACTION/IDLE_HALF_LIFE_MS produce the expected boundary values', () => {
    // Confirms the two constants CreatureGrid.update() actually uses match what
    // raidRules.test.ts already proved the curve does with them — this is a
    // constants-sanity check, not an exercise of CreatureGrid.update() itself
    // (see "reflects the grace-period + half-life wiring mid-decay" below for that).
    const atGrace = decayTowardFloor(0, IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
    expect(atGrace).toBe(1);
    const wellPast = decayTowardFloor(IDLE_HALF_LIFE_MS * 10, IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
    expect(wellPast).toBeCloseTo(IDLE_FLOOR_FRACTION, 2);
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
    for (let i = 0; i < creatures.length - 27; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as {
      lastActivityMs: number;
      lastFadePickMs: number;
      lastRepopPickMs: number;
    };
    state.lastActivityMs = Date.now() - (IDLE_GRACE_MS + IDLE_HALF_LIFE_MS * 8);
    state.lastFadePickMs = Date.now();
    state.lastRepopPickMs = 0;

    grid.update(400, 300);

    // Floor for 240 creatures is max(IDLE_FLOOR_MIN_COUNT=30, round(240*0.02)=5) = 30 —
    // the absolute floor now dominates the percentage for typical crowd sizes. 27 start
    // visible, deficit is 30 - 27 = 3, closeable in one tick (REPOP_COUNT=5).
    expect(creatures.filter((c) => !c.waitingRespawn).length).toBe(30);
  });

  it('reflects the grace-period + half-life wiring mid-decay, one half-life past grace', () => {
    // Exercises grid.update()'s actual call site (lastActivityMs -> idleMs ->
    // Math.max(0, idleMs - IDLE_GRACE_MS) -> decayTowardFloor), unlike the
    // "decayTowardFloor constants used by CreatureGrid" test above which calls
    // decayTowardFloor directly and never touches grid.update() at all. A
    // regression here (e.g. passing raw idleMs instead of the grace-adjusted
    // value) would slip past every other test in this file.
    const grid = new CreatureGrid(config);
    grid.spawn('cockroach'); // 240 creatures for cockroach mode's 20x12 grid
    const creatures = (grid as unknown as {
      creatures: Array<{ waitingRespawn: boolean; spawnDone: boolean }>;
    }).creatures;
    const targetCount = creatures.length;

    // At exactly one half-life past grace, decayTowardFloor returns
    // floorFraction + (1 - floorFraction) * 0.5 — roughly 51% of target.
    // With targetCount=240 that's comfortably above IDLE_FLOOR_MIN_COUNT (30),
    // so the percentage curve is the binding constraint, not the absolute floor.
    const decayFraction = decayTowardFloor(IDLE_HALF_LIFE_MS, IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
    const desiredVisibleCount = Math.round(targetCount * decayFraction);
    expect(desiredVisibleCount).toBeGreaterThan(IDLE_FLOOR_MIN_COUNT);

    // Start just under the desired count, by a deficit closeable within a
    // single un-bursted tick (REPOP_COUNT), so grid.update() can fully reach
    // (and we can assert against) the actual desired count in one call.
    const startVisible = desiredVisibleCount - REPOP_COUNT;
    for (let i = 0; i < creatures.length - startVisible; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as {
      lastActivityMs: number;
      lastFadePickMs: number;
      lastRepopPickMs: number;
    };
    state.lastActivityMs = Date.now() - (IDLE_GRACE_MS + IDLE_HALF_LIFE_MS);
    state.lastFadePickMs = Date.now(); // suppress the fade tick for this frame
    state.lastRepopPickMs = 0; // force the re-pop tick to fire

    grid.update(400, 300);

    const visibleAfter = creatures.filter((c) => !c.waitingRespawn).length;
    expect(visibleAfter).toBe(desiredVisibleCount);
    // Sanity: close to half the crowd, as expected at exactly one half-life.
    expect(visibleAfter / targetCount).toBeCloseTo(0.5, 1);
  });

  it('never desires more visible creatures than exist for a crowd smaller than the idle floor', () => {
    // QTY_MIN (10) is below IDLE_FLOOR_MIN_COUNT (30) — the raw floor formula
    // (max(IDLE_FLOOR_MIN_COUNT, round(target * fraction))) would ask for 30
    // "visible" creatures out of a pool that only has 10. desiredVisibleCount
    // must be clamped to targetCount so it never asks the repop logic to
    // revive more creatures than were ever spawned.
    const smallConfig: CreatureGridConfig = { container, mode: 'cockroach', initialQuantity: QTY_MIN };
    const grid = new CreatureGrid(smallConfig);
    grid.spawn('cockroach'); // exactly QTY_MIN (10) creatures — the whole pool
    const creatures = (grid as unknown as {
      creatures: Array<{ waitingRespawn: boolean; spawnDone: boolean }>;
    }).creatures;
    expect(creatures.length).toBe(QTY_MIN);

    for (let i = 0; i < creatures.length - 3; i++) {
      creatures[i].waitingRespawn = true;
      creatures[i].spawnDone = false;
    }
    const state = grid as unknown as {
      lastActivityMs: number;
      lastFadePickMs: number;
      lastRepopPickMs: number;
    };
    state.lastActivityMs = Date.now() - (IDLE_GRACE_MS + IDLE_HALF_LIFE_MS * 8);
    state.lastFadePickMs = Date.now();
    state.lastRepopPickMs = 0;

    grid.update(400, 300);

    // The pool never grows beyond targetCount, and the visible subset can
    // never exceed the pool it's drawn from — both would break if
    // desiredVisibleCount weren't clamped to targetCount.
    expect(grid.getCreatureCount()).toBe(QTY_MIN);
    expect(creatures.filter((c) => !c.waitingRespawn).length).toBeLessThanOrEqual(QTY_MIN);
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
