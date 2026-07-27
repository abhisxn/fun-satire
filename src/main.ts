import "@fontsource-variable/fraunces/standard-italic.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/barriecito/400.css";
import "@fontsource/nabla/400.css";
import "@fontsource/bungee-tint/400.css";
import "@fontsource/unbounded/400.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/tektur/400.css";
import "@fontsource/tektur/700.css";
import "@fontsource/orbitron/400.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/syne-mono/400.css";
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/doto/400.css";
import "@fontsource/doto/700.css";
import "./styles/global.css";
import "./hud/hud.css";
import "./hud/audioControl.css";
import "./hud/subjectDrawer.css";
import "./audio/cues/hudCues";
import "./audio/cues/chargeRespawnCues";
import "./audio/cues/laserBurnCues";
import "./audio/cues/electricBurnCues";
import "./audio/cues/bugEatCues";

import { Engine } from "./core/Engine";
import { Rng } from "./core/Rng";
import { EntityStore } from "./entities/EntityStore";
import { spawnEyes, spawnSubject, spawnOneCrowdMember, pickCrowdMemberToDespawn } from "./entities/EntityFactory";
import { StateMachine, EyeBehavior, EyeBlinkTimer } from "./entities/behaviors";
import { stepSubjectPhysics } from "./entities/behaviors/SubjectBehavior";
import { loadManifestFromText } from "./content/manifestLoader";
import type { EyeManifestEntry, SubjectManifestEntry, SubjectColors } from "./content/schema";
import eyesRoster from "./content/manifests/eyes.roster.json";
import subjectRoster from "./content/manifests/subject.roster.json";
import { PointerTracker } from "./input/PointerTracker";
import { DragController } from "./input/DragController";
import { PowerController } from "./input/PowerController";
import { ParticleSystem } from "./effects/ParticleSystem";
import { EffectSystem, EASE_PROTEST } from "./effects/EffectSystem";
import { RespawnScheduler } from "./effects/RespawnScheduler";
import { laserBurnEffect } from "./effects/effectDefs/laserBurn";
import { electricBurnEffect } from "./effects/effectDefs/electricBurn";
import { bugEatEffect } from "./effects/effectDefs/bugEat";
import { Hud } from "./hud/Hud";
import { createViewport } from "./render/CanvasUtils";
import { renderFrame } from "./render/Renderer";
import { getImageAssetCache } from "./render/imageAssets";
import { AVATAR_ASSET_REGISTRY } from "./hud/avatarAssetRegistry";
import * as FF from "./physics/ForceField";
import { compute as computeSpring } from "./physics/SpringHome";
import { integrate } from "./physics/Integrator";
import { DURATION } from "./config/tokens";
import { MODE_POWER_MAP, type HudMode } from "./hud/hudIcons";
import type { SubjectSkin } from "./hud/subjectSkinRegistry";
import { computeLookAtRotation } from "./physics/LookAt";
import { accumulateSeparation } from "./physics/ForceField";
import type { Entity, EntityId } from "./entities/Entity";
import { AudioEngine } from "./audio/AudioEngine";
import { AudioControl } from "./hud/AudioControl";
import { startAmbientForMode, startTenseFiller } from "./audio/ambientBeds";
import { startMusicBed } from "./audio/musicBed";

type LifecycleState = "alive" | "dying";
type LocomotionState = "idle" | "flee" | "dragged";
type LifecycleEvent = "die" | "respawn";
type LocomotionEvent = "drag" | "release";

/**
 * Finds the nearest live "eye" entity to `point` within `maxRange`,
 * explicitly ignoring the Subject entity (Subject is not eye-targetable —
 * it has its own charge/burn path via press()).
 */
export function queryNearestEye(
  store: EntityStore,
  point: { x: number; y: number },
  maxRange: number,
): Entity | null {
  let best: Entity | null = null;
  let bestDistSq = maxRange * maxRange;
  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    const dx = e.physics.pos.x - point.x;
    const dy = e.physics.pos.y - point.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      best = e;
    }
  });
  return best;
}

