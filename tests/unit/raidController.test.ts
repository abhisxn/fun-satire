// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectShake, RaidController, pickPulseKinds } from '../../src/creatures/RaidController';
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

    raid = new RaidController({ container, grid });
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
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
});
