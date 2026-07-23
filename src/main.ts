import "@fontsource-variable/fraunces/standard-italic.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./styles/global.css";
import "./hud/hud.css";

import { Engine } from "./core/Engine";
import { Rng } from "./core/Rng";
import { EntityStore } from "./entities/EntityStore";
import { spawnEyes } from "./entities/EntityFactory";
import { StateMachine, EyeBehavior, EyeBlinkTimer } from "./entities/behaviors";
import { loadManifestFromText } from "./content/manifestLoader";
import eyesRoster from "./content/manifests/eyes.roster.json";
import { PointerTracker } from "./input/PointerTracker";
import { DragController } from "./input/DragController";
import { PowerController } from "./input/PowerController";
import { ParticleSystem } from "./effects/ParticleSystem";
import { EffectSystem } from "./effects/EffectSystem";
import { RespawnScheduler } from "./effects/RespawnScheduler";
import { laserBurnEffect } from "./effects/effectDefs/laserBurn";
import { Hud } from "./hud/Hud";
import { createViewport } from "./render/CanvasUtils";
import { renderFrame } from "./render/Renderer";
import * as FF from "./physics/ForceField";
import { compute as computeSpring } from "./physics/SpringHome";
import { integrate } from "./physics/Integrator";
import type { Entity, EntityId } from "./entities/Entity";

type LifecycleState = "alive" | "dying";
type LocomotionState = "idle" | "flee" | "dragged";
type LifecycleEvent = "die" | "respawn";
type LocomotionEvent = "drag" | "release";

const stage = document.querySelector<HTMLCanvasElement>("#stage");
const hudRoot = document.querySelector<HTMLElement>("#hud-root");

if (!stage || !hudRoot) {
  throw new Error("Fun Satire: missing #stage canvas or #hud-root container.");
}
stage.dataset.layer = "canvas";
stage.style.zIndex = "var(--z-canvas)";

const ctx = stage.getContext("2d");
if (!ctx) throw new Error("Fun Satire: 2D canvas context unavailable.");

const grain = document.createElement("div");
grain.id = "grain-layer";
grain.dataset.layer = "grain";
grain.setAttribute("aria-hidden", "true");
document.body.appendChild(grain);
hudRoot.dataset.layer = "hud";
hudRoot.style.zIndex = "var(--z-hud)";

const params = new URLSearchParams(window.location.search);
const seedParam = params.get("seed");
const seed = seedParam && Number.isFinite(Number.parseInt(seedParam, 10))
  ? Number.parseInt(seedParam, 10)
  : (Date.now() & 0xFFFFFFFF) >>> 0;

const rng = new Rng(seed);
const store = new EntityStore();
const manifest = loadManifestFromText(JSON.stringify(eyesRoster));
const particles = new ParticleSystem(rng, 256);
const viewport = createViewport(stage);

const hud = new Hud(hudRoot);
hud.setMode("eyes");
hud.setPower("laserBurn");

const engine = new Engine();
engine.events.on("tick", ({ phase, dt }) => {
  const nowMs = engine.getNow();
  if (phase === "pre-physics") {
    powerCtrl.tick({ cursor: engine.cursor(), dtMs: dt, nowMs });
    effects.update(nowMs);
    particles.update(dt);
    particles.cull();
    return;
  }
  if (phase === "post-physics") {
    const respawned = respawn.tick(nowMs);
    for (const id of respawned) respawnEntity(id);
    return;
  }
  if (phase === "render") {
    const cursor = engine.cursor();
    const ringT = Math.max(0, Math.min(1, powerCtrl.chargeT()));
    const inCooldown = effects.liveCount() > 0;
    hud.setCharge(ringT, powerCtrl.isCharging());
    const cursorRingRadius = 12 + ringT * 14;
    const cursorRingOpacity = cursor.active ? 1 - ringT * 0.85 : 0;
    const hoverEntity = cursor.active
      ? store.queryNearest({ x: cursor.x, y: cursor.y }, 70)
      : null;
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderFrame({
      ctx,
      store,
      particles,
      effects,
      cursor,
      rng,
      width: viewport.state.width,
      height: viewport.state.height,
      behaviors,
      blinkTimers,
      pupilOffsets,
      cursorRingRadius,
      cursorRingOpacity,
      chargeTargetId: powerCtrl.chargeTargetId(),
      hoverEntityId: hoverEntity?.id ?? null,
      reducedMotion,
      nowMs: engine.getNow(),
    });
    void inCooldown;
  }
});

const behaviors = new Map<EntityId, EyeBehavior>();
const blinkTimers = new Map<EntityId, EyeBlinkTimer>();
const pupilOffsets = new Map<EntityId, { x: number; y: number }>();