/** Pure decision: should a new Subject be spawned this tick? */
export function shouldSpawnSubject(input: {
  subjectId: EntityId | null;
  subjectRespawnAtMs: number | null;
  nowMs: number;
  cursorActive: boolean;
}): boolean {
  if (input.subjectId !== null) return false;
  if (input.subjectRespawnAtMs === null) return false;
  if (!input.cursorActive) return false;
  return input.nowMs >= input.subjectRespawnAtMs;
}

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
const imageAssets = getImageAssetCache();
imageAssets.preload(AVATAR_ASSET_REGISTRY.map((e) => e.url));

const hud = new Hud(hudRoot, stage);
hud.setMode("eyes");
hud.setPower("laserBurn");

const audioEngine = new AudioEngine(new AudioContext());
new AudioControl(document.body, audioEngine);

let currentMode: HudMode = "eyes";
let repelMultiplier = 1;
let activeSubjectSkin: SubjectSkin = { kind: "illustrated", id: "figure" };

hud.onModeChange((mode) => {
  const power = MODE_POWER_MAP[mode];
  powerCtrl.setPower(power);
  hud.setPower(power);
  currentMode = mode;
  startAmbientForMode(audioEngine, mode);
});

hud.onSubjectSkinChange((skin) => {
  activeSubjectSkin = skin;
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    (subj.behavior.data as Record<string, unknown>).subjectSkin = skin;
  }
  hud.setActiveSubjectSkin(skin);
});

hud.onSubjectResize((scale) => {
  if (activeSubjectSkin.kind !== "text") return;
  activeSubjectSkin = { ...activeSubjectSkin, scale };
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    (subj.behavior.data as Record<string, unknown>).subjectSkin = activeSubjectSkin;
  }
});

hud.onSubjectFontChange((fontId) => {
  if (activeSubjectSkin.kind !== "text") return;
  activeSubjectSkin = { ...activeSubjectSkin, fontId };
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    (subj.behavior.data as Record<string, unknown>).subjectSkin = activeSubjectSkin;
  }
});

hud.onSubjectAlignChange((align) => {
  if (activeSubjectSkin.kind !== "text") return;
  activeSubjectSkin = { ...activeSubjectSkin, align };
  const subj = subjectId !== null ? store.get(subjectId, { live: true }) : null;
  if (subj) {
    (subj.behavior.data as Record<string, unknown>).subjectSkin = activeSubjectSkin;
  }
});

hud.onQuantityChange((quantity) => {
  let eyeCount = 0;
  store.forEachAlive((e) => { if (e.content.renderType === "eye") eyeCount++; });
  const delta = quantity - eyeCount;
  if (delta > 0) {
    const existing: Entity[] = [];
    store.forEachAlive((e) => { if (e.content.renderType === "eye") existing.push(e); });
    for (let i = 0; i < delta; i++) {
      const entity = spawnOneCrowdMember({
        rng,
        width: viewport.state.width,
        height: viewport.state.height,
        manifest: manifest.entries.filter((e): e is EyeManifestEntry => e.rig === "eye"),
        existing,
        nextId: nextEntityId++,
      });
      if (entity) {
        store.insert(entity);
        installBehavior(entity);
        existing.push(entity);
      }
    }
  } else if (delta < 0) {
    for (let i = 0; i < -delta; i++) {
      const alive: Entity[] = [];
      store.forEachAlive((e) => { if (e.content.renderType === "eye") alive.push(e); });
      const toRemove = pickCrowdMemberToDespawn(alive);
      if (toRemove) {
        behaviors.delete(toRemove.id);
        blinkTimers.delete(toRemove.id);
        pupilOffsets.delete(toRemove.id);
        store.remove(toRemove.id);
      }
    }
  }
});

