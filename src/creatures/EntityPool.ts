export type PoolPhase = "active" | "despawning";

interface PoolEntry<T> {
  ref: T;
  phase: PoolPhase;
  removeAtMs: number;
}

interface ScheduledSpawn<T> {
  fireAtMs: number;
  factory: () => T;
}

interface BatchTracker {
  remaining: number;
  onSettled?: () => void;
}

export interface DespawnOptions {
  /** ms between each ref's own removal window starting — 0 (default) removes every ref in
   * this call after the same despawnMs delay. */
  staggerMs?: number;
  /** Fires exactly once, the tick every ref in this call has actually been removed. Never
   * fires for an empty refs list. */
  onSettled?: () => void;
}

export interface SpawnScheduleOptions<T> {
  count: number;
  /** Creates one new ref per call — invoked once per scheduled spawn, in no particular
   * relative order; close over any per-call state (e.g. a running index) the caller needs. */
  factory: () => T;
  /** ms between each spawn's own fire time — 0 (default) fires every spawn in this call at
   * the same time. */
  staggerMs?: number;
  /** ms from now before the first spawn in this call fires — 0 (default) fires immediately
   * (next tick()). */
  delayMs?: number;
  /** Fires exactly once, the tick every spawn in this call has actually fired. */
  onSettled?: () => void;
}

export interface TickResult<T> {
  spawned: T[];
  despawned: T[];
}

export interface EntityPoolConfig<T> {
  /** Called once per ref, the tick its despawn timer elapses — do DOM/resource cleanup here. */
  onDespawn: (ref: T) => void;
}

/**
 * Generic lifecycle bookkeeping shared by any pooled entity type that needs "some exist now,
 * grow/shrink toward a count, notify once a batch of that growth/shrink has visibly landed."
 * Deliberately doesn't know about rendering, physics, or DOM — callers own all of that; this
 * only tracks which refs exist, which are mid-despawn, and which spawns are still pending.
 */
export class EntityPool<T> {
  private entries: PoolEntry<T>[] = [];
  private scheduledSpawns: ScheduledSpawn<T>[] = [];
  private spawnBatch: BatchTracker | null = null;
  private despawnBatch: BatchTracker | null = null;
  private readonly onDespawnCb: (ref: T) => void;

  constructor(config: EntityPoolConfig<T>) {
    this.onDespawnCb = config.onDespawn;
  }

  /** Registers already-created refs as immediately active — for entities the caller spawned
   * itself, outside of spawnScheduled(). */
  add(refs: readonly T[]): void {
    for (const ref of refs) this.entries.push({ ref, phase: "active", removeAtMs: 0 });
  }

  /** Every ref this pool is still tracking, regardless of phase (active or despawning). */
  get allRefs(): T[] {
    return this.entries.map((e) => e.ref);
  }

  get activeCount(): number {
    return this.entries.filter((e) => e.phase === "active").length;
  }

  /** Marks `refs` despawning; each is removed (onDespawn fired) `despawnMs` after its own
   * stagger slot. No-op for an empty `refs` list. Calling this again before a prior despawn
   * batch has fully settled replaces this pool's single outstanding despawn-batch tracker —
   * callers should not start overlapping despawn batches on the same pool. */
  despawn(refs: readonly T[], despawnMs: number, opts: DespawnOptions = {}): void {
    if (refs.length === 0) return;
    const refSet = new Set(refs);
    const now = Date.now();
    const stagger = opts.staggerMs ?? 0;
    let i = 0;
    for (const e of this.entries) {
      if (!refSet.has(e.ref) || e.phase === "despawning") continue;
      e.phase = "despawning";
      e.removeAtMs = now + i * stagger + despawnMs;
      i++;
    }
    this.despawnBatch = { remaining: i, onSettled: opts.onSettled };
  }

  /** Schedules `opts.count` new refs to spawn via `opts.factory`, one per fired slot. No-op
   * for count 0. Calling this again before a prior spawn batch has fully fired replaces this
   * pool's single outstanding spawn-batch tracker — see cancelScheduledSpawns() to explicitly
   * drop a superseded batch first. */
  spawnScheduled(opts: SpawnScheduleOptions<T>): void {
    if (opts.count === 0) return;
    const now = Date.now();
    const delay = opts.delayMs ?? 0;
    const stagger = opts.staggerMs ?? 0;
    for (let i = 0; i < opts.count; i++) {
      this.scheduledSpawns.push({ fireAtMs: now + delay + i * stagger, factory: opts.factory });
    }
    this.spawnBatch = { remaining: opts.count, onSettled: opts.onSettled };
  }

  /** Drops every not-yet-fired scheduled spawn and its onSettled — for a caller that needs a
   * new outcome to supersede an in-flight regroup (e.g. a full-power win cancelling a
   * MEDIUM/LOW backfire's trickle-in). */
  cancelScheduledSpawns(): void {
    this.scheduledSpawns = [];
    this.spawnBatch = null;
  }

  /** Call once per engine frame. Removes any despawning ref whose window has elapsed (firing
   * onDespawn), fires any scheduled spawn whose fireAtMs has elapsed (adding it as active),
   * and fires each batch's onSettled the instant that batch fully lands. Returns exactly
   * which refs were spawned/despawned this call, so callers can react (e.g. re-run a
   * formation layout only when something actually spawned). */
  tick(nowMs: number): TickResult<T> {
    const despawned: T[] = [];
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]!;
      if (e.phase === "despawning" && nowMs >= e.removeAtMs) {
        this.entries.splice(i, 1);
        despawned.push(e.ref);
        this.onDespawnCb(e.ref);
        if (this.despawnBatch) {
          this.despawnBatch.remaining--;
          if (this.despawnBatch.remaining <= 0) {
            const cb = this.despawnBatch.onSettled;
            this.despawnBatch = null;
            cb?.();
          }
        }
      }
    }

    const spawned: T[] = [];
    for (let i = this.scheduledSpawns.length - 1; i >= 0; i--) {
      const s = this.scheduledSpawns[i]!;
      if (nowMs < s.fireAtMs) continue;
      this.scheduledSpawns.splice(i, 1);
      const ref = s.factory();
      this.add([ref]);
      spawned.push(ref);
      if (this.spawnBatch) {
        this.spawnBatch.remaining--;
        if (this.spawnBatch.remaining <= 0) {
          const cb = this.spawnBatch.onSettled;
          this.spawnBatch = null;
          cb?.();
        }
      }
    }

    return { spawned, despawned };
  }

  /** Drops every tracked ref immediately, without firing onDespawn — for teardown, where the
   * caller does its own cleanup loop over allRefs first. */
  removeAll(): void {
    this.entries = [];
    this.scheduledSpawns = [];
    this.spawnBatch = null;
    this.despawnBatch = null;
  }
}