const worldAPI = {
  getEntity: (id: EntityId) => store.get(id, { live: true }),
  markDying: (id: EntityId) => {
    store.markDying(id);
  },
  startRespawn: (id: EntityId, delayMs: number) => {
    const e = store.get(id, { live: false });
    if (e) respawn.schedule(e, engine.getNow(), delayMs);
  },
};

const effects = new EffectSystem(particles, rng, worldAPI);
effects.register(laserBurnEffect);

const respawn = new RespawnScheduler({ rng, width: viewport.state.width, height: viewport.state.height });

const spawnInitialEyes = (): void => {
  const { entities } = spawnEyes({
    rng,
    width: viewport.state.width,
    height: viewport.state.height,
    manifest: manifest.entries,
  });
  for (const e of entities) {
    store.insert(e);
    installBehavior(e);
  }
};

const installBehavior = (e: Entity): void => {
  const data = e.behavior.data as Record<string, unknown>;
  const cfg = {
    blinkIntervalMinMs: data.blinkIntervalMinMs as number,
    blinkIntervalMaxMs: data.blinkIntervalMaxMs as number,
    blinkDurationMs: data.blinkDurationMs as number,
  };
  const lifecycle = new StateMachine<LifecycleState, LifecycleEvent>({
    initial: "alive",
    transitions: [
      ["alive", "die", "dying"],
      ["dying", "respawn", "alive"],
    ],
  });
  const locomotion = new StateMachine<LocomotionState, LocomotionEvent>({
    initial: "idle",
    transitions: [
      ["idle", "drag", "dragged"],
      ["dragged", "release", "idle"],
    ],
  });
  const blinkTimer = new EyeBlinkTimer(rng, cfg, engine.getNow());
  const beh = new EyeBehavior(rng, cfg, lifecycle, locomotion, engine.getNow());
  blinkTimers.set(e.id, blinkTimer);
  behaviors.set(e.id, beh);
};

const respawnEntity = (id: EntityId): void => {
  const entity = store.get(id, { live: true });
  if (!entity) return;
  const pos = respawn.samplePos();
  entity.physics.pos = pos;
  entity.physics.home = { ...pos };
  entity.physics.scale = 1;
  entity.physics.vel = { x: 0, y: 0 };
  entity.lifecycle.alive = true;
  entity.lifecycle.dying = false;
  entity.lifecycle.dragged = false;
  entity.lifecycle.respawnAt = null;
  pupilOffsets.set(id, { x: 0, y: 0 });
};

const powerCtrl = new PowerController({ rng, worldAPI, effectSystem: effects, targetRadius: 70, cooldownMs: 800 });

const dragCtrl = new DragController(store);

const pointer: PointerTracker = new PointerTracker(stage, {
  setCursor(x: number, y: number) {
    engine.setCursor(x, y);
  },
  clearCursor() {
    engine.clearCursor();
  },
  press() {
    const cur = engine.cursor();
    if (!cur.active) return;
    const target = store.queryNearest({ x: cur.x, y: cur.y }, 70);
    if (target) {
      powerCtrl.tryPress(target.id, cur.x, cur.y, engine.getNow());
      dragCtrl.tryStart(target.id, cur.x, cur.y);
    }
  },
  release() {
    const now = engine.getNow();
    powerCtrl.release(now);
    dragCtrl.release(now);
  },
});

engine.onTick("pre-physics", () => {
  const cur = engine.cursor();
  if (dragCtrl.draggedId() !== null) {
    dragCtrl.move(cur.x, cur.y, engine.getNow());
  }
});

engine.onTick("pre-physics", (dt) => {
  const dtSec = Math.min(0.1, dt / 1000);
  const cursor = engine.cursor();
  store.forEachAlive((e) => {
    if (e.lifecycle.dragged) return;
    const force = FF.compute({ cursor, entityPos: e.physics.pos });
    const spring = computeSpring({
      pos: e.physics.pos,
      vel: e.physics.vel,
      home: e.physics.home,
      dtSeconds: dtSec,
    });
    const next = integrate({
      pos: e.physics.pos,
      vel: e.physics.vel,
      acc: { x: force.fx + spring.ax, y: force.fy + spring.ay },
      dtSeconds: dtSec,
      maxSpeed: 600,
    });
    e.physics.pos = next.pos;
    e.physics.vel = next.vel;
  });
  store.forEachAlive((e) => {
    const beh = behaviors.get(e.id);
    if (beh) beh.tick(rng, engine.getNow());
  });
});

viewport.onChange((s) => {
  respawn.setSize(s.width, s.height);
});

spawnInitialEyes();
pointer.attach();
engine.start();
