// @vitest-environment happy-dom
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
  REPOP_COUNT,
} from '../../src/creatures/CreatureGrid';
import type { CreatureGridConfig } from '../../src/creatures/CreatureGrid';

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
