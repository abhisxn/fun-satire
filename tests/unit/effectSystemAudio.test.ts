import { describe, expect, it } from "vitest";
import { EffectSystem, EASE_LINEAR, type EffectDef, type WorldAPI, type AudioEngineLike } from "../../src/effects/EffectSystem";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { Rng } from "../../src/core/Rng";
import type { Entity, EntityId } from "../../src/entities/Entity";

function makeEntity(id: EntityId): Entity {
  return {
    id,
    physics: { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, home: { x: 0, y: 0 }, scale: 1, rotation: 0 },
    lifecycle: { alive: true, dying: false, dragged: false, respawnAt: null },
    content: { manifestId: "test", rig: "test", renderType: "eye" },
    behavior: { data: {} },
  } as unknown as Entity;
}

describe("effects/EffectSystem audio cue wiring", () => {
  it("plays each stage's cue as that stage starts", () => {
    const played: string[] = [];
    const audio: AudioEngineLike = { play: (id) => played.push(id) };
    const entity = makeEntity(1 as EntityId);
    const world: WorldAPI = {
      getEntity: () => entity,
      markDying: () => {},
      startRespawn: () => {},
    };
    const particles = new ParticleSystem(new Rng(1), 8);
    const system = new EffectSystem(particles, new Rng(1), world, audio);
    const def: EffectDef = {
      id: "test.cueOrder",
      stages: [
        { durationMs: 10, easing: EASE_LINEAR, cue: "test.a", update: () => {} },
        { durationMs: 10, easing: EASE_LINEAR, cue: "test.b", update: () => {} },
      ],
    };
    system.register(def);
    system.start("test.cueOrder", 1 as EntityId, { x: 0, y: 0 }, 0);
    expect(played).toEqual(["test.a"]);
    system.update(11);
    expect(played).toEqual(["test.a", "test.b"]);
  });

  it("does not play a cue for a stage that has none", () => {
    const played: string[] = [];
    const audio: AudioEngineLike = { play: (id) => played.push(id) };
    const entity = makeEntity(2 as EntityId);
    const world: WorldAPI = {
      getEntity: () => entity,
      markDying: () => {},
      startRespawn: () => {},
    };
    const particles = new ParticleSystem(new Rng(1), 8);
    const system = new EffectSystem(particles, new Rng(1), world, audio);
    const def: EffectDef = {
      id: "test.noCue",
      stages: [{ durationMs: 10, easing: EASE_LINEAR, update: () => {} }],
    };
    system.register(def);
    system.start("test.noCue", 2 as EntityId, { x: 0, y: 0 }, 0);
    expect(played).toEqual([]);
  });
});
