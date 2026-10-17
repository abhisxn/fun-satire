// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RaidController,
  SECURITY_REPEL_RADIUS,
  RAID_ATTRITION_INTERVAL_MS,
  CHARGE_SWEEP_HALF_PERIOD_MS,
} from '../../src/creatures/RaidController';
import { CreatureGrid } from '../../src/creatures/CreatureGrid';
import { SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH } from '../../src/creatures/SecurityCreature';
import { FORCE_BREAK_UNITY, WIN_UNITY } from '../../src/creatures/unity';
import type { UnityResult } from '../../src/creatures/unity';

vi.mock('animejs', () => ({
  default: () => ({ pause: vi.fn() }),
}));

function unityOf(unity: number): UnityResult {
  return { unity, size: unity, cluster: unity, variety: 0, centroid: { x: 400, y: 300 }, spread: 100 };
}

describe('RaidController unity', () => {
  let container: HTMLElement;
  let grid: CreatureGrid;
  let target: { value: number };
  let now: ReturnType<typeof vi.spyOn>;
  let t: number;

  function makeRaid(extra: Partial<ConstructorParameters<typeof RaidController>[0]> = {}): RaidController {
    return new RaidController({
      container,
      grid,
      avatarLayer: container,
      unitySource: () => unityOf(target.value),
      ...extra,
    });
  }

  function settle(r: RaidController, ms = 4000): void {
    for (let i = 0; i < ms / 100; i++) {
      t += 100;
      r.tick(t);
    }
  }

  function startRaid(r: RaidController): void {
    for (const x of [0, 60, 0, 60, 0, 60, 0]) {
      r.onAvatarMove(x, 0);
      t += 20;
    }
  }

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);
    grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 40 });
    grid.spawn('cockroach');
    target = { value: 0 };
    t = 1_000_000;
    now = vi.spyOn(Date, 'now');
    now.mockImplementation(() => t);
  });

  afterEach(() => {
    now.mockRestore();
    container.remove();
  });

  it('starts at zero, snaps to the source on the first tick, then smooths toward later changes', () => {
    const r = makeRaid();
    expect(r.getUnity()).toBe(0);

    target.value = 0.6;
    t += 100;
    r.tick(t);
    expect(r.getUnity()).toBeCloseTo(0.6);

    target.value = 1;
    t += 100;
    r.tick(t);
    const first = r.getUnity();
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);

    settle(r);
    expect(r.getUnity()).toBeGreaterThan(0.99);
  });

  it('exposes the latest unity result for the visual layer', () => {
    const r = makeRaid();
    t += 100;
    r.tick(t);
    expect(r.getUnityResult()?.centroid).toEqual({ x: 400, y: 300 });
  });

  it('scales security repel radius down as unity rises, to zero once force is broken', () => {
    const r = makeRaid();
    t += 100;
    r.tick(t);
    startRaid(r);
    r.setAvatarWidth(SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH);
    t += 100;
    r.tick(t);
    const full = r.getSecurityUnits()[0]!.repelRadius;
    expect(full).toBeCloseTo(SECURITY_REPEL_RADIUS, 0);

    target.value = 0.45;
    settle(r);
    const mid = r.getSecurityUnits()[0]!.repelRadius;
    expect(mid).toBeLessThan(full);
    expect(mid).toBeGreaterThan(0);

    target.value = 1;
    settle(r);
    expect(r.getSecurityUnits()[0]!.repelRadius).toBeLessThan(1);
  });

  it('stops raid attrition once force is broken, but still drains a scattered crowd', () => {
    const scattered = makeRaid();
    startRaid(scattered);
    const startCount = grid.getCreatureCount();
    for (let i = 0; i < 20; i++) {
      t += RAID_ATTRITION_INTERVAL_MS;
      scattered.tick(t);
    }
    const drained = grid.getCreatureCount();
    expect(drained).toBeLessThan(startCount);
    scattered.destroy();

    grid.setQuantity(40);
    target.value = 1;
    const united = makeRaid();
    settle(united, 3000);
    startRaid(united);
    const unitedStart = grid.getCreatureCount();
    for (let i = 0; i < 20; i++) {
      t += RAID_ATTRITION_INTERVAL_MS;
      united.tick(t);
    }
    expect(grid.getCreatureCount()).toBe(unitedStart);
  });

  it('fires onForceBreak once on breaking and once on recovering, with hysteresis', () => {
    const onForceBreak = vi.fn();
    const r = makeRaid({ onForceBreak });

    target.value = 1;
    settle(r);
    expect(onForceBreak).toHaveBeenCalledTimes(1);
    expect(onForceBreak).toHaveBeenLastCalledWith(true);
    expect(r.isForceBroken()).toBe(true);

    target.value = FORCE_BREAK_UNITY - 0.02;
    settle(r);
    expect(onForceBreak).toHaveBeenCalledTimes(1);

    target.value = 0.3;
    settle(r);
    expect(onForceBreak).toHaveBeenCalledTimes(2);
    expect(onForceBreak).toHaveBeenLastCalledWith(false);
    expect(r.isForceBroken()).toBe(false);
  });

  it('turns security units pale while force is broken and restores them when it recovers', () => {
    const r = makeRaid();
    t += 100;
    r.tick(t);
    startRaid(r);
    const units = () => container.querySelectorAll('.security-unit');
    expect(units().length).toBeGreaterThan(0);

    target.value = 1;
    settle(r);
    for (const el of Array.from(units())) expect(el.classList.contains('security-unit--faded')).toBe(true);

    target.value = 0;
    settle(r);
    for (const el of Array.from(units())) expect(el.classList.contains('security-unit--faded')).toBe(false);
  });

  describe('Protest win gate', () => {
    function holdToPeakAndRelease(r: RaidController): void {
      r.startCharging();
      t += CHARGE_SWEEP_HALF_PERIOD_MS;
      r.tick(t);
      r.releaseCharge();
    }

    it('a perfectly timed release with high unity wins and reports "now"', () => {
      const onProtestWin = vi.fn();
      const onReleaseVerdict = vi.fn();
      const r = makeRaid({ onProtestWin, onReleaseVerdict });
      target.value = 1;
      settle(r);

      holdToPeakAndRelease(r);

      expect(onProtestWin).toHaveBeenCalledTimes(1);
      expect(onReleaseVerdict).toHaveBeenCalledWith('now');
    });

    it('a perfectly timed release with low unity does not win, reports "early", and backfires', () => {
      const onProtestWin = vi.fn();
      const onReleaseVerdict = vi.fn();
      const r = makeRaid({ onProtestWin, onReleaseVerdict });
      target.value = WIN_UNITY - 0.3;
      settle(r);

      holdToPeakAndRelease(r);

      expect(onProtestWin).not.toHaveBeenCalled();
      expect(onReleaseVerdict).toHaveBeenCalledWith('early');
      expect(r.getState()).toBe('raiding');
      expect(r.getSecurityUnits().length).toBeGreaterThan(0);
    });

    it('a badly timed release with high unity does not win and reports "close"', () => {
      const onProtestWin = vi.fn();
      const onReleaseVerdict = vi.fn();
      const r = makeRaid({ onProtestWin, onReleaseVerdict });
      target.value = 1;
      settle(r);

      r.startCharging();
      t += CHARGE_SWEEP_HALF_PERIOD_MS * 0.5;
      r.tick(t);
      r.releaseCharge();

      expect(onProtestWin).not.toHaveBeenCalled();
      expect(onReleaseVerdict).toHaveBeenCalledWith('close');
    });
  });
});
