import { CreatureGrid } from "./CreatureGrid";
import type { SecurityUnit } from "./CreatureGrid";
import {
  createSecurityUnit,
  removeSecurityUnit,
  startSecurityWander,
  pickSecurityKind,
  computeSecurityShrinkFraction,
  SECURITY_SHRINK_MS,
} from "./SecurityCreature";
import type { SecurityUnitState, SecurityKind } from "./SecurityCreature";
import { QTY_MAX, QTY_MIN } from "../config/tokens";

export interface MoveSample {
  x: number;
  y: number;
  t: number;
}

/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 600;
/** Direction reversals required within the window to count as a shake. */
export const SHAKE_REVERSAL_THRESHOLD = 3;
/** Below this speed (px/ms) a movement doesn't count toward a reversal. */
export const SHAKE_MIN_SPEED_PX_MS = 0.9;
/** Minimum gap between shake pulses, so one shake reads as a wave, not a machine-gun spawn. */
export const SHAKE_PULSE_COOLDOWN_MS = 500;

/**
 * Pure: given a chronological buffer of recent move samples, counts fast
 * direction reversals (sign flips in x or y movement between consecutive
 * fast-enough samples) within the trailing SHAKE_WINDOW_MS. A smooth fast
 * drag in one direction never reversal-counts; only whipping back and
 * forth does.
 */
export function detectShake(samples: MoveSample[]): boolean {
  if (samples.length < 3) return false;
  const last = samples[samples.length - 1]!;
  const windowStart = last.t - SHAKE_WINDOW_MS;
  const windowed = samples.filter((s) => s.t >= windowStart);
  if (windowed.length < 3) return false;

  let reversals = 0;
  let prevDx = 0;
  let prevDy = 0;
  let havePrev = false;

  for (let i = 1; i < windowed.length; i++) {
    const a = windowed[i - 1]!;
    const b = windowed[i]!;
    const dt = Math.max(8, b.t - a.t);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const speed = Math.hypot(dx, dy) / dt;

    if (speed < SHAKE_MIN_SPEED_PX_MS) {
      havePrev = false;
      continue;
    }

    if (havePrev) {
      const reversedX = prevDx !== 0 && dx !== 0 && Math.sign(dx) !== Math.sign(prevDx);
      const reversedY = prevDy !== 0 && dy !== 0 && Math.sign(dy) !== Math.sign(prevDy);
      if (reversedX || reversedY) reversals++;
    }

    prevDx = dx;
    prevDy = dy;
    havePrev = true;
  }

  return reversals >= SHAKE_REVERSAL_THRESHOLD;
}

/** Hard cap on simultaneous security units, regardless of how long shaking continues. */
export const SECURITY_MAX_UNITS = 24;
/** Repulsion radius each security unit exerts on the crowd, same model as the avatar's. */
export const SECURITY_REPEL_RADIUS = 160;
/** Tight radius within which a security unit catches (permanently removes) a creature. */
export const SECURITY_CATCH_RADIUS = 50;
export const SPAWN_MIN_PER_PULSE = 2;
export const SPAWN_MAX_PER_PULSE = 3;
/** Crowd never drops below this fraction of its size when the raid started. */
export const RAID_FLOOR_FRACTION = 0.25;
export type RaidState = "idle" | "raiding" | "recovering" | "charging";

export interface RaidControllerConfig {
  container: HTMLElement;
  grid: CreatureGrid;
  onSecurityRemoved?: (x: number, y: number, w: number, h: number) => void;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Kinds for one spawn pulse: guarantees at least one of each kind once 2+ units
 * spawn (so a pulse never reads as all-one-kind by chance), randomizing the rest
 * and the order. */
export function pickPulseKinds(n: number, rand: () => number = Math.random): SecurityKind[] {
  if (n < 2) return [pickSecurityKind(rand)];
  const kinds: SecurityKind[] = ["police", "raf"];
  for (let i = 2; i < n; i++) kinds.push(pickSecurityKind(rand));
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j]!, kinds[i]!];
  }
  return kinds;
}

