// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";
import { DragController } from "../../src/input/DragController";

function makeEntity(id: number, x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: `e${id}`, rig: "eye", renderType: "eye" },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("input/DragController (T17)", () => {
  it("starts with no drag in progress", () => {
    const store = new EntityStore();
    const ctrl = new DragController(store);
    expect(ctrl.draggedId()).toBeNull();
  });

  it("tryStart marks the entity as dragged and updates its home on release", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ctrl = new DragController(store);
    ctrl.attach();
    const ok = ctrl.tryStart(1, 100, 100);
    expect(ok).toBe(true);
    expect(store.get(1, { live: true })!.lifecycle.dragged).toBe(true);
    ctrl.move(120, 110);
    const live = store.get(1, { live: true })!;
    expect(live.physics.pos.x).toBe(120);
    expect(live.physics.pos.y).toBe(110);
    ctrl.release();
    expect(store.get(1, { live: true })!.lifecycle.dragged).toBe(false);
    expect(store.get(1, { live: true })!.physics.home.x).toBe(120);
  });

  it("rejects starting on a dying or non-alive entity", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    store.markDying(1);
    const ctrl = new DragController(store);
    expect(ctrl.tryStart(1, 100, 100)).toBe(false);
  });

  it("computes residual velocity from the most recent pointer motion on release", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ctrl = new DragController(store);
    ctrl.tryStart(1, 100, 100);
    ctrl.move(120, 100, 1000);
    ctrl.move(140, 100, 1050);
    ctrl.release(1100);
    const live = store.get(1, { live: true })!;
    const dt = (1100 - 1050) / 1000;
    const expectedVx = (140 - 120) / dt;
    expect(live.physics.vel.x).toBeCloseTo(expectedVx, 3);
  });

  it("ignores move() / release() without an active drag", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ctrl = new DragController(store);
    expect(() => ctrl.move(200, 200)).not.toThrow();
    expect(() => ctrl.release()).not.toThrow();
    expect(store.get(1, { live: true })!.physics.pos.x).toBe(100);
  });

  it("supports starting a new drag after the previous one ends", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ctrl = new DragController(store);
    ctrl.tryStart(1, 100, 100);
    ctrl.release();
    expect(ctrl.tryStart(1, 200, 200)).toBe(true);
  });

  it("force-ends an active drag via cancel() and clears dragged flag", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ctrl = new DragController(store);
    ctrl.tryStart(1, 100, 100);
    ctrl.cancel();
    expect(ctrl.draggedId()).toBeNull();
    expect(store.get(1, { live: true })!.lifecycle.dragged).toBe(false);
  });
});
