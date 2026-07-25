import type { ParticleSystem } from "./ParticleSystem";
import type { Entity, EntityId, Vec2 } from "../entities/Entity";

export type EffectEasing = (t: number) => number;

export type EffectStage = {
  id?: string;
  durationMs: number;
  easing: EffectEasing;
  visual?: Record<string, number | string>;
  onStart?: (ctx: EffectCtx) => void;
  update: (ctx: EffectCtx, t: number) => void;
};

export type EffectDef = {
  id: string;
  stages: readonly EffectStage[];
};

export type WorldAPI = {
  getEntity(id: EntityId): Entity | null;
  markDying(id: EntityId): void;
  startRespawn(id: EntityId, delayMs: number): void;
};

export type ActiveEffect = {
  id: number;
  defId: string;
  entityId: EntityId;
  startedAtMs: number;
  target: Vec2;
  stageIndex: number;
  stageStartedAtMs: number;
  done: boolean;
};

export type EffectCtx = {
  entity: Entity;
  target: Vec2;
  particles: ParticleSystem;
  rng: import("../core/Rng").Rng;
  world: WorldAPI;
  stageIndex: number;
  effect: ActiveEffect;
};

export const EASE_PROTEST = (t: number): number => 1 - Math.pow(1 - t, 3);
export const EASE_IN = (t: number): number => t * t;
export const EASE_OUT = (t: number): number => 1 - (1 - t) * (1 - t);
export const EASE_LINEAR = (t: number): number => t;

export class EffectSystem {
  private effects: ActiveEffect[] = [];
  private nextId = 1;
  private readonly defs = new Map<string, EffectDef>();
  private readonly particles: ParticleSystem;
  private readonly rng: import("../core/Rng").Rng;
  private readonly world: WorldAPI;

  constructor(particles: ParticleSystem, rng: import("../core/Rng").Rng, world: WorldAPI) {
    this.particles = particles;
    this.rng = rng;
    this.world = world;
  }

  register(def: EffectDef): void {
    this.defs.set(def.id, def);
  }

  start(defId: string, entityId: EntityId, target: Vec2, startedAtMs: number): ActiveEffect | null {
    const def = this.defs.get(defId);
    if (!def || def.stages.length === 0) return null;
    const entity = this.world.getEntity(entityId);
    if (!entity) return null;
    const effect: ActiveEffect = {
      id: this.nextId++,
      defId,
      entityId,
      startedAtMs,
      target,
      stageIndex: 0,
      stageStartedAtMs: startedAtMs,
      done: false,
    };
    this.effects.push(effect);
    const ctx: EffectCtx = {
      entity,
      target,
      particles: this.particles,
      rng: this.rng,
      world: this.world,
      stageIndex: 0,
      effect,
    };
    const stage = def.stages[0]!;
    stage.onStart?.(ctx);
    return effect;
  }

  update(nowMs: number): void {
    for (const effect of this.effects) {
      if (effect.done) continue;
      const def = this.defs.get(effect.defId);
      if (!def) {
        effect.done = true;
        continue;
      }
      let safety = def.stages.length * 2 + 4;
      while (!effect.done && safety-- > 0) {
        const stage = def.stages[effect.stageIndex]!;
        const elapsed = nowMs - effect.stageStartedAtMs;
        const tRaw = stage.durationMs <= 0 ? 1 : Math.min(1, elapsed / stage.durationMs);
        const t = stage.easing(tRaw);
        const entity = this.world.getEntity(effect.entityId);
        if (!entity) {
          effect.done = true;
          break;
        }
        const ctx: EffectCtx = {
          entity,
          target: effect.target,
          particles: this.particles,
          rng: this.rng,
          world: this.world,
          stageIndex: effect.stageIndex,
          effect,
        };
        stage.update(ctx, t);
        if (tRaw >= 1) {
          const nextStart = effect.stageStartedAtMs + stage.durationMs;
          effect.stageIndex++;
          effect.stageStartedAtMs = nextStart;
          if (effect.stageIndex >= def.stages.length) {
            effect.done = true;
          } else {
            const next = def.stages[effect.stageIndex]!;
            next.onStart?.(ctx);
          }
        } else {
          break;
        }
      }
    }
    this.effects = this.effects.filter((e) => !e.done);
  }

  liveCount(): number {
    return this.effects.length;
  }

  liveEffects(): readonly ActiveEffect[] {
    return this.effects;
  }

  getDef(defId: string): EffectDef | undefined {
    return this.defs.get(defId);
  }

  reset(): void {
    this.effects = [];
    this.nextId = 1;
  }
}
