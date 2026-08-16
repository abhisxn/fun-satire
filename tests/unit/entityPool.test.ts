import { describe, it, expect, vi } from 'vitest';
import { EntityPool } from '../../src/creatures/EntityPool';

describe('EntityPool', () => {
  it('add() registers refs as immediately active', () => {
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    pool.add([{ id: 1 }, { id: 2 }]);
    expect(pool.activeCount).toBe(2);
    expect(pool.allRefs).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('despawn() removes refs only after despawnMs elapses, firing onDespawn once per ref', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const despawned: number[] = [];
    const pool = new EntityPool<{ id: number }>({ onDespawn: (ref) => despawned.push(ref.id) });
    const refs = [{ id: 1 }, { id: 2 }];
    pool.add(refs);

    pool.despawn(refs, 100);
    pool.tick(50);
    expect(despawned).toEqual([]);
    expect(pool.activeCount).toBe(0); // no longer 'active' (now 'despawning')
    expect(pool.allRefs.length).toBe(2); // still tracked until removal

    pool.tick(100);
    expect(despawned.sort()).toEqual([1, 2]);
    expect(pool.allRefs.length).toBe(0);
  });

  it('despawn() staggers removal by staggerMs per ref', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const despawned: number[] = [];
    const pool = new EntityPool<{ id: number }>({ onDespawn: (ref) => despawned.push(ref.id) });
    const refs = [{ id: 1 }, { id: 2 }];
    pool.add(refs);

    pool.despawn(refs, 100, { staggerMs: 50 });
    pool.tick(100); // first ref's window (0*50+100=100) elapsed, second's (1*50+100=150) not yet
    expect(despawned).toEqual([1]);
    pool.tick(150);
    expect(despawned).toEqual([1, 2]);
  });

  it('despawn() fires onSettled exactly once, after every ref in the batch is removed', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const refs = [{ id: 1 }, { id: 2 }];
    pool.add(refs);
    const onSettled = vi.fn();

    pool.despawn(refs, 100, { staggerMs: 50, onSettled });
    pool.tick(100);
    expect(onSettled).not.toHaveBeenCalled();
    pool.tick(150);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('despawn() never fires onSettled for an empty refs list', () => {
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const onSettled = vi.fn();
    pool.despawn([], 100, { onSettled });
    pool.tick(1000);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('spawnScheduled() creates refs via factory only once fireAtMs has elapsed, respecting delayMs/staggerMs', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1000);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    let nextId = 1;

    pool.spawnScheduled({ count: 2, factory: () => ({ id: nextId++ }), delayMs: 500, staggerMs: 200 });
    pool.tick(1400); // before first fireAtMs (1000+500=1500)
    expect(pool.activeCount).toBe(0);

    pool.tick(1500); // first fires
    expect(pool.activeCount).toBe(1);

    pool.tick(1700); // second fires (1000+500+200=1700)
    expect(pool.activeCount).toBe(2);
  });

  it('spawnScheduled() returns spawned refs from tick() and fires onSettled once the whole batch has fired', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const onSettled = vi.fn();
    let nextId = 1;

    pool.spawnScheduled({ count: 2, factory: () => ({ id: nextId++ }), staggerMs: 100, onSettled });
    const result1 = pool.tick(0);
    expect(result1.spawned).toEqual([{ id: 1 }]);
    expect(onSettled).not.toHaveBeenCalled();

    const result2 = pool.tick(100);
    expect(result2.spawned).toEqual([{ id: 2 }]);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('cancelScheduledSpawns() drops any pending spawns and their onSettled', () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(0);
    const pool = new EntityPool<{ id: number }>({ onDespawn: () => {} });
    const onSettled = vi.fn();
    pool.spawnScheduled({ count: 3, factory: () => ({ id: 1 }), delayMs: 1000, onSettled });

    pool.cancelScheduledSpawns();
    pool.tick(5000);
    expect(pool.activeCount).toBe(0);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('removeAll() clears every tracked ref without firing onDespawn', () => {
    const despawned: number[] = [];
    const pool = new EntityPool<{ id: number }>({ onDespawn: (ref) => despawned.push(ref.id) });
    pool.add([{ id: 1 }, { id: 2 }]);
    pool.removeAll();
    expect(pool.allRefs.length).toBe(0);
    expect(despawned).toEqual([]);
  });
});