export class RaidController {
  private readonly container: HTMLElement;
  private readonly grid: CreatureGrid;
  private readonly onSecurityRemoved: ((x: number, y: number, w: number, h: number) => void) | null;

  private state: RaidState = "idle";
  private units: SecurityUnitState[] = [];
  private moveBuffer: MoveSample[] = [];
  private lastPulseAtMs = -Infinity;
  private raidStartCount = 0;

  constructor(config: RaidControllerConfig) {
    this.container = config.container;
    this.grid = config.grid;
    this.onSecurityRemoved = config.onSecurityRemoved ?? null;
  }

  /** Feed every avatar drag-move point through here; internally detects shake and spawns raids. */
  onAvatarMove(x: number, y: number): void {
    if (this.state === "recovering") return;

    const now = Date.now();
    this.moveBuffer.push({ x, y, t: now });
    const cutoff = now - SHAKE_WINDOW_MS;
    this.moveBuffer = this.moveBuffer.filter((s) => s.t >= cutoff);

    if (now - this.lastPulseAtMs < SHAKE_PULSE_COOLDOWN_MS) return;
    if (!detectShake(this.moveBuffer)) return;

    this.lastPulseAtMs = now;
    this.spawnPulse(x, y);
  }

  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
    }

    const available = SECURITY_MAX_UNITS - this.units.length;
    if (available <= 0) return;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const desired = Math.round(rand(SPAWN_MIN_PER_PULSE, SPAWN_MAX_PER_PULSE));
    const n = Math.min(desired, available);
    const kinds = pickPulseKinds(n);

    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.container, x, y, kinds[i]);
      startSecurityWander(unit, vw, vh, true);
      this.units.push(unit);
    }
  }

  /** Current security units, in the shape CreatureGrid.update() expects for repulsion/catching. */
  getSecurityUnits(): SecurityUnit[] {
    const now = Date.now();
    return this.units.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius:
        u.phase === "shrinking"
          ? SECURITY_REPEL_RADIUS * computeSecurityShrinkFraction(u.phaseStartMs, now)
          : SECURITY_REPEL_RADIUS,
      catchRadius: SECURITY_CATCH_RADIUS,
    }));
  }

  /** Floor CreatureGrid.update() should respect when catching creatures right now. */
  getRaidFloor(): number {
    if (this.state === "idle") return QTY_MIN;
    return Math.max(QTY_MIN, Math.round(this.raidStartCount * RAID_FLOOR_FRACTION));
  }

  getState(): RaidState {
    return this.state;
  }

  /** Instantly triggers full recovery without a hold — a direct entry point kept for
   * callers that don't go through the charge mechanic (a later task). Marks every unit
   * shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so they pop out one
   * after another as tick() sweeps them, rather than all vanishing at once. */
  startRecovery(): void {
    if (this.state === "recovering" || this.state === "charging") return;

    this.grid.setQuantity(QTY_MAX);

    if (this.units.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    const now = Date.now();
    this.units.forEach((unit, i) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now + i * SECURITY_SHRINK_MS;
    });
  }

  /** Call every engine frame (wired in a later task). Sweeps out any unit whose shrink window has
   * elapsed, firing the despawn poof and removing it from the DOM. Transitions
   * 'recovering' -> 'idle' once every unit has been swept. */
  tick(nowMs: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]!;
      if (unit.phase === "shrinking" && nowMs - unit.phaseStartMs >= SECURITY_SHRINK_MS) {
        this.units.splice(i, 1);
        this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
        removeSecurityUnit(unit);
      }
    }

    if (this.state === "recovering") {
      if (this.units.length === 0) this.state = "idle";
      return;
    }
  }

  /** Full teardown — call when tearing this controller down: removes all remaining
   * security units from the DOM and resets to idle. */
  destroy(): void {
    for (const unit of this.units) {
      removeSecurityUnit(unit);
    }
    this.units = [];
    this.state = "idle";
  }
}
