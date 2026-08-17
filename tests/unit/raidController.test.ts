// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectShake,
  RaidController,
  pickPulseKinds,
  AVATAR_REPEL_RADIUS_AFTER_WIN,
  SHAKE_PULSE_COOLDOWN_MS,
  CHARGE_SWEEP_HALF_PERIOD_MS,
  FULL_POWER_THRESHOLD,
  MEDIUM_POWER_THRESHOLD,
  SECURITY_MAX_UNITS,
  BACKFIRE_RESPAWN_DELAY_MS,
  BACKFIRE_RESPAWN_STAGGER_MS,
} from '../../src/creatures/RaidController';
import type { MoveSample } from '../../src/creatures/RaidController';
import { CreatureGrid } from '../../src/creatures/CreatureGrid';
import { SECURITY_SHRINK_MS, SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH } from '../../src/creatures/SecurityCreature';

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

    expect(raid.getSecurityUnits().length).toBeLessThanOrEqual(SECURITY_MAX_UNITS);
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

  it('shrinks the avatar repel radius once a peak-power release fully clears the raid', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    expect(grid.getAvatarRepelRadius()).toBeNull();

    const spawned = raid.getSecurityUnits().length;
    raid.startCharging();
    t += CHARGE_SWEEP_HALF_PERIOD_MS; // land at the peak of the sweep (fraction ~1)
    raid.tick(t);
    raid.releaseCharge();
    t += SECURITY_SHRINK_MS * spawned;
    raid.tick(t);

    expect(raid.getState()).toBe('idle');
    expect(grid.getAvatarRepelRadius()).toBe(AVATAR_REPEL_RADIUS_AFTER_WIN);

    now.mockRestore();
  });

  // The post-win repel radius is deliberately NOT scaled here — RaidController sets
  // a plain, unscaled AVATAR_REPEL_RADIUS_AFTER_WIN baseline; main.ts's onProtestWin
  // wiring rescales it afterward from the sticker's live post-lockSqueeze width
  // (untestable at this unit level, same as onSecurityRemoved's audio wiring).
  it('sets the plain, unscaled AVATAR_REPEL_RADIUS_AFTER_WIN baseline regardless of avatarWidth', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    raid.setAvatarWidth(SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH * 2);
    raid.startCharging();
    t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak
    raid.tick(t);
    raid.releaseCharge();

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
    const spawned = raid.getSecurityUnits().length;
    raid.startCharging();
    t += CHARGE_SWEEP_HALF_PERIOD_MS;
    raid.tick(t);
    raid.releaseCharge();
    t += SECURITY_SHRINK_MS * spawned;
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

    it('startCharging works while idle too — Protest is standalone, not gated behind a raid', () => {
      raid.startCharging();
      expect(raid.getState()).toBe('charging');
    });

    it('releasing a standalone (no-raid) charge below full power backfires: spawns a fresh raid instead of a no-op', () => {
      const now = vi.spyOn(Date, 'now');
      let t = 0;
      now.mockImplementation(() => t);

      expect(raid.getState()).toBe('idle');
      expect(raid.getSecurityUnits()).toEqual([]);

      raid.startCharging();
      expect(raid.getState()).toBe('charging');

      // Release almost immediately — barely any hold, low fraction — this backfires:
      // it spawns a raid exactly as a shake would, even though nothing was shaken.
      t += 10;
      raid.tick(t);
      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getSecurityUnits().length).toBeGreaterThan(0);
      expect(grid.getAvatarRepelRadius()).toBeNull();

      now.mockRestore();
    });

    it('releasing a standalone charge at the peak of the sweep maxes out the crowd', () => {
      const now = vi.spyOn(Date, 'now');
      let t = 0;
      now.mockImplementation(() => t);

      raid.startCharging();
      t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak of the sweep, fraction ~1
      raid.tick(t);
      raid.releaseCharge();

      expect(raid.getState()).toBe('idle');
      expect(grid.getCreatureCount()).toBe(900); // QTY_MAX
      expect(grid.getAvatarRepelRadius()).toBe(AVATAR_REPEL_RADIUS_AFTER_WIN);

      now.mockRestore();
    });

    it('startCharging is a no-op while recovering', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      raid.startRecovery();
      expect(raid.getState()).toBe('recovering');

      raid.startCharging();
      expect(raid.getState()).toBe('recovering');

      now.mockRestore();
    });

    it('sweeps chargeFraction back and forth across [0, 1] while held, rather than filling once', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);

      raid.startCharging();
      expect(raid.getState()).toBe('charging');
      expect(raid.getChargeFraction()).toBe(0);

      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // one full one-way sweep: 0 -> 1
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeCloseTo(1, 5);

      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // sweeps back: 1 -> 0
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeCloseTo(0, 5);

      tRef.t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS / 2); // halfway through the next sweep up
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeCloseTo(0.5, 1);

      now.mockRestore();
    });

    it('does not touch security or the crowd just from sweeping near the peak while still held', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;
      const raidStartCrowd = grid.getCreatureCount();

      raid.startCharging();
      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // near the peak
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeGreaterThan(0.9);
      expect(raid.getState()).toBe('charging');
      expect(raid.getSecurityUnits().length).toBe(spawned);
      expect(grid.getCreatureCount()).toBe(raidStartCrowd);

      now.mockRestore();
    });

    it('releaseCharge at peak power clears the whole raid (recovering, then idle once units sweep out)', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.startCharging();
      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS;
      raid.tick(tRef.t);

      raid.releaseCharge();
      expect(raid.getState()).toBe('recovering');
      expect(raid.getChargeFraction()).toBe(0);
      expect(grid.getCreatureCount()).toBe(900); // QTY_MAX, applied immediately on the win

      tRef.t += SECURITY_SHRINK_MS * spawned;
      raid.tick(tRef.t);

      expect(raid.getState()).toBe('idle');
      expect(raid.getSecurityUnits().length).toBe(0);

      now.mockRestore();
    });

    it('releaseCharge at a low fraction reinforces the existing raid instead of clearing it', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.startCharging();
      tRef.t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS * 0.05); // barely off the floor
      raid.tick(tRef.t);
      const fraction = raid.getChargeFraction();
      expect(fraction).toBeLessThan(FULL_POWER_THRESHOLD);

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getChargeFraction()).toBe(0);
      // Backfire adds another pulse (or is a no-op if already at the cap) — it
      // never removes units the way a winning release does.
      expect(raid.getSecurityUnits().length).toBeGreaterThanOrEqual(spawned);

      now.mockRestore();
    });

    it('releaseCharge at a mid (MEDIUM) fraction on an active raid: crowd gets the capped boost, some units poof, reinforcements trickle back in', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;
      const raidStartCrowd = grid.getCreatureCount();

      raid.startCharging();
      tRef.t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS * 0.5); // fraction ~0.5, MEDIUM band
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeGreaterThanOrEqual(MEDIUM_POWER_THRESHOLD);
      expect(raid.getChargeFraction()).toBeLessThan(FULL_POWER_THRESHOLD);

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      const boosted = Math.min(Math.round((raidStartCrowd * 1.75) / 10) * 10, 400);
      expect(grid.getCreatureCount()).toBe(boosted);
      // Nothing's actually been removed yet — the poof hasn't finished its shrink window.
      expect(raid.getSecurityUnits().length).toBe(spawned);

      // Once the poof clears and the respawn delay elapses, reinforcements trickle
      // back in — never more than were poofed, never as an instant burst.
      tRef.t += SECURITY_SHRINK_MS + BACKFIRE_RESPAWN_DELAY_MS + BACKFIRE_RESPAWN_STAGGER_MS * spawned;
      raid.tick(tRef.t);
      expect(raid.getSecurityUnits().length).toBeGreaterThan(0);

      now.mockRestore();
    });

    it('repeated LOW releases on the same raid escalate it (never treated as a fresh restart), even when units.length transiently hits 0 mid-regroup', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      // Fire three LOW-power releases back to back, each one landing after the
      // previous poof has fully cleared (SECURITY_SHRINK_MS) — this is exactly the
      // sequence that can drive units.length down to 0 while the raid is still
      // conceptually in progress (respawns are still queued, just not arrived yet).
      // chargeStartedDuringRaid (not units.length) must be what gates the branch, or
      // this would wrongly re-trigger a fresh idle->raiding spawnPulse() each time.
      for (let i = 0; i < 3; i++) {
        raid.startCharging();
        tRef.t += 10; // LOW power
        raid.tick(tRef.t);
        raid.releaseCharge();
        expect(raid.getState()).toBe('raiding');
        tRef.t += SECURITY_SHRINK_MS;
        raid.tick(tRef.t);
        tRef.t += SHAKE_PULSE_COOLDOWN_MS;
      }

      // Let every queued respawn from all three releases resolve.
      tRef.t += BACKFIRE_RESPAWN_DELAY_MS + BACKFIRE_RESPAWN_STAGGER_MS * (spawned + 3) * 3;
      raid.tick(tRef.t);

      // Each backfire escalates the raid (poofCount + BACKFIRE_ESCALATE_LOW respawned,
      // not a 1:1 replace) — three releases should leave strictly more units standing
      // than the raid started with, bounded by SECURITY_MAX_UNITS.
      expect(raid.getSecurityUnits().length).toBeGreaterThan(spawned);
      expect(raid.getSecurityUnits().length).toBeLessThanOrEqual(SECURITY_MAX_UNITS);

      now.mockRestore();
    });

    it('releasing at LOW power with no prior raid seeds raidStartCount/attrition from the boosted crowd', () => {
      const now = vi.spyOn(Date, 'now');
      let t = 0;
      now.mockImplementation(() => t);

      const baseline = grid.getCreatureCount();
      raid.startCharging();
      t += 10; // fraction ~0.009 — well under MEDIUM_POWER_THRESHOLD
      raid.tick(t);
      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      const boosted = Math.min(Math.round((baseline * 1.3) / 10) * 10, 280);
      expect(grid.getCreatureCount()).toBe(boosted);
      expect(raid.getRaidFloor()).toBe(Math.max(10, Math.round(boosted * 0.25)));

      now.mockRestore();
    });

    it('MEDIUM and LOW crowd boosts hit their absolute caps (400 / 280) regardless of a large baseline', () => {
      const now = vi.spyOn(Date, 'now');
      let t = 0;
      now.mockImplementation(() => t);

      grid.setQuantity(1000); // large baseline — the % boost alone would blow past both caps

      raid.startCharging();
      t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS * 0.5); // MEDIUM band
      raid.tick(t);
      raid.releaseCharge();
      expect(grid.getCreatureCount()).toBe(400);

      t += SHAKE_PULSE_COOLDOWN_MS;
      raid.startCharging();
      t += 10; // LOW band
      raid.tick(t);
      raid.releaseCharge();
      expect(grid.getCreatureCount()).toBe(280);

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

  describe('onProtestWin / onCrowdSizeChanged / onRaidStart timing', () => {
    function triggerRaidOn(
      r: RaidController,
      now: { mockImplementation: (fn: () => number) => void },
      tRef: { t: number },
    ): void {
      now.mockImplementation(() => tRef.t);
      const xs = [0, 60, 0, 60, 0, 60, 0];
      for (const x of xs) {
        r.onAvatarMove(x, 0);
        tRef.t += 20;
      }
    }

    it('onProtestWin fires immediately for a standalone win (nothing to despawn)', () => {
      const onProtestWin = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onProtestWin });

      const now = vi.spyOn(Date, 'now');
      let t = 0;
      now.mockImplementation(() => t);

      r.startCharging();
      t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak
      r.tick(t);
      r.releaseCharge();

      expect(onProtestWin).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('onProtestWin does NOT fire at releaseCharge() for a raid win — only once the despawn sweep finishes', () => {
      const onProtestWin = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onProtestWin });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      const spawned = r.getSecurityUnits().length;

      r.startCharging();
      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak
      r.tick(tRef.t);
      r.releaseCharge();

      expect(onProtestWin).not.toHaveBeenCalled();

      tRef.t += SECURITY_SHRINK_MS * spawned;
      r.tick(tRef.t);

      expect(onProtestWin).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('onRaidStart fires exactly once at the idle->raiding transition, not on later pulses within the same raid', () => {
      const onRaidStart = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onRaidStart });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      expect(onRaidStart).toHaveBeenCalledTimes(1);

      // A second shake mid-raid spawns more units but must not re-fire onRaidStart.
      tRef.t += SHAKE_PULSE_COOLDOWN_MS;
      triggerRaidOn(r, now, tRef);
      expect(onRaidStart).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('onCrowdSizeChanged fires exactly once when a raid spawns, and not again on ticks where nothing changed', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);

      expect(onCrowdSizeChanged).toHaveBeenCalledTimes(1);
      // tierBump is 0 here: a shake-triggered spawn has no backfire behind it.
      expect(onCrowdSizeChanged).toHaveBeenCalledWith(r.getSecurityUnits().length, 0);

      // Ticking forward with nothing pending (no respawns, no shrink sweep) must
      // not re-fire — the count genuinely hasn't changed.
      tRef.t += 50;
      r.tick(tRef.t);
      expect(onCrowdSizeChanged).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('onCrowdSizeChanged fires again as a backfire\'s staggered respawns trickle in, once per arrival', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      const afterSpawnCalls = onCrowdSizeChanged.mock.calls.length;

      r.startCharging();
      tRef.t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS * 0.5); // MEDIUM power
      r.tick(tRef.t);
      r.releaseCharge();

      // The poof itself doesn't remove anything from `units` synchronously (units
      // only leave once their staggered shrink window elapses in tick()), so no
      // new call yet from the release itself.
      expect(onCrowdSizeChanged.mock.calls.length).toBe(afterSpawnCalls);

      // Advance past the poof's shrink window, the respawn delay, and every
      // staggered respawn slot — each arrival should have produced its own call.
      tRef.t += SECURITY_SHRINK_MS + BACKFIRE_RESPAWN_DELAY_MS + BACKFIRE_RESPAWN_STAGGER_MS * 10;
      r.tick(tRef.t);

      expect(onCrowdSizeChanged.mock.calls.length).toBeGreaterThan(afterSpawnCalls);
      // tierBump is 1: the backfire that triggered these respawns was MEDIUM-power.
      expect(onCrowdSizeChanged).toHaveBeenLastCalledWith(r.getSecurityUnits().length, 1);

      now.mockRestore();
    });

    it('onCrowdSizeChanged fires as a win\'s despawn sweep removes units one at a time, down to 0', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      const spawned = r.getSecurityUnits().length;

      r.startCharging();
      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak
      r.tick(tRef.t);
      r.releaseCharge();

      const seenCounts: number[] = [];
      onCrowdSizeChanged.mockImplementation((count: number) => seenCounts.push(count));

      for (let i = 0; i < spawned; i++) {
        tRef.t += SECURITY_SHRINK_MS;
        r.tick(tRef.t);
      }

      expect(seenCounts.length).toBe(spawned);
      expect(seenCounts[seenCounts.length - 1]).toBe(0);
      // Strictly decreasing, one unit at a time.
      for (let i = 1; i < seenCounts.length; i++) {
        expect(seenCounts[i]).toBe(seenCounts[i - 1] - 1);
      }

      now.mockRestore();
    });

    it('onCrowdSizeChanged reports tierBump 0 for a LOW-power backfire (vs. 1 for MEDIUM)', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);

      r.startCharging();
      tRef.t += 10; // LOW power — barely off the floor
      r.tick(tRef.t);
      r.releaseCharge();

      tRef.t += SECURITY_SHRINK_MS + BACKFIRE_RESPAWN_DELAY_MS + BACKFIRE_RESPAWN_STAGGER_MS * 10;
      r.tick(tRef.t);

      expect(onCrowdSizeChanged).toHaveBeenLastCalledWith(r.getSecurityUnits().length, 0);

      now.mockRestore();
    });

    it('resets tierBump to 0 once a brand new raid starts, even if the previous raid ended on a MEDIUM backfire', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);

      // A MEDIUM backfire on the first raid — tierBump should read 1 afterward.
      r.startCharging();
      tRef.t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS * 0.5); // MEDIUM power
      r.tick(tRef.t);
      r.releaseCharge();
      tRef.t += SECURITY_SHRINK_MS + BACKFIRE_RESPAWN_DELAY_MS + BACKFIRE_RESPAWN_STAGGER_MS * 10;
      r.tick(tRef.t);
      expect(onCrowdSizeChanged).toHaveBeenLastCalledWith(r.getSecurityUnits().length, 1);

      // Clear the raid with a full-power win, then start a genuinely new one via a
      // fresh shake — the new raid's own spawn must report tierBump 0, not carry the
      // prior raid's MEDIUM bump forward.
      const spawned = r.getSecurityUnits().length;
      tRef.t += SHAKE_PULSE_COOLDOWN_MS;
      r.startCharging();
      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak
      r.tick(tRef.t);
      r.releaseCharge();
      tRef.t += SECURITY_SHRINK_MS * spawned;
      r.tick(tRef.t);
      expect(r.getState()).toBe('idle');

      tRef.t += SHAKE_PULSE_COOLDOWN_MS;
      onCrowdSizeChanged.mockClear();
      triggerRaidOn(r, now, tRef);
      expect(onCrowdSizeChanged).toHaveBeenLastCalledWith(r.getSecurityUnits().length, 0);

      now.mockRestore();
    });
  });

  it('escorts security units toward the avatar\'s current position over successive ticks', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    // Force every unit past its entrance burst so applyEscortStep takes effect
    // (anime.js is mocked in this suite, so the real tween never fires).
    const units = (raid as unknown as { units: { phase: string; x: number; y: number }[] }).units;
    for (const unit of units) unit.phase = 'escorting';
    const startX = units[0]!.x;

    raid.onAvatarMove(1000, 0);
    for (let i = 0; i < 20; i++) {
      t += 16;
      raid.tick(t);
    }

    expect(units[0]!.x).toBeGreaterThan(startX);

    now.mockRestore();
  });

  it('keeps escorting security units apart from each other (no overlap)', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    const units = (raid as unknown as { units: { phase: string; x: number; y: number }[] }).units;
    // Force them all onto the exact same point, past their entrance burst —
    // an adversarial worst case for the collision pass.
    for (const unit of units) {
      unit.phase = 'escorting';
      unit.x = 500;
      unit.y = 500;
    }

    for (let i = 0; i < 30; i++) {
      t += 16;
      raid.tick(t);
    }

    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const dist = Math.hypot(units[j]!.x - units[i]!.x, units[j]!.y - units[i]!.y);
        expect(dist).toBeGreaterThan(0);
      }
    }

    now.mockRestore();
  });
});
