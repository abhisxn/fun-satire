import type { Creature, CreatureMode } from "./creatureTypes";
import type { EyeCreature } from "./EyeCreature";
import type { PhysicsParams } from "./creaturePhysics";
import { updateCreature } from "./creaturePhysics";
import { createEyeCreature, updateEyePupil, updateEyeBlink, loadEyeSvg } from "./EyeCreature";
import { createFingerCreature, getFingerRotation } from "./FingerCreature";
import { createCockroachCreature, getCockroachRotation } from "./CockroachCreature";
import { createPlacardCreature, getPlacardRotation } from "./PlacardCreature";

/** Whole batch of creatures finishes appearing within this window (ms). */
export const SPAWN_WAVE_MS = 20000;
/** Duration of one creature's own scale+fade pop animation (ms). */
export const SPAWN_POP_MS = 1200;
/** Random disappear cadence for settled creatures (ms between fade batches). */
export const FADE_PICK_INTERVAL_MS = 1500;
/** How many settled creatures randomly fade out per interval. */
export const FADE_PICK_COUNT = 4;
/** Duration of the fade-out before a creature becomes invisible (ms). */
export const FADE_OUT_MS = 400;
/** Random re-pop cadence for invisible creatures (ms between batches). */
export const REPOP_INTERVAL_MS = 2000;
/** How many invisible creatures randomly pop back in per interval. */
export const REPOP_COUNT = 3;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface SpawnProgress {
  scale: number;
  opacity: number;
  done: boolean;
}

/**
 * Pure function: given when a creature is scheduled to start popping in
 * (spawnPopAtMs) and the current time, returns its visual scale/opacity and
 * whether its pop animation has finished.
 */
export function computeSpawnProgress(spawnPopAtMs: number, nowMs: number): SpawnProgress {
  const t = nowMs - spawnPopAtMs;
  if (t <= 0) {
    return { scale: 0, opacity: 0, done: false };
  }
  if (t >= SPAWN_POP_MS) {
    return { scale: 1, opacity: 1, done: true };
  }
  const progress = t / SPAWN_POP_MS;
  return {
    scale: easeOutBack(progress),
    opacity: Math.min(1, progress / 0.6),
    done: false,
  };
}

/**
 * Resolves a creature's visual state for the current frame. Handles the
 * fade-out phase (fadeStartMs > 0), the invisible waiting-for-re-pop phase
 * (waitingRespawn === true), the pop-in animation, and the settled state.
 */
function resolveSpawnState(creature: Creature, nowMs: number): { popScale: number; opacity: number } {
  if (creature.fadeStartMs > 0) {
    const fadeProgress = (nowMs - creature.fadeStartMs) / FADE_OUT_MS;
    if (fadeProgress >= 1) {
      creature.fadeStartMs = 0;
      creature.spawnDone = false;
      creature.waitingRespawn = true;
    } else {
      return { popScale: 1, opacity: 1 - fadeProgress };
    }
  }
  if (creature.waitingRespawn) {
    return { popScale: 0, opacity: 0 };
  }
  if (!creature.spawnDone) {
    const spawnState = computeSpawnProgress(creature.spawnPopAtMs, nowMs);
    creature.spawnDone = spawnState.done;
    return { popScale: spawnState.scale, opacity: spawnState.opacity };
  }
  return { popScale: 1, opacity: 1 };
}

interface ModeConfig {
  readonly cols: number;
  readonly rows: number;
  readonly scaleFn: (hx: number, hy: number, vw: number, vh: number) => number;
}

const MODE_CONFIGS: Record<CreatureMode, ModeConfig> = {
  eyes: {
    cols: 12,
    rows: 8,
    scaleFn: (hx, hy, vw, vh) => {
      const baseScale = 0.3 + Math.pow(Math.random(), 1.5) * 0.45;
      const distToEdge = Math.min(hx, vw - hx, hy, vh - hy);
      const maxDist = Math.min(vw / 2, vh / 2);
      const edgeFactor = 1 - distToEdge / maxDist;
      return baseScale + edgeFactor * 0.15;
    },
  },
  pointedFinger: {
    cols: 20,
    rows: 12,
    scaleFn: () => 0.08 + Math.pow(Math.random(), 1.5) * 0.35,
  },
  cockroach: {
    cols: 20,
    rows: 12,
    scaleFn: () => 0.08 + Math.pow(Math.random(), 1.5) * 0.35,
  },
  placard: {
    cols: 20,
    rows: 12,
    // Higher floor than other modes (0.18 vs 0.08) so the placard stick stays legible
    // even on the smallest creatures in the grid. Sign size is randomized independently
    // in createPlacardCreature.
    scaleFn: () => 0.18 + Math.pow(Math.random(), 1.5) * 0.22,
  },
};

