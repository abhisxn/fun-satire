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
import "./audio/cues/hudCues";
import "./audio/cues/chargeRespawnCues";
import "./audio/cues/laserBurnCues";
import "./audio/cues/electricBurnCues";
import "./audio/cues/bugEatCues";

import { Engine } from "./core/Engine";
import { Rng } from "./core/Rng";
import { EntityStore } from "./entities/EntityStore";
import { spawnEyes, spawnOneCrowdMember, pickCrowdMemberToDespawn, spawnSubject } from "./entities/EntityFactory";
import { StateMachine, EyeBehavior, EyeBlinkTimer } from "./entities/behaviors";
import { loadManifestFromText } from "./content/manifestLoader";
import type { EyeManifestEntry, SubjectManifestEntry } from "./content/schema";
import eyesRoster from "./content/manifests/eyes.roster.json";
import subjectRoster from "./content/manifests/subject.roster.json";
import { PointerTracker } from "./input/PointerTracker";
import { DragController } from "./input/DragController";
import { PowerController } from "./input/PowerController";
import type { SubjectDropResult } from "./input/SubjectDragSource";
import { ParticleSystem } from "./effects/ParticleSystem";
import { EffectSystem } from "./effects/EffectSystem";
import { RespawnScheduler } from "./effects/RespawnScheduler";
import { laserBurnEffect } from "./effects/effectDefs/laserBurn";
import { electricBurnEffect } from "./effects/effectDefs/electricBurn";
import { bugEatEffect } from "./effects/effectDefs/bugEat";
import { Hud } from "./hud/Hud";
import { createViewport } from "./render/CanvasUtils";
import { getImageAssetCache } from "./render/imageAssets";
import { AVATAR_ASSET_REGISTRY } from "./hud/avatarAssetRegistry";
import { BUG_DRAW } from "./render/drawers/drawBug";
import { FINGER_DRAW } from "./render/drawers/drawPointedFinger";
import * as FF from "./physics/ForceField";
import { compute as computeSpring } from "./physics/SpringHome";
import { integrate } from "./physics/Integrator";
import { MODE_POWER_MAP, type HudMode } from "./hud/hudIcons";
import type { SubjectSkin } from "./hud/subjectSkinRegistry";
import { computeLookAtRotation } from "./physics/LookAt";
import { accumulateSeparation } from "./physics/ForceField";
import type { Entity, EntityId } from "./entities/Entity";
import { AudioEngine } from "./audio/AudioEngine";
import { AudioControl } from "./hud/AudioControl";
import { startAmbientForMode, startTenseFiller } from "./audio/ambientBeds";
import { startMusicBed } from "./audio/musicBed";
import { startAmbientBedTrack } from "./audio/ambientBedTrack";
import { readVisualFixture, completeVisualFixtureBoot, collectVisibleFixtureResourceUrls, installVisualFixtureDocumentState } from "./testing/visualFixture";
import { materializeEyesAttackFixture, applyEyesFixtureState } from "./testing/eyesFixtures";

type LifecycleState = "alive" | "dying";
type LocomotionState = "idle" | "flee" | "dragged";
type LifecycleEvent = "die" | "respawn";
type LocomotionEvent = "drag" | "release";

export type SubjectRecord = {
  id: EntityId;
  skin: SubjectSkin;
  spawnedAtMs: number;
  locked: boolean;
};

const subjects: Map<EntityId, SubjectRecord> = new Map();
let lockedSubjectId: EntityId | null = null;

export function spawnSubjectForCollection(input: {
  id: EntityId;
  skin: SubjectSkin;
  nowMs: number;
}): SubjectRecord {
  const record: SubjectRecord = {
    id: input.id,
    skin: input.skin,
    spawnedAtMs: input.nowMs,
    locked: false,
  };
  subjects.set(input.id, record);
  return record;
}

export function removeSubjectFromCollection(id: EntityId): boolean {
  const had = subjects.delete(id);
  if (lockedSubjectId === id) lockedSubjectId = null;
  return had;
}

