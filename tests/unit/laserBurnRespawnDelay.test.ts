// tests/unit/laserBurnRespawnDelay.test.ts
// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { Rng } from "../../src/core/Rng";
import { EntityStore } from "../../src/entities/EntityStore";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem } from "../../src/effects/EffectSystem";
import { laserBurnEffect, LASER_BURN } from "../../src/effects/effectDefs/laserBurn";
import type { Entity } from "../../src/entities/Entity";

function makeEntity(id: number, renderType: "eye" | "subject", x: number, y: number): Entity {
  return {
    id,
    content: { manifestId: `${renderType}-1`, rig: renderType, renderType },
    physics: { pos: { x, y }, vel: { x: 0, y: 0 }, home: { x, y }, scale: 1, rotation: 0 },
    behavior: { data: {} },
    lifecycle: { alive: true, dragged: false, dying: false, respawnAt: null },
  };
}

describe("effects/effectDefs/laserBurn respawn delay by renderType (T32)", () => {
  it("uses the subject respawn window (LASER_BURN.subjectRespawnMinMs..MaxMs) for a subject entity", () => {
    const store = new EntityStore();
    store.insert(makeEntity(1, "subject", 0, 0));
    const startRespawn = vi.fn();
    const worldAPI = {
      getEntity: (id: number) => store.get(id, { live: true }),
      markDying: (id: number) => store.markDying(id),
      startRespawn,
    };
    const fx = new EffectSystem(new ParticleSystem(new Rng(1), 8), new Rng(1), worldAPI);
    fx.register(laserBurnEffect);
    fx.start("laserBurn", 1, { x: 0, y: 0 }, 0);
    fx.update(LASER_BURN.totalDurationMs + 10);
    expect(startRespawn).toHaveBeenCalledTimes(1);
    const [, delayMs] = startRespawn.mock.calls[0];
    expect(delayMs).toBeGreaterThanOrEqual(LASER_BURN.subjectRespawnMinMs);
    expect(delayMs).toBeLessThanOrEqual(LASER_BURN.subjectRespawnMaxMs);
  });

  it("uses the eye respawn window (3000..6000ms) for an eye entity", () => {
    const store = new EntityStore();
    store.insert(makeEntity(2, "eye", 0, 0));
    const startRespawn = vi.fn();
    const worldAPI = {
      getEntity: (id: number) => store.get(id, { live: true }),
      markDying: (id: number) => store.markDying(id),
      startRespawn,
    };
    const fx = new EffectSystem(new ParticleSystem(new Rng(1), 8), new Rng(1), worldAPI);
    fx.register(laserBurnEffect);
    fx.start("laserBurn", 2, { x: 0, y: 0 }, 0);
    fx.update(LASER_BURN.totalDurationMs + 10);
    const [, delayMs] = startRespawn.mock.calls[0];
    expect(delayMs).toBeGreaterThanOrEqual(LASER_BURN.eyeRespawnMinMs);
    expect(delayMs).toBeLessThanOrEqual(LASER_BURN.eyeRespawnMaxMs);
  });
});
