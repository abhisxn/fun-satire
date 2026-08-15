import { CreatureGrid } from "./CreatureGrid";
import type { SecurityUnit } from "./CreatureGrid";
import { createSecurityUnit, removeSecurityUnit, startSecurityWander } from "./SecurityCreature";
import type { SecurityUnitState } from "./SecurityCreature";
import { QTY_MAX, QTY_MIN } from "../config/tokens";

export interface MoveSample {
  x: number;
  y: number;
  t: number;
}

/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 900;
/** Direction reversals required within the window to count as a shake. */
export const SHAKE_REVERSAL_THRESHOLD = 4;
/** Below this speed (px/ms) a movement doesn't count toward a reversal. */
export const SHAKE_MIN_SPEED_PX_MS = 1.2;
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
/** Stagger between each security unit poofing away during recovery (ms). */
export const RECOVERY_POOF_INTERVAL_MS = 350;

export type RaidState = "idle" | "raiding" | "recovering";

export interface RaidControllerConfig {
  container: HTMLElement;
  grid: CreatureGrid;
  onSecurityRemoved?: (x: number, y: number, w: number, h: number) => void;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
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
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

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

    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.container, x, y);
      startSecurityWander(unit, vw, vh);
      this.units.push(unit);
    }
  }

  /** Current security units, in the shape CreatureGrid.update() expects for repulsion/catching. */
  getSecurityUnits(): SecurityUnit[] {
    return this.units.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius: SECURITY_REPEL_RADIUS,
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

  /** Wired to the Protest button: ends the raid, poofing security away and rebuilding the crowd. */
  startRecovery(): void {
    this.grid.setQuantity(QTY_MAX);

    if (this.units.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    this.popNextUnit();
  }

  private popNextUnit(): void {
    const unit = this.units.shift();
    if (unit) {
      this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
      removeSecurityUnit(unit);
    }

    if (this.units.length === 0) {
      this.state = "idle";
      this.recoveryTimer = null;
      return;
    }

    this.recoveryTimer = setTimeout(() => this.popNextUnit(), RECOVERY_POOF_INTERVAL_MS);
  }

  /** Cancels any pending recovery poof timer — call when tearing this controller down mid-recovery. */
  destroy(): void {
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}
