import type { Creature, CreatureMode } from "./creatureTypes";
import type { EyeCreature } from "./EyeCreature";
import type { PhysicsParams, Repulsor } from "./creaturePhysics";
import { updateCreature } from "./creaturePhysics";
import { createEyeCreature, updateEyePupil, updateEyeBlink, loadEyeSvg, triggerEyeHoverTone } from "./EyeCreature";
import { createFingerCreature, getFingerRotation, triggerFingerHoverTone } from "./FingerCreature";
import { createCockroachCreature, getCockroachRotation, triggerCockroachHoverTone } from "./CockroachCreature";
import { createPlacardCreature, getPlacardRotation, triggerPlacardHoverTone } from "./PlacardCreature";
import { QTY_MIN, QTY_MAX } from "../config/tokens";
import { decayTowardFloor } from "./raidRules";

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
export const REPOP_INTERVAL_MS = 1500;
/** How many invisible creatures randomly pop back in per interval outside a burst. */
export const REPOP_COUNT = 5;
/** Per-tick re-pop cap during a fast-drag burst, as a fraction of the target quantity. */
export const REPOP_COUNT_BURST_FRACTION = 0.15;
/** Floor for the burst cap so small target quantities still flood back quickly. */
export const REPOP_COUNT_BURST_MIN = 40;
/** Grace period before an idle sticker starts draining the crowd (ms). */
export const IDLE_GRACE_MS = 20_000;
/** Half-life (ms) of the idle-decay curve — see raidRules.decayTowardFloor. At this many ms
 * past IDLE_GRACE_MS, the visible crowd has decayed exactly halfway from full to the idle
 * floor. */
export const IDLE_HALF_LIFE_MS = 150_000;
/** Idle floor as a fraction of the current target quantity. */
export const IDLE_FLOOR_FRACTION = 0.02;
/** Absolute minimum visible count at the idle floor, regardless of target quantity. */
export const IDLE_FLOOR_MIN_COUNT = 30;
/** Sub-pixel jitter below this doesn't count as sticker movement. */
export const MOVEMENT_NOISE_PX = 1.5;
/** Drag speed (px/ms) above which a movement counts as a "fast" resurge trigger. */
export const FAST_DRAG_SPEED_PX_MS = 1.2;
/** How long a fast-drag burst window stays open after the last qualifying movement (ms). */
export const BURST_DURATION_MS = 3_000;
/** Extra slack (px) beyond a creature's own rendered half-size for hover proximity. */
export const HOVER_PROXIMITY_PADDING = 20;
/**
 * Minimum gap between hover tones, across ALL creatures — the voice-cap/
 * anti-spam guard. Kept well above one hover-tone's own duration so
 * sweeping the cursor quickly across a dense crowd (e.g. while dragging a
 * sticker across it) reads as spaced-out pops, not a machine-gun rattle.
 */
export const HOVER_TONE_COOLDOWN_MS = 260;
/** Peak extra scale (on top of the creature's own popScale) while hovered — the visual half of the hover feedback. */
export const HOVER_SCALE_BUMP = 0.18;
/** A security sprite's current position and the radius it repels the crowd within. */
export interface SecurityUnit {
  x: number;
  y: number;
  repelRadius: number;
}
/** Per-frame approach rate toward the hover scale target — a simple decorative ease, not physics. */
const HOVER_BOOST_LERP = 0.25;

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

