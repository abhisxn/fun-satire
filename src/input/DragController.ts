import type { EntityStore } from "../entities/EntityStore";
import type { EntityId } from "../entities/Entity";

export const DRAG = Object.freeze({
  defaultReleaseDtSeconds: 1 / 60,
  maxResidualSpeed: 1500,
} as const);

export class DragController {
  private dragged: EntityId | null = null;
  private lastX = 0;
  private lastY = 0;
  private lastDeltaX = 0;
  private lastDeltaY = 0;
  private lastMoveMs: number | null = null;
  private readonly store: EntityStore;

  constructor(store: EntityStore) {
    this.store = store;
  }

  attach(): void {}

  draggedId(): EntityId | null {
    return this.dragged;
  }

  tryStart(id: EntityId, x: number, y: number): boolean {
    const entity = this.store.get(id, { live: true });
    if (!entity) return false;
    if (!entity.lifecycle.alive || entity.lifecycle.dying) return false;
    entity.lifecycle.dragged = true;
    entity.physics.vel.x = 0;
    entity.physics.vel.y = 0;
    this.dragged = id;
    this.lastX = x;
    this.lastY = y;
    this.lastDeltaX = 0;
    this.lastDeltaY = 0;
    this.lastMoveMs = null;
    return true;
  }

  move(x: number, y: number, nowMs?: number): void {
    if (this.dragged === null) return;
    const entity = this.store.get(this.dragged, { live: true });
    if (!entity) return;
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    entity.physics.pos.x = x;
    entity.physics.pos.y = y;
    this.lastDeltaX = dx;
    this.lastDeltaY = dy;
    this.lastX = x;
    this.lastY = y;
    this.lastMoveMs = nowMs ?? null;
  }

  release(nowMs?: number): void {
    if (this.dragged === null) return;
    const entity = this.store.get(this.dragged, { live: true });
    if (!entity) {
      this.dragged = null;
      return;
    }
    const dt = this.lastMoveMs !== null && nowMs !== undefined
      ? Math.max(1e-3, (nowMs - this.lastMoveMs) / 1000)
      : DRAG.defaultReleaseDtSeconds;
    let vx = this.lastDeltaX / dt;
    let vy = this.lastDeltaY / dt;
    const m = Math.sqrt(vx * vx + vy * vy);
    if (m > DRAG.maxResidualSpeed) {
      const k = DRAG.maxResidualSpeed / m;
      vx *= k;
      vy *= k;
    }
    entity.physics.vel.x = vx;
    entity.physics.vel.y = vy;
    entity.physics.home.x = entity.physics.pos.x;
    entity.physics.home.y = entity.physics.pos.y;
    entity.lifecycle.dragged = false;
    this.dragged = null;
    this.lastDeltaX = 0;
    this.lastDeltaY = 0;
    this.lastMoveMs = null;
  }

  cancel(): void {
    if (this.dragged === null) return;
    const entity = this.store.get(this.dragged, { live: true });
    if (entity) {
      entity.physics.vel.x = 0;
      entity.physics.vel.y = 0;
      entity.lifecycle.dragged = false;
    }
    this.dragged = null;
  }
}