hud.onRepelChange((multiplier) => {
  repelMultiplier = multiplier;
});

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
    if (shouldSpawnSubject({ subjectId, subjectRespawnAtMs, nowMs, cursorActive: engine.cursor().active })) {
      const cur = engine.cursor();
      spawnSubjectAt({ x: cur.x, y: cur.y }, nowMs);
      subjectRespawnAtMs = null;
    }
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
      ? queryNearestEye(store, { x: cursor.x, y: cursor.y }, 70)
      : null;
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const subjEntity = subjectId !== null ? store.get(subjectId, { live: true }) : null;
    const subjectRenderInfo = subjEntity
      ? {
          id: subjEntity.id,
          pos: subjEntity.physics.pos,
          sizePx: (subjEntity.behavior.data as { baseSizePx: number }).baseSizePx,
          colors: (subjEntity.behavior.data as { colors: SubjectColors }).colors,
          scale: subjEntity.physics.scale,
          subjectSkin: (subjEntity.behavior.data as { subjectSkin?: SubjectSkin }).subjectSkin,
        }
      : null;
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
      hudMode: currentMode,
      quantity: (() => { let n = 0; store.forEachAlive((e) => { if (e.content.renderType === "eye") n++; }); return n; })(),
      repelMultiplier,
      subject: subjectRenderInfo,
      chargeT: ringT,
      assistRadiusPx: SUBJECT_ASSIST_RADIUS_PX,
      imageCache: imageAssets,
    });
    void inCooldown;
  }
});

const behaviors = new Map<EntityId, EyeBehavior>();
const blinkTimers = new Map<EntityId, EyeBlinkTimer>();
const pupilOffsets = new Map<EntityId, { x: number; y: number }>();

const subjectManifest = loadManifestFromText(JSON.stringify(subjectRoster));
let subjectId: EntityId | null = null;
let subjectSpawnedAtMs = 0;
let subjectRespawnAtMs: number | null = null;
let nextEntityId = 1;
const SUBJECT_ASSIST_RADIUS_PX = 140;

const spawnSubjectAt = (pos: { x: number; y: number }, nowMs: number): void => {
  const entity = spawnSubject({
    manifest: subjectManifest.entries.filter((e): e is SubjectManifestEntry => e.rig === "subject"),
    cursor: pos,
    nextId: nextEntityId++,
  });
  if (!entity) return;
  store.insert(entity);
  subjectId = entity.id;
  subjectSpawnedAtMs = nowMs;
  (entity.behavior.data as Record<string, unknown>).subjectSkin = activeSubjectSkin;
};

const worldAPI = {
  getEntity: (id: EntityId) => store.get(id, { live: true }),
  markDying: (id: EntityId) => {
    store.markDying(id);
  },
  startRespawn: (id: EntityId, delayMs: number) => {
    const e = store.get(id, { live: false });
    if (!e) return;
    if (e.content.renderType === "subject") {
      store.remove(id);
      if (subjectId === id) subjectId = null;
      subjectRespawnAtMs = engine.getNow() + delayMs;
      return;
    }
    respawn.schedule(e, engine.getNow(), delayMs);
  },
};

const effects = new EffectSystem(particles, rng, worldAPI, audioEngine);
effects.register(laserBurnEffect);
effects.register(electricBurnEffect);
effects.register(bugEatEffect);

const respawn = new RespawnScheduler({ rng, width: viewport.state.width, height: viewport.state.height });

