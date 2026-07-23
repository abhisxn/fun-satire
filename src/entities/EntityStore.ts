import type { Entity, EntityId, Vec2 } from "./Entity";

type Bucket = Map<EntityId, Entity>;

const clone = <T>(v: T): T => structuredClone(v);

const distSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export class EntityStore {
  private readonly alive: Bucket = new Map();
  private readonly dying: Bucket = new Map();
  private insertionOrder: EntityId[] = [];
  private insertionIndex: Map<EntityId, number> = new Map();

  get size(): number {
    return this.alive.size + this.dying.size;
  }

  get aliveCount(): number {
    return this.alive.size;
  }

  get dyingCount(): number {
    return this.dying.size;
  }

  insert(entity: Entity): void {
    if (this.alive.has(entity.id) || this.dying.has(entity.id)) {
      throw new Error(`EntityStore: duplicate id ${entity.id}`);
    }
    if (!entity.lifecycle.alive || entity.lifecycle.dying) {
      throw new Error(
        `EntityStore: insert requires alive/!dying entity (id=${entity.id})`,
      );
    }
    this.alive.set(entity.id, entity);
    this.insertionIndex.set(entity.id, this.insertionOrder.length);
    this.insertionOrder.push(entity.id);
  }

  markDying(id: EntityId): void {
    const entity = this.alive.get(id);
    if (!entity) return;
    this.alive.delete(id);
    entity.lifecycle.dying = true;
    entity.lifecycle.alive = false;
    this.dying.set(id, entity);
  }

  remove(id: EntityId): void {
    this.alive.delete(id);
    this.dying.delete(id);
    this.insertionIndex.delete(id);
    this.insertionOrder = this.insertionOrder.filter((e) => e !== id);
  }

  get(id: EntityId, opts: { live?: boolean } = {}): Entity | null {
    const e = this.alive.get(id) ?? this.dying.get(id) ?? null;
    if (!e) return null;
    return opts.live ? e : clone(e);
  }

  queryNearest(point: Vec2, maxRange: number): Entity | null {
    if (Number.isNaN(maxRange)) return null;
    const effectiveRange =
      !Number.isFinite(maxRange) || maxRange === Number.POSITIVE_INFINITY
        ? Infinity
        : maxRange;
    if (effectiveRange < 0) return null;
    const maxSq = effectiveRange === Infinity ? Infinity : effectiveRange * effectiveRange;
    let bestId: EntityId | null = null;
    let bestDist = Infinity;
    let bestOrder = Infinity;
    for (const [id, e] of this.alive) {
      const d = distSq(e.physics.pos, point);
      if (d > maxSq) continue;
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
        bestOrder = this.insertionIndex.get(id) ?? 0;
      } else if (d === bestDist) {
        const order = this.insertionIndex.get(id) ?? 0;
        if (order < bestOrder) {
          bestId = id;
          bestOrder = order;
        }
      }
    }
    if (bestId === null) return null;
    return this.alive.get(bestId) ?? null;
  }

  forEachAlive(fn: (e: Entity) => void): void {
    for (const e of this.alive.values()) fn(e);
  }

  forEachDying(fn: (e: Entity) => void): void {
    for (const e of this.dying.values()) fn(e);
  }

  forEach(fn: (e: Entity) => void): void {
    this.forEachAlive(fn);
    this.forEachDying(fn);
  }

  clear(): void {
    this.alive.clear();
    this.dying.clear();
    this.insertionOrder = [];
    this.insertionIndex.clear();
  }

  ids(): EntityId[] {
    return [...this.insertionOrder];
  }
}