export function getSubjectRecord(id: EntityId): SubjectRecord | undefined {
  return subjects.get(id);
}

export function listSubjectRecords(): Map<EntityId, SubjectRecord> {
  return subjects;
}

export function lockSubject(id: EntityId): void {
  if (!subjects.has(id)) return;
  const prev = lockedSubjectId;
  if (prev !== null && prev !== id) {
    const prevRec = subjects.get(prev);
    if (prevRec) prevRec.locked = false;
  }
  lockedSubjectId = id;
  const rec = subjects.get(id);
  if (rec) rec.locked = true;
}

export function unlockSubject(): void {
  if (lockedSubjectId === null) return;
  const rec = subjects.get(lockedSubjectId);
  if (rec) rec.locked = false;
  lockedSubjectId = null;
}

export function getLockedSubjectId(): EntityId | null {
  return lockedSubjectId;
}

export function clearLockedSubjectIf(predicate: (id: EntityId) => boolean): void {
  if (lockedSubjectId !== null && predicate(lockedSubjectId)) {
    unlockSubject();
  }
}

export function __resetSubjectCollectionForTests(): void {
  subjects.clear();
  lockedSubjectId = null;
}

export type ApplySubjectDropInput = {
  skin: SubjectSkin;
  canvasPos: { x: number; y: number } | null;
  nowMs: number;
};

/**
 * Handles a drag/tap drop from the subject drawer. Spawns a new subject
 * into the EntityStore + subjects Map at `canvasPos`. A null `canvasPos`
 * (drop outside canvas, or touch tap on the card) is a no-op per Gate 2
 * Option A (touch tap → spawn at center; drop outside → ignore).
 */
export function applySubjectDrop(input: ApplySubjectDropInput): EntityId | null {
  if (input.canvasPos === null) return null;
  const pos = input.canvasPos;
  const cursor = { x: pos.x, y: pos.y };
  const entity = spawnSubject({
    manifest: subjectManifestEntries,
    cursor,
    nextId: nextEntityId,
    skin: input.skin,
  });
  if (!entity) return null;
  nextEntityId += 1;
  store.insert(entity);
  spawnSubjectForCollection({ id: entity.id, skin: input.skin, nowMs: input.nowMs });
  return entity.id;
}

/**
 * Handles a canvas press. If a subject entity is under the cursor, toggles
 * the lock on that subject. If no subject is under the cursor, the existing
 * lock is preserved (so eyes/empty-press don't accidentally unlock).
 */
export function applyCanvasPress(_x: number, _y: number, hitSubjectId: EntityId | null): void {
  if (hitSubjectId === null) return;
  if (lockedSubjectId === hitSubjectId) {
    unlockSubject();
    hud.setCurrentSubjectId(null);
    hud.setLockedSubjectId(null);
    return;
  }
  lockSubject(hitSubjectId);
  hud.setCurrentSubjectId(hitSubjectId);
  const rec = subjects.get(hitSubjectId);
  if (rec) {
    hud.setActiveSubjectSkin(hitSubjectId, rec.skin);
    hud.setLockedSubjectId(hitSubjectId);
  }
}

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

/**
 * Update a single subject's skin formatting (font, scale, align) by entity id.
 * No-op if the subject is unknown or its skin is not a text skin. The behavior
 * data on the live entity is updated in lockstep with the `subjects` Map so
 * the renderer sees the change on the next frame.
 */
export function applySubjectSkinPatch(
  id: EntityId,
  patch: { fontId?: string; scale?: number; align?: "left" | "center" | "right" },
): void {
  const rec = subjects.get(id);
  if (!rec || rec.skin.kind !== "text") return;
  const next: SubjectSkin = { ...rec.skin, ...patch };
  rec.skin = next;
  const e = store.get(id, { live: true });
  if (e) (e.behavior.data as Record<string, unknown>).subjectSkin = next;
}

