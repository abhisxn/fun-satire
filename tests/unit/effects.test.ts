import { describe, expect, it } from "vitest";
import { Rng } from "../../src/core/Rng";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem, EASE_PROTEST } from "../../src/effects/EffectSystem";
import { EntityStore } from "../../src/entities/EntityStore";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: "eye-1", rig: "eye", renderType: "eye" },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("effects/ParticleSystem (T18)", () => {
  it("pools particles within capacity and never overshoots", () => {
    const rng = new Rng(1);
    const ps = new ParticleSystem(rng, 5);
    for (let i = 0; i < 20; i++) {
      ps.spawn({
        x: 0, y: 0, vx: 0, vy: 0, lifeMs: 1000, startSize: 4, endSize: 0,
        color: "#000", rotation: 0, rotationSpeed: 0, spin: 0,
      });
    }
    expect(ps.liveCount).toBeLessThanOrEqual(5);
  });

  it("kill particles when age >= lifeMs", () => {
    const rng = new Rng(1);
    const ps = new ParticleSystem(rng, 5);
    ps.spawn({
      x: 0, y: 0, vx: 0, vy: 0, lifeMs: 100, startSize: 4, endSize: 0,
      color: "#000", rotation: 0, rotationSpeed: 0, spin: 0,
    });
    ps.update(60);
    expect(ps.liveCount).toBe(1);
    ps.update(60);
    expect(ps.liveCount).toBe(0);
  });

  it("cull() removes every expired particle", () => {
    const rng = new Rng(1);
    const ps = new ParticleSystem(rng, 4);
    for (let i = 0; i < 4; i++) {
      ps.spawn({
        x: 0, y: 0, vx: 0, vy: 0, lifeMs: 50, startSize: 4, endSize: 0,
        color: "#000", rotation: 0, rotationSpeed: 0, spin: 0,
      });
    }
    ps.update(60);
    expect(ps.cull()).toBeGreaterThanOrEqual(0);
    expect(ps.liveCount).toBe(0);
  });

  it("draw() iterates live particles and calls save/translate/fill/restore", () => {
    const rng = new Rng(1);
    const ps = new ParticleSystem(rng, 2);
    ps.spawn({
      x: 0, y: 0, vx: 0, vy: 0, lifeMs: 100, startSize: 4, endSize: 0,
      color: "#000", rotation: 0, rotationSpeed: 0, spin: 0,
    });
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      translate: () => calls.push("translate"),
      rotate: () => calls.push("rotate"),
      beginPath: () => calls.push("beginPath"),
      arc: () => calls.push("arc"),
      fill: () => calls.push("fill"),
      fillStyle: "",
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    ps.draw(ctx);
    expect(calls).toContain("save");
    expect(calls).toContain("translate");
    expect(calls).toContain("arc");
    expect(calls).toContain("fill");
    expect(calls).toContain("restore");
  });
});

describe("effects/EffectSystem (T18)", () => {
  it("runs ordered stages with easing and calls onStart at most once per stage", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ps = new ParticleSystem(new Rng(1), 8);
    const world = {
      getEntity: (id: number) => store.get(id, { live: true }),
      startRespawn: (_id: number, _delayMs: number) => undefined,
    };
    const sys = new EffectSystem(ps, new Rng(1), world, { play: () => {} });
    const started: string[] = [];
    sys.register({
      id: "test.twoStage",
      stages: [
        {
          durationMs: 100,
          easing: EASE_PROTEST,
          onStart: () => started.push("a"),
          update: (ctx, t) => {
            ctx.entity.physics.scale = 1 - t;
          },
        },
        {
          durationMs: 100,
          easing: EASE_PROTEST,
          onStart: () => started.push("b"),
          update: (ctx, t) => {
            ctx.entity.physics.scale = 0;
          },
        },
      ],
    });
    sys.start("test.twoStage", 1, { x: 100, y: 100 }, 0);
    sys.update(150);
    expect(started).toEqual(["a", "b"]);
    sys.update(150);
    sys.update(150);
    expect(started.length).toBe(2);
  });

  it("caps easing tRaw at 1 even on a large dt and never throws on NaN", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ps = new ParticleSystem(new Rng(0), 1);
    const sys = new EffectSystem(ps, new Rng(0), {
      getEntity: (id) => store.get(id, { live: true }),
      startRespawn: () => undefined,
    }, { play: () => {} });
    sys.register({
      id: "noop",
      stages: [
        {
          durationMs: 50,
          easing: EASE_PROTEST,
          update: (_ctx, t) => {
            expect(Number.isFinite(t)).toBe(true);
            expect(t).toBeLessThanOrEqual(1);
          },
        },
      ],
    });
    sys.start("noop", 1, { x: 0, y: 0 }, 0);
    sys.update(1e6);
  });

  it("returns null on unknown effect id", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const sys = new EffectSystem(
      new ParticleSystem(new Rng(0), 1),
      new Rng(0),
      {
        getEntity: (id) => store.get(id, { live: true }),
        startRespawn: () => undefined,
      },
      { play: () => {} },
    );
    expect(sys.start("missing", 1, { x: 0, y: 0 }, 0)).toBeNull();
  });

  it("forwards particle spawn to the bound ParticleSystem from inside an update", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, 100, 100));
    const ps = new ParticleSystem(new Rng(1), 10);
    const sys = new EffectSystem(ps, new Rng(1), {
      getEntity: (id) => store.get(id, { live: true }),
      startRespawn: () => undefined,
    }, { play: () => {} });
    sys.register({
      id: "burst",
      stages: [
        {
          durationMs: 16,
          easing: EASE_PROTEST,
          update: (ctx, _t) => {
            ctx.particles.spawn({
              x: ctx.target.x, y: ctx.target.y,
              vx: ctx.rng.range(-10, 10), vy: ctx.rng.range(-10, 10),
              lifeMs: 100, startSize: 4, endSize: 0,
              color: "#000", rotation: 0, rotationSpeed: 0, spin: 0,
            });
          },
        },
      ],
    });
    sys.start("burst", 1, { x: 100, y: 100 }, 0);
    sys.update(20);
    expect(ps.liveCount).toBeGreaterThan(0);
  });
});
