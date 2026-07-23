import type { EntityStore } from "../entities/EntityStore";
import type { Entity, EntityId } from "../entities/Entity";

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

  constructor(private readonly store: EntityStore) {}

  attach(): void {}

  draggedId(): EntityId | null {
    return this.dragged;
  }

  tryStart(id: EntityId, x: number, y: number): boolean {
    const live = this.store.get(id, { live: true });
    if (!live) return false;
    if (!live.lifecycle.alive || live.lifecycle.dying) return false;
    this.store.get(id, { live: true })!;
    const e = this.store.get(id, { live: true })! as Entity;
    e.lifecycle.dragged = true;
    e.physics.vel.x = 0;
    e.physics.vel.y = 0;
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
    const e = this.store.get(this.dragged, { live: true });
    if (!e) return;
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    e.physics.pos.x = x;
    e.physics.pos.y = y;
    this.lastDeltaX = dx;
    this.lastDeltaY = dy;
    this.lastX = x;
    this.lastY = y;
    this.lastMoveMs = nowMs ?? null;
  }

  release(nowMs?: number): void {
    if (this.dragged === null) return;
    const e = this.store.get(this.dragged, { live: true });
    if (e) {
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
      e.physics.vel.x = vx;
      e.physics.vel.y = vy;
      e.physics.home.x = e.physics.pos.x;
      e.physics.home.y = e.physics.pos.y;
      e.lifecycle.dragged = false;
    }
    this.dragged = null;
    this.lastDeltaX = 0;
    this.lastDeltaY = 0;
    this.lastMoveMs = null;
  }

  cancel(): void {
    if (this.dragged === null) return;
    const e = this.store.get(this.dragged, { live: true });
    if (e) {
      e.physics.vel.x = 0;
      e.physics.vel.y = 0;
      e.lifecycle.dragged = false;
    }
    this.dragged = null;
  }
}
