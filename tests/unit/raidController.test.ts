import { describe, it, expect } from 'vitest';
import { detectShake } from '../../src/creatures/RaidController';
import type { MoveSample } from '../../src/creatures/RaidController';

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

  it('returns false at 3 reversals, just below the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
    ];
    expect(detectShake(samples)).toBe(false);
  });

  it('returns true at exactly 4 reversals, the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
      sample(60, 0, 100),
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
