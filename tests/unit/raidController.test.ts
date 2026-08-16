// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectShake,
  RaidController,
  pickPulseKinds,
  AVATAR_REPEL_RADIUS_AFTER_WIN,
  SHAKE_PULSE_COOLDOWN_MS,
} from '../../src/creatures/RaidController';
import type { MoveSample } from '../../src/creatures/RaidController';
import { CreatureGrid } from '../../src/creatures/CreatureGrid';
import { SECURITY_SHRINK_MS } from '../../src/creatures/SecurityCreature';

vi.mock('animejs', () => {
  const makeInstance = () => ({ pause: vi.fn() });
  return {
    default: (_opts: Record<string, unknown>) => makeInstance(),
  };
});

function sample(x: number, y: number, t: number): MoveSample {
  return { x, y, t };
}

describe('detectShake', () => {
  it('returns false for fewer than 3 samples', () => {
    expect(detectShake([sample(0, 0, 0), sample(10, 0, 10)])).toBe(false);
  });

  it('returns false for a smooth fast drag in one direction (no reversals)', () => {
    const samples: MoveSample[] = [];
    for (let i = 0; i < 10; i++) {
      samples.push(sample(i * 20, 0, i * 10));
    }
    expect(detectShake(samples)).toBe(false);
  });

  it('returns false for slow back-and-forth movement (below the speed floor)', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(2, 0, 100),
      sample(0, 0, 200),
      sample(2, 0, 300),
      sample(0, 0, 400),
      sample(2, 0, 500),
    ];
    expect(detectShake(samples)).toBe(false);
  });

  it('returns true for fast rapid direction reversals within the window', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
      sample(60, 0, 100),
      sample(0, 0, 120),
    ];
    expect(detectShake(samples)).toBe(true);
  });

  it('ignores samples outside the shake window', () => {
    const old: MoveSample[] = [
      sample(0, 0, -5000),
      sample(60, 0, -4980),
      sample(0, 0, -4960),
      sample(60, 0, -4940),
      sample(0, 0, -4920),
    ];
    const recent: MoveSample[] = [sample(500, 500, 0), sample(520, 500, 50)];
    expect(detectShake([...old, ...recent])).toBe(false);
  });

  it('returns false at 2 reversals, just below the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
    ];
    expect(detectShake(samples)).toBe(false);
  });

  it('returns true at exactly 3 reversals, the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
    ];
    expect(detectShake(samples)).toBe(true);
  });

  it('returns true for reversals on one axis while the other axis advances steadily', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(20, 40, 20),
      sample(40, 0, 40),
      sample(60, 40, 60),
      sample(80, 0, 80),
      sample(100, 40, 100),
    ];
    expect(detectShake(samples)).toBe(true);
  });

  it('counts a reversal that lands on a natural deceleration dip (real hand-shake physics)', () => {
    // A real shake decelerates toward zero speed right at each turnaround —
    // the old implementation reset the pending direction on any slow
    // sample, discarding exactly the direction needed to detect the
    // reversal that follows it.
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(61, 0, 220),
      sample(0, 0, 240),
      sample(1, 0, 440),
      sample(60, 0, 460),
      sample(59, 0, 660),
      sample(0, 0, 680),
    ];
    expect(detectShake(samples)).toBe(true);
  });
});

describe('pickPulseKinds', () => {
  it('returns a single kind picked by rand() for n < 2', () => {
    expect(pickPulseKinds(1, () => 0.1)).toEqual(['police']);
    expect(pickPulseKinds(1, () => 0.9)).toEqual(['raf']);
  });

  it('guarantees at least one of each kind once n >= 2', () => {
    const kinds = pickPulseKinds(2, () => 0.5);
    expect(kinds).toHaveLength(2);
    expect(kinds).toContain('police');
    expect(kinds).toContain('raf');
  });

  it('fills slots beyond the guaranteed pair using the provided rand, keeping both kinds present', () => {
    const kinds = pickPulseKinds(3, () => 0.1);
    expect(kinds).toHaveLength(3);
    expect(kinds.filter((k) => k === 'police').length).toBeGreaterThanOrEqual(1);
    expect(kinds.filter((k) => k === 'raf').length).toBeGreaterThanOrEqual(1);
  });
});

