import { describe, expect, it } from "vitest";
import { Rng } from "../../src/core/Rng";
import { EntityStore } from "../../src/entities/EntityStore";
import { RespawnScheduler } from "../../src/effects/RespawnScheduler";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: "x", rig: "eye", renderType: "eye" },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("effects/RespawnScheduler (T21)", () => {
  it("schedules a fireAtMs in the 3-6s window for a fixed seed", () => {
    const store = new EntityStore();
    const e = makeEntity(1, 100, 100);
    store.insert(e);
    const sched = new RespawnScheduler({ rng: new Rng(42), width: 1280, height: 720 });
    sched.schedule(e, 0);
    expect(e.lifecycle.respawnAt).toBeGreaterThanOrEqual(3000);
    expect(e.lifecycle.respawnAt).toBeLessThanOrEqual(6000);
    expect(sched.pending()).toHaveLength(1);
  });

  it("tick(nowMs) returns ids only for entries whose time has come", () => {
    const store = new EntityStore();
    const e1 = makeEntity(1, 0, 0);
    const e2 = makeEntity(2, 0, 0);
    store.insert(e1);
    store.insert(e2);
    const sched = new RespawnScheduler({
      rng: new Rng(1), width: 1280, height: 720,
      minDelayMs: 1000, maxDelayMs: 5000,
    });
    sched.schedule(e1, 0);
    sched.schedule(e2, 0);
    const fire1 = e1.lifecycle.respawnAt ?? 0;
    const fire2 = e2.lifecycle.respawnAt ?? 0;
    expect(fire1).toBeGreaterThanOrEqual(1000);
    expect(fire1).toBeLessThanOrEqual(5000);
    expect(fire2).toBeGreaterThanOrEqual(1000);
    expect(fire2).toBeLessThanOrEqual(5000);
    const early = Math.min(fire1, fire2);
    const late = Math.max(fire1, fire2);
    const earlyId = fire1 < fire2 ? 1 : 2;
    const lateId = fire1 < fire2 ? 2 : 1;
    expect(sched.tick(early + 1)).toEqual([earlyId]);
    expect(sched.tick(late + 1)).toEqual([lateId]);
    expect(sched.tick(99999)).toEqual([]);
  });

  it("samplePos returns a point in-canvas with margin", () => {
    const store = new EntityStore();
    const sched = new RespawnScheduler({ rng: new Rng(7), width: 1280, height: 720 });
    for (let i = 0; i < 50; i++) {
      const p = sched.samplePos();
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThanOrEqual(1280);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThanOrEqual(720);
    }
  });

  it("is deterministic for a fixed seed and schedule time", () => {
    const store = new EntityStore();
    const a = new RespawnScheduler({ rng: new Rng(7), width: 1280, height: 720 });
    const b = new RespawnScheduler({ rng: new Rng(7), width: 1280, height: 720 });
    const ea = makeEntity(1, 100, 100);
    const eb = makeEntity(2, 100, 100);
    store.insert(ea);
    store.insert(eb);
    a.schedule(ea, 0);
    b.schedule(eb, 0);
    expect(ea.lifecycle.respawnAt).toBe(eb.lifecycle.respawnAt);
  });

  it("custom min/max delay overrides the 3-6s window", () => {
    const store = new EntityStore();
    const e = makeEntity(1, 100, 100);
    store.insert(e);
    const sched = new RespawnScheduler({
      rng: new Rng(1), width: 1280, height: 720,
      minDelayMs: 100, maxDelayMs: 200,
    });
    sched.schedule(e, 0);
    expect(e.lifecycle.respawnAt).toBeGreaterThanOrEqual(100);
    expect(e.lifecycle.respawnAt).toBeLessThanOrEqual(200);
  });
});
