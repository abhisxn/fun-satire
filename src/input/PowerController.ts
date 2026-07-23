import { type Rng } from "../core/Rng";
import type { EffectSystem } from "../effects/EffectSystem";
import { LASER_BURN } from "../effects/effectDefs/laserBurn";

export type PowerControllerArgs = {
  rng: Rng;
  worldAPI: {
    getEntity: (id: number) => import("../entities/Entity").Entity | null;
    startRespawn: (id: number, delayMs: number) => void;
  };
  effectSystem: EffectSystem;
  targetRadius: number;
  cooldownMs: number;
};

export type PowerTickInput = {
  cursor: { x: number; y: number; active: boolean };
  dtMs: number;
  nowMs: number;
};

export class PowerController {
  private charging: { entityId: number; startMs: number } | null = null;
  private cooldownUntilMs = 0;
  private chargeProgress = 0;
  private readonly worldAPI: PowerControllerArgs["worldAPI"];
  private readonly effectSystem: EffectSystem;
  private readonly targetRadius: number;
  private readonly cooldownMs: number;

  constructor(args: PowerControllerArgs) {
    this.worldAPI = args.worldAPI;
    this.effectSystem = args.effectSystem;
    this.targetRadius = args.targetRadius;
    this.cooldownMs = args.cooldownMs;
  }

  isCharging(): boolean {
    return this.charging !== null;
  }

  chargeTargetId(): number | null {
    return this.charging?.entityId ?? null;
  }

  chargeT(): number {
    return this.chargeProgress;
  }

  tryPress(targetId: number, x: number, y: number, nowMs: number): boolean {
    if (nowMs < this.cooldownUntilMs) return false;
    const entity = this.worldAPI.getEntity(targetId);
    if (!entity) return false;
    if (!entity.lifecycle.alive || entity.lifecycle.dying) return false;
    const dx = entity.physics.pos.x - x;
    const dy = entity.physics.pos.y - y;
    if (dx * dx + dy * dy > this.targetRadius * this.targetRadius) return false;
    this.charging = { entityId: targetId, startMs: nowMs };
    this.chargeProgress = 0;
    return true;
  }

  tick(input: PowerTickInput): boolean {
    if (!this.charging) return false;
    const entity = this.worldAPI.getEntity(this.charging.entityId);
    if (!entity) {
      this.charging = null;
      return false;
    }
    const dx = entity.physics.pos.x - input.cursor.x;
    const dy = entity.physics.pos.y - input.cursor.y;
    if (!input.cursor.active || dx * dx + dy * dy > this.targetRadius * this.targetRadius) {
      this.charging = null;
      this.chargeProgress = 0;
      return false;
    }
    this.chargeProgress = Math.min(
      1,
      (input.nowMs - this.charging.startMs) / LASER_BURN.chargeThresholdMs,
    );
    if (this.chargeProgress >= 1) {
      this.fire(this.charging.entityId, input.nowMs);
      return true;
    }
    return false;
  }

  release(nowMs: number): boolean {
    if (!this.charging) return false;
    if (this.chargeProgress >= 1) {
      this.fire(this.charging.entityId, nowMs);
      return true;
    }
    this.charging = null;
    this.chargeProgress = 0;
    return false;
  }

  cancel(): void {
    this.charging = null;
    this.chargeProgress = 0;
  }

  private fire(entityId: number, nowMs: number): void {
    const entity = this.worldAPI.getEntity(entityId);
    if (!entity || !entity.lifecycle.alive || entity.lifecycle.dying) {
      this.charging = null;
      this.chargeProgress = 0;
      return;
    }
    this.effectSystem.start(
      "laserBurn",
      entityId,
      { x: entity.physics.pos.x, y: entity.physics.pos.y },
      nowMs,
    );
    this.cooldownUntilMs = nowMs + this.cooldownMs;
    this.charging = null;
    this.chargeProgress = 0;
  }
}
