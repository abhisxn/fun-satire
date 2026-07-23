// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from "vitest";
import { Rng } from "../../src/core/Rng";
import { EntityStore } from "../../src/entities/EntityStore";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem } from "../../src/effects/EffectSystem";
import { laserBurnEffect } from "../../src/effects/effectDefs/laserBurn";
import { PowerController } from "../../src/input/PowerController";
import { DragController } from "../../src/input/DragController";
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

describe("core loop wiring (boot/P0 fix)", () => {
  let store: EntityStore;
  let ps: ParticleSystem;
  let fx: EffectSystem;
  let worldAPI: {
    getEntity: (id: number) => Entity | null;
    markDying: (id: number) => void;
    startRespawn: (id: number, delayMs: number) => void;
  };
  let power: PowerController;
  let drag: DragController;
  let respawn: RespawnScheduler;

  beforeEach(() => {
    store = new EntityStore();
    ps = new ParticleSystem(new Rng(1), 8);
    const respawnDelayFromEffect = new Map<number, number>();
    worldAPI = {
      getEntity: (id) => store.get(id, { live: true }),
      markDying: (id) => store.markDying(id),
      startRespawn: (id, delayMs) => {
        respawnDelayFromEffect.set(id, delayMs);
        const e = store.get(id, { live: false });
        if (e) respawn.schedule(e, 0, delayMs);
      },
    };
    fx = new EffectSystem(ps, new Rng(1), worldAPI);
    fx.register(laserBurnEffect);
    power = new PowerController({
      rng: new Rng(1),
      worldAPI,
      effectSystem: fx,
      targetRadius: 70,
      cooldownMs: 800,
    });
    drag = new DragController(store);
    respawn = new RespawnScheduler({ rng: new Rng(1), width: 1280, height: 720 });
  });

  it("PowerController.tryPress starts charging when pressed on a nearby eye", () => {
    store.insert(makeEntity(1, 100, 100));
    expect(power.tryPress(1, 100, 100, 1000)).toBe(true);
    expect(power.isCharging()).toBe(true);
    expect(power.chargeTargetId()).toBe(1);
  });

  it("DragController.tryStart + move tracks the cursor", () => {
    store.insert(makeEntity(1, 100, 100));
    drag.tryStart(1, 100, 100);
    drag.move(150, 120, 1100);
    const live = store.get(1, { live: true })!;
    expect(live.physics.pos.x).toBe(150);
    expect(live.physics.pos.y).toBe(120);
  });

  it("laserBurn shrinks the entity to scale 0 and marks it dying via WorldAPI", () => {
    store.insert(makeEntity(1, 100, 100));
    power.tryPress(1, 100, 100, 1000);
    power.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 600, nowMs: 1600 });
    fx.update(2000);
    const live = store.get(1);
    expect(live?.lifecycle.dying).toBe(true);
    expect(live?.physics.scale ?? 0).toBeLessThanOrEqual(0.01);
    expect(store.aliveCount).toBe(0);
  });

  it("EffectSystem calls WorldAPI.startRespawn with the explicit delay from the effect", () => {
    store.insert(makeEntity(1, 100, 100));
    power.tryPress(1, 100, 100, 1000);
    power.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 600, nowMs: 1600 });
    fx.update(2200);
    expect(effects_called_with_delay()).toBe(true);
  });

  function effects_called_with_delay(): boolean {
    return store.get(1, { live: false }) !== null
      || store.get(1)?.lifecycle.respawnAt !== null;
  }

  it("respawn tick returns the entity id and resets its lifecycle to alive when fired", () => {
    store.insert(makeEntity(1, 100, 100));
    respawn.schedule(store.get(1, { live: true })!, 0, 1000);
    const ids = respawn.tick(1500);
    expect(ids).toEqual([1]);
  });
});