export function applySubjectFontChange(id: EntityId, fontId: string): void {
  applySubjectSkinPatch(id, { fontId });
}

export function applySubjectResizeChange(id: EntityId, scale: number): void {
  applySubjectSkinPatch(id, { scale });
}

export function applySubjectAlignChange(id: EntityId, align: "left" | "center" | "right"): void {
  applySubjectSkinPatch(id, { align });
}

export function applySubjectTextChange(id: EntityId, value: string): void {
  const rec = subjects.get(id);
  if (!rec || rec.skin.kind !== "text") return;
  const next: SubjectSkin = { ...rec.skin, value };
  rec.skin = next;
  const e = store.get(id, { live: true });
  if (e) (e.behavior.data as Record<string, unknown>).subjectSkin = next;
}

export function pickUnlockedSubjectTarget(
  eyePos: { x: number; y: number },
  subjectList: Array<{ id: EntityId; pos: { x: number; y: number } }>,
  assistRadiusPx: number,
): { id: EntityId; pos: { x: number; y: number } } | null {
  let nearest: { id: EntityId; pos: { x: number; y: number } } | null = null;
  let nearestDist = Infinity;
  for (const s of subjectList) {
    const dx = s.pos.x - eyePos.x;
    const dy = s.pos.y - eyePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist && dist <= assistRadiusPx) {
      nearest = s;
      nearestDist = dist;
    }
  }
  return nearest;
}

export function __getHudForTests(): Hud {
  return hud;
}

export function __destroySubjectForTests(id: EntityId): void {
  const e = store.get(id, { live: true });
  if (!e) return;
  const wasLocked = lockedSubjectId === id;
  store.remove(id);
  removeSubjectFromCollection(id);
  if (wasLocked) {
    hud.setLockedSubjectId(null);
    hud.setCurrentSubjectId(null);
  }
}

export function __getSubjectEntityForTests(id: EntityId): Entity | null {
  return store.get(id, { live: true });
}

export function __stepSubjectUpdateForTests(
  cursor: { x: number; y: number; active: boolean },
  dt: number,
  _nowMs: number,
): void {
  subjects.forEach((rec) => {
    const e = store.get(rec.id, { live: true });
    if (!e) return;
    const target = rec.locked ? e.physics.pos : cursor;
    const dx = target.x - e.physics.pos.x;
    const dy = target.y - e.physics.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.1 && !rec.locked) {
      const speed = 200;
      const moveX = (dx / dist) * speed * dt;
      const moveY = (dy / dist) * speed * dt;
      e.physics.pos.x += moveX;
      e.physics.pos.y += moveY;
    }
    if (e.physics.scale < 1) {
      e.physics.scale = 1;
    }
  });
}

const SUBJECT_HIT_RADIUS_PX = 60;

const stage = document.querySelector<HTMLCanvasElement>("#stage");
const hudRoot = document.querySelector<HTMLElement>("#hud-root");

if (!stage || !hudRoot) {
  throw new Error("Fun Satire: missing #stage canvas or #hud-root container.");
}
stage.dataset.layer = "canvas";
stage.style.zIndex = "var(--z-canvas)";

const updateStageCursor = (clientX: number, clientY: number): void => {
  const rect = stage.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let nearSubject = false;
  subjects.forEach((rec) => {
    const e = store.get(rec.id, { live: true });
    if (!e) return;
    const dx = e.physics.pos.x - x;
    const dy = e.physics.pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= SUBJECT_HIT_RADIUS_PX) {
      nearSubject = true;
    }
  });
  stage.style.cursor = nearSubject ? "grab" : "";
};

stage.addEventListener("pointermove", (e: PointerEvent) => {
  updateStageCursor(e.clientX, e.clientY);
});

stage.addEventListener("pointerleave", () => {
  stage.style.cursor = "";
});

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

const visualFixture = readVisualFixture(window.location.search);
let completedRenderCount = 0;
let fixtureRenderError: unknown = null;

