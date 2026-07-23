import type { Rng } from "../core/Rng";
import type { Entity, EntityId, Vec2 } from "../entities/Entity";

export const RESPAWN = Object.freeze({
  minDelayMs: 3000,
  maxDelayMs: 6000,
  scatterPadding: 60,
} as const);

export type RespawnScheduleEntry = {
  entityId: EntityId;
  fireAtMs: number;
  baseSize: number;
  paletteSummary: string;
};

export class RespawnScheduler {
  private queue: RespawnScheduleEntry[] = [];
  private readonly rng: Rng;
  private readonly width: number;
  private readonly height: number;
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(opts: {
    rng: Rng;
    width: number;
    height: number;
    minDelayMs?: number;
    maxDelayMs?: number;
  }) {
    this.rng = opts.rng;
    this.width = opts.width;
    this.height = opts.height;
    this.minDelayMs = opts.minDelayMs ?? RESPAWN.minDelayMs;
    this.maxDelayMs = opts.maxDelayMs ?? RESPAWN.maxDelayMs;
  }

  schedule(entity: Entity, nowMs: number): void {
    const target = {
      entityId: entity.id,
      fireAtMs: nowMs + this.rng.range(this.minDelayMs, this.maxDelayMs),
      baseSize: 56,
      paletteSummary: (entity.content.palette?.iris ?? "") as string,
    };
    entity.lifecycle.respawnAt = target.fireAtMs;
    this.queue.push(target);
  }

  pending(): readonly RespawnScheduleEntry[] {
    return this.queue;
  }

  samplePos(): Vec2 {
    const margin = RESPAWN.scatterPadding;
    return {
      x: this.rng.range(margin, Math.max(margin + 1, this.width - margin)),
      y: this.rng.range(margin, Math.max(margin + 1, this.height - margin)),
    };
  }

  tick(nowMs: number): EntityId[] {
    const ready: EntityId[] = [];
    const remaining: RespawnScheduleEntry[] = [];
    for (const entry of this.queue) {
      if (entry.fireAtMs <= nowMs) {
        ready.push(entry.entityId);
      } else {
        remaining.push(entry);
      }
    }
    this.queue = remaining;
    return ready;
  }

  reset(): void {
    this.queue = [];
  }
}