/** Pure function: drag speed in px/ms from a frame's movement distance and elapsed time. */
export function dragSpeedPxPerMs(distancePx: number, dtMs: number): number {
  return distancePx / dtMs;
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

/**
 * Per-creature hover radius: the creature's own visual half-size plus a
 * fixed padding, so bigger/closer creatures get an easier hover target
 * than tiny background ones, and every creature stays hoverable even at
 * small scales.
 */
export function hoverRadiusFor(creature: Creature): number {
  return Math.max(creature.w, creature.h) / 2 + HOVER_PROXIMITY_PADDING;
}

/**
 * Pure edge-detector: given the previous hover flag and the current
 * cursor distance, returns whether the creature is hovered now and
 * whether this frame is specifically a hover-ENTER transition
 * (false -> true). Callers use `entered` to fire a one-shot side effect
 * (a tone) exactly once per hover, not every frame the cursor stays over
 * the creature.
 */
export function computeHoverEdge(
  distance: number,
  radius: number,
  wasHovered: boolean,
): { hovered: boolean; entered: boolean } {
  const hovered = distance < radius;
  return { hovered, entered: hovered && !wasHovered };
}

/**
 * Simple global cooldown that doubles as a voice-cap: only allow one hover
 * tone to start within `cooldownMs` of the previous one, no matter how
 * many creatures cross into hover in the same frame/burst.
 */
export function canPlayHoverTone(
  lastPlayedAtMs: number,
  nowMs: number,
  cooldownMs: number = HOVER_TONE_COOLDOWN_MS,
): boolean {
  return nowMs - lastPlayedAtMs >= cooldownMs;
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
  private lastAvatarX: number | null = null;
  private lastAvatarY: number | null = null;
  private lastFrameMs: number = 0;
  private lastActivityMs: number = Date.now();
  private burstUntilMs: number = 0;
  private repulsor: Repulsor | null = null;
  private quantityChangeCb: ((count: number) => void) | null = null;
  private avatarRepelRadius: number | null = null;
  private audioContext: AudioContext | null = null;
  private hoverState = new WeakMap<Creature, boolean>();
  private hoverBoost = new WeakMap<Creature, number>();
  private lastHoverToneAtMs = -Infinity;

  constructor(config: CreatureGridConfig) {
    this.container = config.container;
    this.mode = config.mode;
    const modeConfig = MODE_CONFIGS[this.mode];
    this.targetCount = config.initialQuantity ?? modeConfig.cols * modeConfig.rows;
  }

  async init(): Promise<void> {
    // The grid may start in any mode, but the HUD can switch to eyes at any
    // time, so always preload the eye SVG. A failed fetch must not break a
    // non-eye startup; eyes only degrade if the user then switches to them.
    this.svgMarkup = await loadEyeSvg().catch(() => '');
    this.spawn(this.mode);
  }

  private gridDimsFor(mode: CreatureMode, count: number): { cols: number; rows: number } {
    const modeConfig = MODE_CONFIGS[mode];
    const aspect = modeConfig.cols / modeConfig.rows;
    const rows = Math.max(1, Math.round(Math.sqrt(count / aspect)));
    const cols = Math.max(1, Math.ceil(count / rows));
    return { cols, rows };
  }

  private createCreatureForMode(mode: CreatureMode, hx: number, hy: number, scale: number, uid: string): Creature {
    switch (mode) {
      case 'eyes': {
        const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
        this.eyeCreatures.push(eye);
        return eye;
      }
      case 'pointedFinger':
        return createFingerCreature(hx, hy, scale);
      case 'cockroach':
        return createCockroachCreature(hx, hy, scale);
      case 'placard':
        return createPlacardCreature(hx, hy, scale);
    }
  }

  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;
    this.lastActivityMs = Date.now();
    this.burstUntilMs = 0;
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

      const creature = this.createCreatureForMode(mode, hx, hy, scale, uid);
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
    const clampedTarget = Math.max(QTY_MIN, Math.min(QTY_MAX, targetCount));
    const current = this.creatures.length;
    this.targetCount = clampedTarget;
    if (clampedTarget === current) return;

    const modeConfig = MODE_CONFIGS[this.mode];
    const { cols, rows } = this.gridDimsFor(this.mode, clampedTarget);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;
    const batchStartMs = Date.now();

    if (clampedTarget < current) {
      const removed = this.creatures.splice(clampedTarget);
      for (const c of removed) {
        c.el.remove();
        const eyeIdx = this.eyeCreatures.indexOf(c as EyeCreature);
        if (eyeIdx >= 0) this.eyeCreatures.splice(eyeIdx, 1);
      }
    }

    // Reflow every surviving/new creature onto the recomputed grid so the
    // whole layout stays evenly spaced instead of thinning from one edge.
    for (let i = 0; i < clampedTarget; i++) {
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

      const creature = this.createCreatureForMode(this.mode, hx, hy, scale, uid);
      creature.spawnPopAtMs = batchStartMs + Math.random() * Math.max(0, SPAWN_WAVE_MS - SPAWN_POP_MS);
      creature.spawnDone = false;
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }

    this.quantityChangeCb?.(clampedTarget);
  }

  // raidFloor is accepted for backward-compatible call sites (RaidController
  // still computes and passes it) but is no longer consulted here — the
  // catch mechanic that used it to cap permanent removals was removed; the
  // raid floor is now enforced by RaidController's own attrition drain via
  // setQuantity().
  update(avatarX: number, avatarY: number, securityUnits: SecurityUnit[] = [], _raidFloor: number = QTY_MIN): void {
    const avatar = { x: avatarX, y: avatarY };
    const now = Date.now();

    if (this.lastAvatarX !== null && this.lastAvatarY !== null) {
      const dx = avatarX - this.lastAvatarX;
      const dy = avatarY - this.lastAvatarY;
      const dist = Math.hypot(dx, dy);
      if (dist > MOVEMENT_NOISE_PX) {
        this.lastActivityMs = now;
        const dt = Math.max(1, now - this.lastFrameMs);
        if (dragSpeedPxPerMs(dist, dt) > FAST_DRAG_SPEED_PX_MS) {
          this.burstUntilMs = now + BURST_DURATION_MS;
        }
      }
    }
    this.lastAvatarX = avatarX;
    this.lastAvatarY = avatarY;
    this.lastFrameMs = now;

    const repulsors: Repulsor[] = this.repulsor ? [this.repulsor] : [];
    for (const unit of securityUnits) {
      repulsors.push({ x: unit.x, y: unit.y, radius: unit.repelRadius });
    }
    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams, repulsors, this.avatarRepelRadius ?? undefined);
    }

    if (this.mode === 'eyes') {
      const vw = this.container.clientWidth || window.innerWidth;
      for (const eye of this.eyeCreatures) {
        const boost = this.updateHover(eye, avatarX, avatarY, now);

        const dx = avatarX - eye.x;
        const dy = avatarY - eye.y;
        updateEyePupil(eye, avatarX, avatarY);
        const scaleY = updateEyeBlink(eye);
        // Base the angle on the right-half quadrant's large-magnitude form
        // (dx pinned negative) so both left and right get the same tilt
        // range, then mirror the sign for the left half so it fans out
        // symmetrically instead of going flat.
        const halfSign = eye.x < vw / 2 ? -1 : 1;
        const angleRad = Math.atan2(dy, -Math.abs(dx));
        const fullAngle = angleRad * (180 / Math.PI);
        const rotation = fullAngle * eye.rotFactor * halfSign;

        const spawn = resolveSpawnState(eye, now);
        const hoverScale = 1 + boost * HOVER_SCALE_BUMP;
        eye.el.style.opacity = String(spawn.opacity);
        eye.el.style.transform = `translate(${eye.x - eye.w / 2}px,${eye.y - eye.h / 2}px) rotate(${rotation}deg) scale(${spawn.popScale * hoverScale}) scaleY(${scaleY})`;
      }
    } else {
      for (const c of this.creatures) {
        const boost = this.updateHover(c, avatarX, avatarY, now);

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
        const hoverScale = 1 + boost * HOVER_SCALE_BUMP;
        c.el.style.opacity = String(spawn.opacity);
        c.el.style.transform = `translate(${c.x - c.w * 0.5}px,${c.y - c.h * 0.5}px) rotate(${angle}deg) scale(${spawn.popScale * hoverScale})`;
      }
    }

    // Random disappear: settled creatures fade out independently. Reservoir-
    // samples up to FADE_PICK_COUNT eligible creatures in one pass (Algorithm
    // R) instead of filter()-ing the whole crowd into a throwaway array every
    // tick.
    if (this.shouldRunThrottled(this.lastFadePickMs, FADE_PICK_INTERVAL_MS, now)) {
      const picked: Creature[] = [];
      let seen = 0;
      for (const c of this.creatures) {
        if (!c.spawnDone || c.fadeStartMs !== 0) continue;
        seen++;
        if (picked.length < FADE_PICK_COUNT) {
          picked.push(c);
        } else {
          const j = Math.floor(Math.random() * seen);
          if (j < FADE_PICK_COUNT) picked[j] = c;
        }
      }
      if (seen > 0) {
        this.lastFadePickMs = now;
        for (const c of picked) c.fadeStartMs = now;
      }
    }

    // Demand-driven respawn: closes the gap toward how much of the crowd
    // should be visible right now (full while active, decaying toward the
    // idle floor the longer the sticker sits still), capped per tick so the
    // recovery still animates rather than jumping instantly. A fast drag
    // opens a burst window that raises the cap so the crowd floods back.
    if (this.shouldRunThrottled(this.lastRepopPickMs, REPOP_INTERVAL_MS, now)) {
      this.lastRepopPickMs = now;
      const idleMs = now - this.lastActivityMs;
      const decayFraction = decayTowardFloor(Math.max(0, idleMs - IDLE_GRACE_MS), IDLE_FLOOR_FRACTION, IDLE_HALF_LIFE_MS);
      const desiredVisibleCount = Math.min(
        this.targetCount,
        Math.max(IDLE_FLOOR_MIN_COUNT, Math.round(this.targetCount * decayFraction)),
      );
      let visibleCount = 0;
      let waitingCount = 0;
      for (const c of this.creatures) {
        if (c.waitingRespawn) waitingCount++;
        else visibleCount++;
      }
      const deficit = desiredVisibleCount - visibleCount;
      if (deficit > 0) {
        const burstCap = Math.max(
          REPOP_COUNT_BURST_MIN,
          Math.round(this.targetCount * REPOP_COUNT_BURST_FRACTION),
        );
        const cap = now < this.burstUntilMs ? burstCap : REPOP_COUNT;
        const count = Math.min(cap, deficit, waitingCount);
        if (count > 0) {
          // Reservoir sample (Algorithm R) over the waiting creatures.
          const picked: Creature[] = [];
          let seen = 0;
          for (const c of this.creatures) {
            if (!c.waitingRespawn) continue;
            seen++;
            if (picked.length < count) {
              picked.push(c);
            } else {
              const j = Math.floor(Math.random() * seen);
              if (j < count) picked[j] = c;
            }
          }
          for (const c of picked) {
            c.waitingRespawn = false;
            c.spawnPopAtMs = now;
          }
        }
      }
    }
  }

  setRepelMultiplier(multiplier: number): void {
    this.physicsParams.repelStrength = 120 * multiplier;
  }

  /** Shared AudioContext used to fire hover tones; pass null to silence them. */
  setAudioContext(context: AudioContext | null): void {
    this.audioContext = context;
  }

  /** True once `intervalMs` has elapsed since `lastMs`. Callers own updating their own `lastMs` field on a true result — this only answers "should I run now?". */
  private shouldRunThrottled(lastMs: number, intervalMs: number, now: number): boolean {
    return now - lastMs >= intervalMs;
  }

  /** Hover-detection for one creature this frame: updates hoverState/hoverBoost, fires a
   * hover-enter tone if applicable, and returns the current boost value for the caller to
   * apply to render scale. Shared by both the eyes-mode and non-eyes-mode render branches —
   * identical logic, just run over two different arrays (eyeCreatures vs creatures). */
  private updateHover(c: Creature, avatarX: number, avatarY: number, now: number): number {
    const dx = avatarX - c.x;
    const dy = avatarY - c.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const wasHovered = this.hoverState.get(c) ?? false;
    // The crowd actively flees the cursor (see applyRepulsion in
    // creaturePhysics.ts), and repelRadius (180px) is well outside a
    // creature's own tight hoverRadiusFor(c) (~half its size + 20px). If
    // hover only used hoverRadiusFor, the cursor could almost never catch
    // a creature close enough to register — it's already fleeing by the
    // time it would. Using whichever radius is larger means hover fires
    // as soon as a creature enters the repulsion field it's reacting to.
    const radius = Math.max(hoverRadiusFor(c), this.physicsParams.repelRadius);
    const { hovered, entered } = computeHoverEdge(distance, radius, wasHovered);
    this.hoverState.set(c, hovered);
    const prevBoost = this.hoverBoost.get(c) ?? 0;
    const targetBoost = hovered ? 1 : 0;
    const boost = prevBoost + (targetBoost - prevBoost) * HOVER_BOOST_LERP;
    this.hoverBoost.set(c, boost);
    if (entered && this.audioContext && canPlayHoverTone(this.lastHoverToneAtMs, now)) {
      this.lastHoverToneAtMs = now;
      this.triggerHoverTone();
    }
    return boost;
  }

  private triggerHoverTone(): void {
    if (!this.audioContext) return;
    switch (this.mode) {
      case 'eyes':
        triggerEyeHoverTone(this.audioContext);
        break;
      case 'pointedFinger':
        triggerFingerHoverTone(this.audioContext);
        break;
      case 'cockroach':
        triggerCockroachHoverTone(this.audioContext);
        break;
      case 'placard':
        triggerPlacardHoverTone(this.audioContext);
        break;
    }
  }

  setRepulsor(x: number, y: number, radius?: number): void {
    this.repulsor = { x, y, radius };
  }

  clearRepulsor(): void {
    this.repulsor = null;
  }

  /** Overrides the avatar-vs-creature repel radius (independent of security units' own
   * radii). Pass null to restore the default (`physicsParams.repelRadius`). */
  setAvatarRepelRadius(radius: number | null): void {
    this.avatarRepelRadius = radius;
  }

  getAvatarRepelRadius(): number | null {
    return this.avatarRepelRadius;
  }

  getCreatureCount(): number {
    return this.creatures.length;
  }

  /** Fires with the new count every time setQuantity() actually changes the creature count —
   * whether the caller was a user dragging the Filters slider or RaidController's own
   * attrition/boost/win logic. Never fires for a no-op setQuantity() call. */
  onQuantityChange(cb: (count: number) => void): void {
    this.quantityChangeCb = cb;
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