const spawnInitialEyes = (): void => {
  const { entities } = spawnEyes({
    rng,
    width: viewport.state.width,
    height: viewport.state.height,
    manifest: manifest.entries.filter((e): e is EyeManifestEntry => e.rig === "eye"),
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

const SUBJECT_DRAG_DEADZONE_PX = 12;
let subjectPressOrigin: { x: number; y: number } | null = null;

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
    if (subjectId !== null) {
      powerCtrl.tryPress(subjectId, cur.x, cur.y, engine.getNow());
      subjectPressOrigin = { x: cur.x, y: cur.y };
    }
    const eyeTarget = queryNearestEye(store, { x: cur.x, y: cur.y }, 70);
    if (eyeTarget) {
      dragCtrl.tryStart(eyeTarget.id, cur.x, cur.y);
    }
  },
  release() {
    const now = engine.getNow();
    powerCtrl.release(now);
    dragCtrl.release(now);
    subjectPressOrigin = null;
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

  if (
    subjectId !== null &&
    subjectPressOrigin &&
    powerCtrl.isCharging() &&
    powerCtrl.chargeTargetId() === subjectId
  ) {
    const dx = cursor.x - subjectPressOrigin.x;
    const dy = cursor.y - subjectPressOrigin.y;
    if (dx * dx + dy * dy > SUBJECT_DRAG_DEADZONE_PX * SUBJECT_DRAG_DEADZONE_PX) {
      powerCtrl.cancel();
      dragCtrl.tryStart(subjectId, cursor.x, cursor.y);
      subjectPressOrigin = null;
    }
  }

  // No-overlap separation (computed before integration so it feeds into acceleration)
  const crowdMembers: Array<{ id: number; pos: { x: number; y: number }; radiusPx: number }> = [];
  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    if (e.lifecycle.dragged) return;
    const baseSizePx = (e.behavior.data as Record<string, unknown>).baseSizePx as number ?? 56;
    crowdMembers.push({
      id: e.id,
      pos: e.physics.pos,
      radiusPx: baseSizePx * e.physics.scale * 0.5,
    });
  });
  const separationForces = accumulateSeparation(crowdMembers);

  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    if (e.lifecycle.dragged) return;
    const force = FF.compute({ cursor, entityPos: e.physics.pos, repelMultiplier });
    const spring = computeSpring({
      pos: e.physics.pos,
      vel: e.physics.vel,
      home: e.physics.home,
      dtSeconds: dtSec,
    });
    const sep = separationForces.get(e.id);
    const sepAx = sep ? sep.fx : 0;
    const sepAy = sep ? sep.fy : 0;
    const next = integrate({
      pos: e.physics.pos,
      vel: e.physics.vel,
      acc: { x: force.fx + spring.ax + sepAx, y: force.fy + spring.ay + sepAy },
      dtSeconds: dtSec,
      maxSpeed: 600,
    });
    e.physics.pos = next.pos;
    e.physics.vel = next.vel;
  });

  if (subjectId !== null && cursor.active) {
    const subj = store.get(subjectId, { live: true });
    if (subj && !subj.lifecycle.dragged) {
      stepSubjectPhysics(subj.physics, cursor, dtSec);
      if (subj.physics.scale < 1) {
        const elapsed = engine.getNow() - subjectSpawnedAtMs;
        subj.physics.scale = EASE_PROTEST(Math.min(1, elapsed / DURATION.slow));
      }
    }
  }

  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    const beh = behaviors.get(e.id);
    if (beh) beh.tick(rng, engine.getNow());
  });

  // Look-at rotation: eyes rotate toward subject
  if (subjectId !== null) {
    const subj = store.get(subjectId, { live: true });
    if (subj) {
      store.forEachAlive((e) => {
        if (e.content.renderType !== "eye") return;
        e.physics.rotation = computeLookAtRotation(e.physics.pos, subj.physics.pos, currentMode);
      });
    }
  } else {
    store.forEachAlive((e) => {
      if (e.content.renderType !== "eye") return;
      e.physics.rotation = 0;
    });
  }
});

viewport.onChange((s) => {
  respawn.setSize(s.width, s.height);
});

spawnInitialEyes();
nextEntityId = Math.max(0, ...store.ids()) + 1;
subjectRespawnAtMs = engine.getNow();
pointer.attach();
engine.start();

const unlockAudio = (): void => {
  audioEngine.unlock();
  void startMusicBed(audioEngine, "/audio/music-bed.mp3");
  startTenseFiller(audioEngine);
  startAmbientForMode(audioEngine, currentMode);
};
document.addEventListener("pointerdown", unlockAudio, { once: true });