export interface CreatureGridConfig {
  container: HTMLElement;
  mode: CreatureMode;
  initialQuantity?: number;
}

export class CreatureGrid {
  private creatures: Creature[] = [];
  private eyeCreatures: EyeCreature[] = [];
  private container: HTMLElement;
  private mode: CreatureMode;
  private svgMarkup: string = '';
  // Desired creature count, set via setQuantity(); persists across
  // switchMode()/respawn() so those don't silently reset it to a mode's
  // fixed default grid size.
  private targetCount: number;
  private physicsParams: PhysicsParams = {
    repelRadius: 180,
    repelStrength: 120,
    springStrength: 0.02,
    damping: 0.88,
  };
  private lastFadePickMs: number = 0;
  private lastRepopPickMs: number = 0;

  constructor(config: CreatureGridConfig) {
    this.container = config.container;
    this.mode = config.mode;
    const modeConfig = MODE_CONFIGS[this.mode];
    this.targetCount = config.initialQuantity ?? modeConfig.cols * modeConfig.rows;
  }

  async init(): Promise<void> {
    if (this.mode === 'eyes') {
      this.svgMarkup = await loadEyeSvg();
    }
    this.spawn(this.mode);
  }

  private gridDimsFor(mode: CreatureMode, count: number): { cols: number; rows: number } {
    const modeConfig = MODE_CONFIGS[mode];
    const aspect = modeConfig.cols / modeConfig.rows;
    const rows = Math.max(1, Math.round(Math.sqrt(count / aspect)));
    const cols = Math.max(1, Math.ceil(count / rows));
    return { cols, rows };
  }

  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;
    const modeConfig = MODE_CONFIGS[mode];
    const { cols, rows } = this.gridDimsFor(mode, this.targetCount);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;
    const batchStartMs = Date.now();

