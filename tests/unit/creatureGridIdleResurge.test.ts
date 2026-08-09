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