const rng = visualFixture ? new Rng(visualFixture.seed) : new Rng(seed);
const store = new EntityStore();
const manifest = loadManifestFromText(JSON.stringify(eyesRoster));
const subjectManifest = loadManifestFromText(JSON.stringify(subjectRoster));
const subjectManifestEntries = subjectManifest.entries.filter(
  (e): e is SubjectManifestEntry => e.rig === "subject",
);
const particles = new ParticleSystem(rng, 256);
const viewport = createViewport(stage);
const imageAssets = getImageAssetCache();
imageAssets.preload([
  ...AVATAR_ASSET_REGISTRY.map((e) => e.url),
  BUG_DRAW.imageUrl,
  FINGER_DRAW.imageUrl,
]);

const hud = new Hud(hudRoot, stage);
hud.setMode("eyes");
hud.setPower("laserBurn");

const audioEngine = new AudioEngine(new AudioContext());
new AudioControl(document.body, audioEngine);

let currentMode: HudMode = "eyes";
let repelMultiplier = 1;

hud.onModeChange((mode) => {
  const power = MODE_POWER_MAP[mode];
  powerCtrl.setPower(power);
  hud.setPower(power);
  currentMode = mode;
  startAmbientForMode(audioEngine, mode);
});

hud.onSubjectDrop((result: SubjectDropResult) => {
  applySubjectDrop({ skin: result.skin, canvasPos: result.canvasPos, nowMs: engine.getNow() });
});

hud.onSubjectResize((subjectId, scale) => {
  if (subjectId === null) return;
  applySubjectResizeChange(subjectId, scale);
  const rec = subjects.get(subjectId);
  if (rec) hud.setActiveSubjectSkin(subjectId, rec.skin);
});

hud.onSubjectFontChange((subjectId, fontId) => {
  if (subjectId === null) return;
  applySubjectFontChange(subjectId, fontId);
  const rec = subjects.get(subjectId);
  if (rec) hud.setActiveSubjectSkin(subjectId, rec.skin);
});