describe('RaidController', () => {
  let container: HTMLElement;
  let grid: CreatureGrid;
  let raid: RaidController;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);

    grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 40 });
    grid.spawn('cockroach');

    raid = new RaidController({ container, grid, avatarLayer: container });
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
  });

  it('appends security units into avatarLayer, not the #stage container', () => {
    const avatarLayer = document.createElement('div');
    document.body.appendChild(avatarLayer);
    const raidWithLayer = new RaidController({ container, grid, avatarLayer });

    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);
    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raidWithLayer.onAvatarMove(x, 0);
      t += 20;
    }
    now.mockRestore();

    expect(avatarLayer.querySelectorAll('img').length).toBe(raidWithLayer.getSecurityUnits().length);
    avatarLayer.remove();
  });

  it('starts idle with no security units', () => {
    expect(raid.getState()).toBe('idle');
    expect(raid.getSecurityUnits()).toEqual([]);
  });

  it('transitions to raiding and spawns 2-3 units on a detected shake', () => {
    // Baseline includes the 40 crowd creatures already in the container
    // (CockroachCreature nests an <img>), so the security spawn is measured
    // as a delta rather than an absolute count.
    const imagesBefore = container.querySelectorAll('img').length;

    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    expect(raid.getState()).toBe('raiding');
    expect(raid.getSecurityUnits().length).toBeGreaterThanOrEqual(2);
    expect(raid.getSecurityUnits().length).toBeLessThanOrEqual(3);
    expect(container.querySelectorAll('img').length - imagesBefore).toBe(raid.getSecurityUnits().length);

    now.mockRestore();
  });

  it('never exceeds SECURITY_MAX_UNITS even with repeated shakes', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    for (let pulse = 0; pulse < 15; pulse++) {
      const xs = [0, 60, 0, 60, 0, 60, 0];
      for (const x of xs) {
        raid.onAvatarMove(x, 0);
        t += 20;
      }
      t += 600; // clear the pulse cooldown
    }

    expect(raid.getSecurityUnits().length).toBeLessThanOrEqual(24);
    now.mockRestore();
  });

  it('startRecovery marks every unit shrinking immediately but removes none synchronously', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;
    expect(spawned).toBeGreaterThan(0);

    raid.startRecovery();

    expect(raid.getState()).toBe('recovering');
    expect(raid.getSecurityUnits().length).toBe(spawned);
    expect(grid.getCreatureCount()).toBe(900); // QTY_MAX, applied immediately

    now.mockRestore();
  });

  it('tick() sweeps units out one at a time on their staggered shrink schedule, then goes idle', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;

    raid.startRecovery();

    for (let i = 0; i < spawned; i++) {
      t += SECURITY_SHRINK_MS;
      raid.tick(t);
      expect(raid.getSecurityUnits().length).toBe(spawned - (i + 1));
    }

    expect(raid.getSecurityUnits().length).toBe(0);
    expect(raid.getState()).toBe('idle');

    now.mockRestore();
  });

  it('startRecovery is a no-op when already recovering (re-entry safe)', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;

    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');

    // Second call while already recovering must not disturb the shrink schedule.
    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');
    expect(raid.getSecurityUnits().length).toBe(spawned);

    for (let i = 0; i < spawned; i++) {
      t += SECURITY_SHRINK_MS;
      raid.tick(t);
    }

    expect(raid.getSecurityUnits().length).toBe(0);
    expect(raid.getState()).toBe('idle');

    now.mockRestore();
  });

  it('destroy() mid-recovery removes all units immediately and further ticks do nothing', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;

    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');

    raid.destroy();
    expect(raid.getState()).toBe('idle');
    expect(raid.getSecurityUnits()).toEqual([]);

    t += SECURITY_SHRINK_MS * spawned;
    raid.tick(t);
    expect(raid.getState()).toBe('idle');
    expect(raid.getSecurityUnits()).toEqual([]);

    now.mockRestore();
  });

  it('getRaidFloor is QTY_MIN while idle and rises with the crowd size once raiding', () => {
    expect(raid.getRaidFloor()).toBe(10); // QTY_MIN

    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);
    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    now.mockRestore();

    // raidStartCount was 40 (initialQuantity), floor = round(40 * 0.25) = 10
    expect(raid.getRaidFloor()).toBe(10);
  });

  it('does not drain the crowd on the very first tick right after a raid starts (regression: lastAttritionAtMs must be seeded to now, not 0)', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 5000; // non-trivial start so a stale lastAttritionAtMs=0 would be caught
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    expect(raid.getState()).toBe('raiding');
    const raidStartCrowd = grid.getCreatureCount();

    // Tick almost immediately after the raid started (well under the 400ms
    // attrition interval). If lastAttritionAtMs were wrongly seeded to 0,
    // `t - 0 >= 400` would be trivially true here and drain a creature
    // instantly instead of waiting out the interval.
    t += 10;
    raid.tick(t);

    expect(grid.getCreatureCount()).toBe(raidStartCrowd);

    now.mockRestore();
  });

  it('drains the crowd toward the raid floor over time while raiding, without a charge held', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const raidStartCrowd = grid.getCreatureCount();
    const floor = raid.getRaidFloor();

    for (let i = 0; i < 50; i++) {
      t += 400; // RAID_ATTRITION_INTERVAL_MS
      raid.tick(t);
    }

    expect(grid.getCreatureCount()).toBeLessThan(raidStartCrowd);
    expect(grid.getCreatureCount()).toBeGreaterThanOrEqual(floor);

    now.mockRestore();
  });

  it('attrition stops exactly at the raid floor and never removes below it', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const floor = raid.getRaidFloor();

    for (let i = 0; i < 200; i++) {
      t += 400;
      raid.tick(t);
    }

    expect(grid.getCreatureCount()).toBe(floor);

    now.mockRestore();
  });

  it('shrinks the avatar repel radius once a full-power charge clears the raid', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    expect(grid.getAvatarRepelRadius()).toBeNull();

    raid.startCharging();
    t += 1800; // CHARGE_DURATION_MS
    raid.tick(t);
    t += SECURITY_SHRINK_MS;
    raid.tick(t);

    expect(raid.getState()).toBe('idle');
    expect(grid.getAvatarRepelRadius()).toBe(AVATAR_REPEL_RADIUS_AFTER_WIN);

    now.mockRestore();
  });

  it('restores the default avatar repel radius once a new raid starts', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    raid.startCharging();
    t += 1800;
    raid.tick(t);
    t += SECURITY_SHRINK_MS;
    raid.tick(t);
    expect(grid.getAvatarRepelRadius()).toBe(AVATAR_REPEL_RADIUS_AFTER_WIN);

    // A fresh shake starts a new raid.
    t += SHAKE_PULSE_COOLDOWN_MS;
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    expect(raid.getState()).toBe('raiding');
    expect(grid.getAvatarRepelRadius()).toBeNull();

    now.mockRestore();
  });

  it('does not shrink the avatar repel radius via the legacy instant startRecovery() path', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    raid.startRecovery();
    const spawned = raid.getSecurityUnits().length;
    for (let i = 0; i < spawned; i++) {
      t += SECURITY_SHRINK_MS;
      raid.tick(t);
    }

    expect(raid.getState()).toBe('idle');
    expect(grid.getAvatarRepelRadius()).toBeNull();

    now.mockRestore();
  });

  describe('charge/release protest mechanic', () => {
    function triggerRaid(now: { mockImplementation: (fn: () => number) => void }, tRef: { t: number }): void {
      now.mockImplementation(() => tRef.t);
      const xs = [0, 60, 0, 60, 0, 60, 0];
      for (const x of xs) {
        raid.onAvatarMove(x, 0);
        tRef.t += 20;
      }
    }

    it('startCharging is a no-op while idle (nothing to recover)', () => {
      raid.startCharging();
      expect(raid.getState()).toBe('idle');
      expect(raid.getChargeFraction()).toBe(0);
    });

    it('charges progressively while held, rebuilding the crowd, and completes at full charge', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const raidStartCrowd = grid.getCreatureCount();

      raid.startCharging();
      expect(raid.getState()).toBe('charging');
      expect(raid.getChargeFraction()).toBe(0);

      tRef.t += 900; // half of CHARGE_DURATION_MS (1800)
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeCloseTo(0.5, 1);
      expect(grid.getCreatureCount()).toBeGreaterThan(raidStartCrowd);
      expect(grid.getCreatureCount()).toBeLessThan(900);

      tRef.t += 900; // reach full charge
      raid.tick(tRef.t);
      tRef.t += SECURITY_SHRINK_MS; // let any just-marked units finish shrinking
      raid.tick(tRef.t);

      expect(raid.getChargeFraction()).toBe(1);
      expect(raid.getState()).toBe('idle');
      expect(raid.getSecurityUnits().length).toBe(0);
      expect(grid.getCreatureCount()).toBe(900);

      now.mockRestore();
    });

    it('throttles the crowd-rebuild setQuantity calls during charge instead of calling every frame', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);

      const setQuantitySpy = vi.spyOn(grid, 'setQuantity');
      raid.startCharging();
      setQuantitySpy.mockClear();

      // Simulate 10 frames within a single throttle window (well under
      // CHARGE_QUANTITY_THROTTLE_MS apart) — only the first should call
      // through to setQuantity.
      for (let i = 0; i < 10; i++) {
        tRef.t += 5;
        raid.tick(tRef.t);
      }

      expect(setQuantitySpy).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('releaseCharge before full charge reverts crowd/security to the pre-charge baseline', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;
      const raidStartCrowd = grid.getCreatureCount();

      raid.startCharging();
      tRef.t += 900;
      raid.tick(tRef.t);
      expect(grid.getCreatureCount()).toBeGreaterThan(raidStartCrowd);

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getChargeFraction()).toBe(0);
      expect(raid.getSecurityUnits().length).toBe(spawned);
      expect(grid.getCreatureCount()).toBe(raidStartCrowd);

      now.mockRestore();
    });

    it('releaseCharge respawns units that had already fully shrunk away before release', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.startCharging();
      tRef.t += 900;
      raid.tick(tRef.t); // marks some units shrinking
      tRef.t += SECURITY_SHRINK_MS;
      raid.tick(tRef.t); // sweeps them away for real

      expect(raid.getSecurityUnits().length).toBeLessThan(spawned);

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getSecurityUnits().length).toBe(spawned);

      now.mockRestore();
    });

    it('releaseCharge is a no-op when not charging', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getSecurityUnits().length).toBe(spawned);

      now.mockRestore();
    });
  });
});