    for (let i = 0; i < this.targetCount; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const hx = (c + 0.5) * cellW;
      const hy = (r + 0.5) * cellH;
      const scale = modeConfig.scaleFn(hx, hy, vw, vh);
      const uid = `${c}_${r}`;

      let creature: Creature;
      switch (mode) {
        case 'eyes': {
          const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
          this.eyeCreatures.push(eye);
          creature = eye;
          break;
        }
        case 'pointedFinger':
          creature = createFingerCreature(hx, hy, scale);
          break;
        case 'cockroach':
          creature = createCockroachCreature(hx, hy, scale);
          break;
        case 'placard':
          creature = createPlacardCreature(hx, hy, scale);
          break;
      }
      creature.spawnPopAtMs = batchStartMs + Math.random() * Math.max(0, SPAWN_WAVE_MS - SPAWN_POP_MS);
      creature.spawnDone = false;
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }
  }

  switchMode(mode: CreatureMode): void {
    if (mode === this.mode) return;
    this.spawn(mode);
  }

  setQuantity(targetCount: number): void {
    const current = this.creatures.length;
    this.targetCount = targetCount;
    if (targetCount === current) return;

    const modeConfig = MODE_CONFIGS[this.mode];
    const { cols, rows } = this.gridDimsFor(this.mode, targetCount);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;
    const batchStartMs = Date.now();

    if (targetCount < current) {
      const removed = this.creatures.splice(targetCount);
      for (const c of removed) {
        c.el.remove();
        const eyeIdx = this.eyeCreatures.indexOf(c as EyeCreature);
        if (eyeIdx >= 0) this.eyeCreatures.splice(eyeIdx, 1);
      }
    }

    // Reflow every surviving/new creature onto the recomputed grid so the
    // whole layout stays evenly spaced instead of thinning from one edge.
    for (let i = 0; i < targetCount; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const hx = (c + 0.5) * cellW;
      const hy = (r + 0.5) * cellH;

      if (i < this.creatures.length) {
        this.creatures[i].hx = hx;
        this.creatures[i].hy = hy;
        continue;
      }

      const scale = modeConfig.scaleFn(hx, hy, vw, vh);
      const uid = `extra_${i}`;

      let creature: Creature;
      switch (this.mode) {
        case 'eyes': {
          const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
          this.eyeCreatures.push(eye);
          creature = eye;
          break;
        }
        case 'pointedFinger':
          creature = createFingerCreature(hx, hy, scale);
          break;
        case 'cockroach':
          creature = createCockroachCreature(hx, hy, scale);
          break;
        case 'placard':
          creature = createPlacardCreature(hx, hy, scale);
          break;
      }
      creature.spawnPopAtMs = batchStartMs + Math.random() * Math.max(0, SPAWN_WAVE_MS - SPAWN_POP_MS);
      creature.spawnDone = false;
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }
  }

  update(avatarX: number, avatarY: number): void {
    const avatar = { x: avatarX, y: avatarY };
    const now = Date.now();

    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams);
    }

    if (this.mode === 'eyes') {
      const vw = this.container.clientWidth || window.innerWidth;
      for (const eye of this.eyeCreatures) {
        updateEyePupil(eye, avatarX, avatarY);
        const scaleY = updateEyeBlink(eye);
        const dx = avatarX - eye.x;
        const dy = avatarY - eye.y;
        // Base the angle on the right-half quadrant's large-magnitude form
        // (dx pinned negative) so both left and right get the same tilt
        // range, then mirror the sign for the left half so it fans out
        // symmetrically instead of going flat.
        const halfSign = eye.x < vw / 2 ? -1 : 1;
        const angleRad = Math.atan2(dy, -Math.abs(dx));
        const fullAngle = angleRad * (180 / Math.PI);
        const rotation = fullAngle * eye.rotFactor * halfSign;

        const spawn = resolveSpawnState(eye, now);
        eye.el.style.opacity = String(spawn.opacity);
        eye.el.style.transform = `translate(${eye.x - eye.w / 2}px,${eye.y - eye.h / 2}px) rotate(${rotation}deg) scale(${spawn.popScale}) scaleY(${scaleY})`;
      }
    } else {
      for (const c of this.creatures) {
        let angle: number;
        switch (this.mode) {
          case 'pointedFinger':
            angle = getFingerRotation(c, avatarX, avatarY);
            break;
          case 'cockroach':
            angle = getCockroachRotation(c, avatarX, avatarY);
            break;
          case 'placard':
            angle = getPlacardRotation(c, avatarX, avatarY);
            break;
          default:
            angle = 0;
        }

        const spawn = resolveSpawnState(c, now);
        c.el.style.opacity = String(spawn.opacity);
        c.el.style.transform = `translate(${c.x - c.w * 0.5}px,${c.y - c.h * 0.5}px) rotate(${angle}deg) scale(${spawn.popScale})`;
      }
    }

    // Random disappear: settled creatures fade out independently.
    if (now - this.lastFadePickMs >= FADE_PICK_INTERVAL_MS) {
      const candidates = this.creatures.filter((c) => c.spawnDone && c.fadeStartMs === 0);
      if (candidates.length > 0) {
        this.lastFadePickMs = now;
        const count = Math.min(FADE_PICK_COUNT, candidates.length);
        for (let i = 0; i < count; i++) {
          const picked = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
          picked.fadeStartMs = now;
        }
      }
    }

    // Random respawn: invisible creatures pop back in independently.
    if (now - this.lastRepopPickMs >= REPOP_INTERVAL_MS) {
      const waiting = this.creatures.filter((c) => c.waitingRespawn);
      if (waiting.length > 0) {
        this.lastRepopPickMs = now;
        const count = Math.min(REPOP_COUNT, waiting.length);
        for (let i = 0; i < count; i++) {
          const picked = waiting.splice(Math.floor(Math.random() * waiting.length), 1)[0];
          picked.waitingRespawn = false;
          picked.spawnPopAtMs = now;
        }
      }
    }
  }

  setRepelMultiplier(multiplier: number): void {
    this.physicsParams.repelStrength = 120 * multiplier;
  }

  getCreatureCount(): number {
    return this.creatures.length;
  }

  respawn(): void {
    this.spawn(this.mode);
  }

  getMode(): CreatureMode {
    return this.mode;
  }

  private clear(): void {
    for (const c of this.creatures) {
      c.el.remove();
    }
    this.creatures = [];
    this.eyeCreatures = [];
  }
}
