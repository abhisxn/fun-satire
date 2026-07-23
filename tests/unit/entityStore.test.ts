import { describe, expect, it } from "vitest";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, x: number, y: number, homeX?: number, homeY?: number): Entity {
  return {
    id,
    content: { manifestId: `eye-${id}`, rig: "eye", renderType: "eye" },
    physics: {
      pos: { x, y },
      vel: { x: 0, y: 0 },
      home: { x: homeX ?? x, y: homeY ?? y },
      scale: 1,
      rotation: 0,
    },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("entities/EntityStore (T6)", () => {
  it("starts empty", () => {
    const store = new EntityStore();
    expect(store.size).toBe(0);
    expect(store.aliveCount).toBe(0);
    expect(store.dyingCount).toBe(0);
  });

  it("inserts entities into the alive set", () => {
    const store = new EntityStore();
    const e = makeEntity(1, 10, 20);
    store.insert(e);
    expect(store.size).toBe(1);
    expect(store.aliveCount).toBe(1);
    expect(store.dyingCount).toBe(0);
  });

  it("rejects duplicate ids and throws", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    expect(() => store.insert(makeEntity(1, 0, 0))).toThrowError(/duplicate/i);
  });

  it("markDying moves the entity from alive to dying", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    store.markDying(1);
    expect(store.aliveCount).toBe(0);
    expect(store.dyingCount).toBe(1);
  });

  it("remove drops the entity entirely", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    store.remove(1);
    expect(store.size).toBe(0);
  });

  it("queryNearest returns the closest alive entity within range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    store.insert(makeEntity(2, 105, 100));
    store.insert(makeEntity(3, 50, 50));
    expect(store.queryNearest({ x: 80, y: 80 }, 200)?.id).toBe(1);
  });

  it("queryNearest returns null when nothing is in range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    expect(store.queryNearest({ x: 800, y: 800 }, 100)).toBeNull();
  });

  it("queryNearest skips dying entities", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    store.insert(makeEntity(2, 5, 5));
    store.markDying(1);
    expect(store.queryNearest({ x: 0, y: 0 }, 200)?.id).toBe(2);
  });

  it("queryNearest returns null for negative or non-finite range", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    expect(store.queryNearest({ x: 0, y: 0 }, -10)).toBeNull();
    expect(store.queryNearest({ x: 0, y: 0 }, Number.NaN)).toBeNull();
    expect(store.queryNearest({ x: 0, y: 0 }, Number.POSITIVE_INFINITY)?.id).toBe(1);
  });

  it("queryNearest breaks distance ties by insertion order (older first)", () => {
    const store = new EntityStore();
    store.insert(makeEntity(7, 10, 10));
    store.insert(makeEntity(2, 10, 10));
    expect(store.queryNearest({ x: 0, y: 0 }, 200)?.id).toBe(7);
  });

  it("forEachAlive only iterates alive entities; forEachDying only dying", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    store.insert(makeEntity(2, 0, 0));
    store.insert(makeEntity(3, 0, 0));
    store.markDying(2);
    const alive: number[] = [];
    const dying: number[] = [];
    store.forEachAlive((e) => alive.push(e.id));
    store.forEachDying((e) => dying.push(e.id));
    expect(alive.sort()).toEqual([1, 3]);
    expect(dying).toEqual([2]);
  });

  it("get retrieves a deep-copied snapshot by default and a live ref via { live: true }", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 5, 5));
    const snap = store.get(1);
    const live = store.get(1, { live: true });
    snap.physics.pos.x = 999;
    expect(live.physics.pos.x).toBe(5);
    live.physics.pos.x = 7;
    expect(store.get(1)!.physics.pos.x).toBe(7);
  });

  it("clear empties the store and resets counts", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 0, 0));
    store.insert(makeEntity(2, 0, 0));
    store.markDying(1);
    store.clear();
    expect(store.size).toBe(0);
    expect(store.aliveCount).toBe(0);
    expect(store.dyingCount).toBe(0);
  });

  it("insert rejects entities whose lifecycle flags are inconsistent with alive bucket", () => {
    const store = new EntityStore();
    const dead = makeEntity(1, 0, 0);
    dead.lifecycle.alive = false;
    expect(() => store.insert(dead)).toThrowError(/alive/);
  });
});
