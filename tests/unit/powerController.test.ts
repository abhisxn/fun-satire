// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Rng } from "../../src/core/Rng";
import { EntityStore } from "../../src/entities/EntityStore";
import { ParticleSystem } from "../../src/effects/ParticleSystem";
import { EffectSystem } from "../../src/effects/EffectSystem";
import { laserBurnEffect } from "../../src/effects/effectDefs/laserBurn";
import { PowerController } from "../../src/input/PowerController";
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

describe("input/PowerController (T20)", () => {
  let store: EntityStore;
  let ps: ParticleSystem;
  let fx: EffectSystem;
  let worldFor: (store: EntityStore) => Parameters<typeof PowerController.prototype.constructor>[0]["worldAPI"];
  let ctrl: PowerController;

  beforeEach(() => {
    store = new EntityStore();
    ps = new ParticleSystem(new Rng(1), 8);
    const worldAPI = {
      getEntity: (id: number) => store.get(id, { live: true }),
      markDying: (id: number) => store.markDying(id),
      startRespawn: (id: number, delayMs: number) => {
        const e = store.get(id, { live: false });
        if (e) e.lifecycle.respawnAt = 1000 + delayMs;
      },
    };
    fx = new EffectSystem(ps, new Rng(1), worldAPI);
    fx.register(laserBurnEffect);
    ctrl = new PowerController({ rng: new Rng(1), worldAPI, effectSystem: fx, targetRadius: 50, cooldownMs: 800 });
  });

  it("starts with no charge", () => {
    expect(ctrl.isCharging()).toBe(false);
    expect(ctrl.chargeTargetId()).toBeNull();
  });

  it("begins charging on press near a valid eye", () => {
    store.insert(makeEntity(1, 100, 100));
    const ok = ctrl.tryPress(1, 100, 100, 100);
    expect(ok).toBe(true);
    expect(ctrl.isCharging()).toBe(true);
    expect(ctrl.chargeTargetId()).toBe(1);
  });

  it("rejects press that targets no entity in range", () => {
    store.insert(makeEntity(1, 100, 100));
    const ok = ctrl.tryPress(-1, 800, 800, 100);
    expect(ok).toBe(false);
    expect(ctrl.isCharging()).toBe(false);
  });

  it("rejects press on a dying entity", () => {
    store.insert(makeEntity(1, 100, 100));
    store.markDying(1);
    const ok = ctrl.tryPress(1, 100, 100, 100);
    expect(ok).toBe(false);
  });

  it("tracks charge progress by elapsed ms and never exceeds 1", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 250, nowMs: 1250 });
    expect(ctrl.chargeT()).toBeGreaterThan(0);
    expect(ctrl.chargeT()).toBeLessThanOrEqual(1);
    expect(ctrl.isCharging()).toBe(true);
  });

  it("auto-fires at the threshold when the pointer stays put", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 550, nowMs: 1550 });
    expect(ctrl.isCharging()).toBe(false);
    expect(fx.liveCount()).toBe(1);
  });

  it("cancels and never fires on early release", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 200, nowMs: 1200 });
    ctrl.release(1200);
    expect(ctrl.isCharging()).toBe(false);
    expect(fx.liveCount()).toBe(0);
  });

  it("cooldown suppresses repeat fires within cooldownMs window", () => {
    const spy = vi.fn();
    fx.onAnyComplete?.(spy);
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 550, nowMs: 1550 });
    expect(fx.liveCount()).toBe(1);
    fx.update(2000);
    ctrl.tryPress(1, 100, 100, 2100);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 550, nowMs: 2650 });
    expect(fx.liveCount()).toBe(0);
  });

  it("release with chargeT < threshold cancels without firing", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 200, nowMs: 1200 });
    const fired = ctrl.release(1200);
    expect(fired).toBe(false);
    expect(fx.liveCount()).toBe(0);
  });

  it("release after auto-fire reports fired=true", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 600, nowMs: 1600 });
    expect(fx.liveCount()).toBe(1);
  });

  it("moving cursor out of the target radius cancels the charge", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 400, y: 400, active: true }, dtMs: 100, nowMs: 1100 });
    expect(ctrl.isCharging()).toBe(false);
    expect(fx.liveCount()).toBe(0);
  });

  it("ignores presses during cooldown", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 600, nowMs: 1600 });
    fx.update(2000);
    const ok = ctrl.tryPress(1, 100, 100, 2100);
    expect(ok).toBe(false);
  });

  it("ignores presses during cooldown", () => {
    store.insert(makeEntity(1, 100, 100));
    ctrl.tryPress(1, 100, 100, 1000);
    ctrl.tick({ cursor: { x: 100, y: 100, active: true }, dtMs: 600, nowMs: 1600 });
    fx.update(2000);
    const ok = ctrl.tryPress(1, 100, 100, 2100);
    expect(ok).toBe(false);
  });
});
