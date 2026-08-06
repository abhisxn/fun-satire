import { describe, it, expect } from 'vitest';
import { computeSpawnProgress, SPAWN_POP_MS } from '../../src/creatures/CreatureGrid';

describe('computeSpawnProgress', () => {
  it('returns scale 0, opacity 0, done false strictly before pop time', () => {
    const result = computeSpawnProgress(1000, 500);
    expect(result).toEqual({ scale: 0, opacity: 0, done: false });
  });

  it('treats t=0 (now equals pop time) as not yet appeared', () => {
    const result = computeSpawnProgress(1000, 1000);
    expect(result).toEqual({ scale: 0, opacity: 0, done: false });
  });

  it('returns scale 1, opacity 1, done true once the pop duration has elapsed', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS);
    expect(result.scale).toBe(1);
    expect(result.opacity).toBe(1);
    expect(result.done).toBe(true);
  });

  it('returns scale 1, opacity 1, done true well after the pop duration', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS * 5);
    expect(result.scale).toBe(1);
    expect(result.opacity).toBe(1);
    expect(result.done).toBe(true);
  });

  it('returns an in-between, not-yet-done state mid-animation', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS / 2);
    expect(result.done).toBe(false);
    expect(result.opacity).toBeGreaterThan(0);
    expect(result.opacity).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.scale)).toBe(true);
  });

  it('opacity reaches 1 before scale settles (fades in faster than the overshoot settles)', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS * 0.7);
    expect(result.opacity).toBe(1);
  });
});
