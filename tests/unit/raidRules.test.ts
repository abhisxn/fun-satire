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