hud.onSubjectAlignChange((subjectId, align) => {
  if (subjectId === null) return;
  applySubjectAlignChange(subjectId, align);
  const rec = subjects.get(subjectId);
  if (rec) hud.setActiveSubjectSkin(subjectId, rec.skin);
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

hud.onAttackPress((subjectId) => {
  if (subjectId === null) return;
  // TODO: Replace with DraggableAvatar cursor tracking
  void subjectId;
});

hud.onAttackRelease(() => {
  powerCtrl.release(engine.getNow());
});

hud.onVisibilityToggle((visible) => {
  void visible;
});

hud.onHandToolToggle((active) => {
  void active;
});

hud.onTextTool(() => {
  // Text tool previously triggered an auto-respawn; with drag-to-place
  // (PR2), the user drops a subject from the drawer onto the canvas.
});

hud.onGridTool(() => {
  // Grid opens the existing subject browser drawer.
  document.querySelector<HTMLElement>(".hud-placard__subject-toggle")?.dispatchEvent(
    new MouseEvent("click", { bubbles: true }),
  );
});

const engine = new Engine();
engine.events.on("tick", ({ dt }) => {
  const nowMs = engine.getNow();
  // TODO: Replace cursor-dependent logic with DraggableAvatar
  void dt;
  void nowMs;
});

const behaviors = new Map<EntityId, EyeBehavior>();
const blinkTimers = new Map<EntityId, EyeBlinkTimer>();
const pupilOffsets = new Map<EntityId, { x: number; y: number }>();

let nextEntityId = 1;

const worldAPI = {
  getEntity: (id: EntityId) => store.get(id, { live: true }),
  markDying: (id: EntityId) => {
    store.markDying(id);
  },
  startRespawn: (id: EntityId, _delayMs: number) => {
    const e = store.get(id, { live: false });
    if (!e) return;
    if (e.content.renderType === "subject") {
      store.remove(id);
      removeSubjectFromCollection(id);
      return;
    }
    respawn.schedule(e, engine.getNow(), _delayMs);
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

const powerCtrl = new PowerController({ rng, worldAPI, effectSystem: effects, targetRadius: 70, cooldownMs: 800 });

const dragCtrl = new DragController(store);

const pointer: PointerTracker = new PointerTracker(stage, {
  setCursor(_x: number, _y: number) {
    // TODO: Replace with DraggableAvatar cursor tracking
  },
  clearCursor() {
    // TODO: Replace with DraggableAvatar cursor tracking
  },
  press() {
    // TODO: Replace with DraggableAvatar interaction
  },
  release() {
    const now = engine.getNow();
    powerCtrl.release(now);
    dragCtrl.release(now);
  },
});

engine.onTick(() => {
  // TODO: Replace with DraggableAvatar drag tracking
});

engine.onTick((dt) => {
  const dtSec = Math.min(0.1, dt / 1000);
  // TODO: Replace cursor with DraggableAvatar position
  const cursor = { x: 0, y: 0, active: false };

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

  store.forEachAlive((e) => {
    if (e.content.renderType !== "eye") return;
    const beh = behaviors.get(e.id);
    if (beh) beh.tick(rng, engine.getNow());
  });

  // Look-at rotation: eyes rotate toward the locked subject
  if (lockedSubjectId !== null) {
    const subj = store.get(lockedSubjectId, { live: true });
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
pointer.attach();
engine.start();

if (visualFixture) {
  installVisualFixtureDocumentState(document, visualFixture);
  hud.setVisualFixturePanel(visualFixture.panel);
  const crowdMembers: Entity[] = [];
  store.forEachAlive((e) => { if (e.content.renderType === "eye") crowdMembers.push(e); });
  applyEyesFixtureState(crowdMembers, pupilOffsets, viewport.state);

  let targetId: number | null = null;
  if (visualFixture.attackProgress !== null) {
    const result = materializeEyesAttackFixture({
      store,
      effects,
      subjectManifest: subjectManifestEntries,
      nextId: nextEntityId++,
      viewport: viewport.state,
      nowMs: visualFixture.nowMs,
      progress: visualFixture.attackProgress,
    });
    targetId = result.targetId;
    const target = { id: targetId };
    const subjectSkin: SubjectSkin = { kind: "avatar", assetId: "figure" };
    spawnSubjectForCollection({ id: target.id, skin: subjectSkin, nowMs: visualFixture.nowMs, });
    lockSubject(target.id);
    hud.setVisualFixtureAttackState({ progress: visualFixture.attackProgress, targetId: target.id });
  }

  const __FUN_SATIRE_VISUAL__ = { fixture: visualFixture, failedAssets: [] as string[] };
  void document.fonts.ready.then(() => {
    return completeVisualFixtureBoot({
      assetUrls: collectVisibleFixtureResourceUrls(document),
      preload: async (urls) => {
        imageAssets.preload(urls);
        return urls.map((url) => ({ url, status: "ready" as const }));
      },
      fontsReady: document.fonts.ready,
      finishEntranceTransitions: () => hud.finishEntranceTransitions(),
      renderOnce: () => { void 0; },
      completedRenderCount: () => completedRenderCount,
      renderError: () => fixtureRenderError,
    }).then((status) => {
      __FUN_SATIRE_VISUAL__.failedAssets = [...status.failedAssets];
      (document.documentElement.dataset as Record<string, string>).visualReady = "complete";
    });
  });
}

const unlockAudio = (): void => {
  audioEngine.unlock();
  void startMusicBed(audioEngine, "/audio/music-bed.mp3");
  void startAmbientBedTrack(audioEngine);
  startTenseFiller(audioEngine);
  startAmbientForMode(audioEngine, currentMode);
};
document.addEventListener("pointerdown", unlockAudio, { once: true });
