import { CreatureGrid } from "./CreatureGrid";
import type { SecurityUnit } from "./CreatureGrid";
import {
  createSecurityUnit,
  removeSecurityUnit,
  startSecurityEntranceBurst,
  pickSecurityKind,
  computeSecurityShrinkFraction,
  SECURITY_SHRINK_MS,
  assignEscortFormation,
  applyEscortStep,
  applySecurityCollisions,
  applyEscortRangeConstraint,
  SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH,
} from "./SecurityCreature";
import type { SecurityUnitState, SecurityKind } from "./SecurityCreature";
import {
  classifyRelease,
  SECURITY_MAX_UNITS,
  RAID_FLOOR_FRACTION,
  BACKFIRE_ESCALATE_MEDIUM,
  BACKFIRE_ESCALATE_LOW,
} from "./raidRules";
import { EntityPool } from "./EntityPool";
import { QTY_MIN } from "../config/tokens";

export {
  FULL_POWER_THRESHOLD,
  MEDIUM_POWER_THRESHOLD,
  SECURITY_MAX_UNITS,
} from "./raidRules";

export interface MoveSample {
  x: number;
  y: number;
  t: number;
}

/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 1100;
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
      // Skip this sample without discarding the pending direction: a real
      // shake naturally decelerates toward zero speed at the exact moment
      // it reverses, so the sample right at a reversal is the one most
      // likely to dip below the speed floor. Resetting havePrev here would
      // throw away the direction from just before the deceleration,
      // undercounting exactly the reversals we're trying to detect.
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

/** Repulsion radius each security unit exerts on the crowd at the reference avatar size
 * (SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH) — getSecurityUnits() scales this by the sticker's
 * current width, same as the escort band, so a bigger sticker's security detail pushes the
 * crowd back proportionally further. */
export const SECURITY_REPEL_RADIUS = 160;
export const SPAWN_MIN_PER_PULSE = 2;
export const SPAWN_MAX_PER_PULSE = 3;
/** How often the raid drains the crowd toward the raid floor while unaddressed (ms). */
export const RAID_ATTRITION_INTERVAL_MS = 400;
/** How many creatures the crowd loses per attrition tick. */
export const RAID_ATTRITION_STEP = 1;
/** Time (ms) for the power meter to sweep one-way across the full track while held —
 * a full back-and-forth cycle is twice this. Fast enough to read as "rapidly moves left
 * to right" rather than a steady fill, since the meter is a power-selector minigame now:
 * wherever it lands at release is the strength that gets applied, not a fixed-duration
 * charge-to-completion. */
export const CHARGE_SWEEP_HALF_PERIOD_MS = 1100;

/** ============================================================================
 * Protest power bands — releaseCharge() reads the sweeping chargeFraction at
 * the exact moment of release and sorts it into one of three bands. Each band
 * has a completely different payoff, by design:
 *
 *   FULL   [FULL_POWER_THRESHOLD, 1]      — the only winning outcome. Crowd maxes
 *                                            out, any raid is fully cleared, the
 *                                            sticker's shrink locks in permanently
 *                                            (see StickerOverlay.lockSqueeze).
 *   MEDIUM [MEDIUM_POWER_THRESHOLD, FULL) — backfires: spawns/reinforces a raid.
 *                                            Crowd gets a capped partial boost
 *                                            that then bleeds down via the normal
 *                                            raiding attrition — a real but
 *                                            survivable setback.
 *   LOW    [0, MEDIUM_POWER_THRESHOLD)    — backfires harder: same raid
 *                                            spawn/reinforcement, but a smaller,
 *                                            lower-capped crowd boost.
 *
 * FULL is deliberately tight (top of the sweep, not merely "strong") so landing
 * it is a real timing skill, not a coin flip. MEDIUM and LOW never clear a raid
 * and never lock the sticker's shrink — only a full-power release does either.
 *
 * The thresholds themselves, and the crowd count each band resolves to, live in
 * raidRules.ts (classifyRelease) — releaseCharge() below just applies the outcome.
 * FULL_POWER_THRESHOLD / MEDIUM_POWER_THRESHOLD / SECURITY_MAX_UNITS are re-exported
 * from this module (see the top of the file) so existing import sites are unaffected.
 * ============================================================================ */

/** MEDIUM/LOW backfire, when a raid is already running: some of the standing units
 * visibly poof out (same despawn animation/sound as a win), then MORE than that many
 * trickle back in one at a time, each BACKFIRE_RESPAWN_STAGGER_MS apart, starting
 * BACKFIRE_RESPAWN_DELAY_MS after the poof. This is deliberately escalating, not a
 * 1:1 replace — every failed protest attempt should make the raid meaningfully worse
 * (bounded by SECURITY_MAX_UNITS), which is what makes landing FULL power feel worth
 * chasing instead of a raid that just idles in place while you fumble the timing. */
export const BACKFIRE_POOF_FRACTION = 0.4;
export const BACKFIRE_RESPAWN_DELAY_MS = 4500;
export const BACKFIRE_RESPAWN_STAGGER_MS = 500;

export type RaidState = "idle" | "raiding" | "recovering" | "charging";

export interface RaidControllerConfig {
  container: HTMLElement;
  grid: CreatureGrid;
  /** DOM parent security units are appended into — must be the avatar's own parent (not
   * `#stage`, which establishes a higher-z-index stacking context) so SECURITY_Z_INDEX vs
   * StickerOverlay.STICKER_Z_INDEX comparisons are meaningful. `container` is still used,
   * unchanged, for viewport-size reads. */
  avatarLayer: HTMLElement;
  onSecurityRemoved?: (x: number, y: number, w: number, h: number) => void;
  /** Fired once a full-power protest release has actually finished paying off on
   * screen — immediately if no raid was running (nothing to despawn), or once every
   * unit's despawn sweep has visually completed (a raid was running). Never fires
   * for a MEDIUM/LOW backfire, and never fires early — a caller reacting to "the
   * win landed" (e.g. locking a sticker's shrink) should use this rather than
   * releaseCharge()'s return, which happens before any despawn animation plays. */
  onProtestWin?: () => void;
  /** Fired at the idle->raiding transition inside spawnPulse() — i.e. the moment a
   * fresh raid actually starts (a shake, or a MEDIUM/LOW standalone-charge backfire).
   * The correct trigger for un-clocking a sticker's win-lock: a subsequent
   * MEDIUM/LOW backfire on an already-running raid must NOT unlock it, only a brand
   * new raid should. */
  onRaidStart?: () => void;
  /** Fired whenever the live security unit count actually changes — staggered
   * backfire respawns trickling in, or the staggered despawn sweep (win or
   * startRecovery()) removing units one at a time. Checked once per tick() call
   * (and once after spawnPulse()'s synchronous burst) against the last-notified
   * count, so it fires exactly once per real change, never once per frame
   * regardless of whether anything changed. A caller mapping this to a continuous
   * visual (e.g. sticker scale) should treat every call as "the raid's size right
   * now," not accumulate or count calls.
   *
   * `tierBump` is 1 if the most recent backfire that shaped this raid was
   * MEDIUM-power, 0 otherwise (LOW-power, or no backfire yet this raid) — a
   * caller quantizing crowd size into a small number of visual tiers can add
   * this on top so a MEDIUM backfire "compounds" into a visibly bigger jump
   * than a LOW one at the same crowd size. Reset to 0 the moment a brand new
   * raid starts (onRaidStart) — a backfire on an *already-running* raid keeps
   * contributing its bump until the next raid begins, but never carries over
   * into a fresh one. */
  onCrowdSizeChanged?: (securityUnitCount: number, tierBump: 0 | 1) => void;
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
  private readonly avatarLayer: HTMLElement;
  private readonly onSecurityRemoved: ((x: number, y: number, w: number, h: number) => void) | null;

  private state: RaidState = "idle";
  /** Owns every security unit's spawn/despawn lifecycle bookkeeping: which units exist, which
   * are mid-shrink, which staggered backfire respawns are still pending, and when a whole
   * despawn/respawn batch has actually landed (its onSettled). This controller keeps only the
   * game rules — the pool keeps the timers. */
  private readonly securityPool = new EntityPool<SecurityUnitState>({
    onDespawn: (unit) => {
      this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
      removeSecurityUnit(unit);
      // Notified per removal, not once per tick, so a caller mapping unit count to a visual
      // sees the count hit 0 *before* the despawn batch's onSettled fires the win payoff
      // (main.ts's onProtestWin locks the sticker's scale, after which onCrowdSizeChanged is
      // deliberately a no-op — so the final 0 has to land first). The once-per-tick call at
      // the end of tick() still covers spawns and is a no-op when this already fired.
      this.notifyCrowdSizeChanged();
    },
  });
  /** Backfire respawns handed to the pool but not yet fired — counted here so the
   * SECURITY_MAX_UNITS cap accounts for units that are queued but not yet on screen. */
  private scheduledSpawnCount = 0;
  private moveBuffer: MoveSample[] = [];
  private lastPulseAtMs = -Infinity;
  private raidStartCount = 0;
  private lastAvatarX = 0;
  private lastAvatarY = 0;
  private avatarWidth = SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH;
  private chargeStartAtMs = 0;
  /** Crowd quantity at the moment the current charge started — the baseline the
   * MEDIUM/LOW power boost formulas grow from (see releaseCharge). */
  private chargeBaselineCount = 0;
  /** Whether a raid was actually in progress when this charge began (captured in
   * startCharging, since `state` itself gets overwritten to 'charging'). Deliberately
   * NOT re-derived from `this.units.length === 0` at release time — poofSomeUnits()
   * can leave units.length at 0 for a few seconds between a poof and its queued
   * respawns, and treating that gap as "no raid" would let a same-raid MEDIUM/LOW
   * release wrongly take the fresh-raid spawnPulse() branch, stacking a full burst
   * on top of the respawns already queued from the poof that's still pending. */
  private chargeStartedDuringRaid = false;
  private chargeFraction = 0;
  private lastAttritionAtMs = 0;
  /** Last security-unit count passed to onCrowdSizeChanged — compared against
   * this.units.length once per tick() (and once after spawnPulse()'s synchronous
   * burst) so the callback fires exactly once per actual change. */
  private lastNotifiedCrowdCount = 0;
  /** Power band of the most recent MEDIUM/LOW backfire that shaped the current raid —
   * null before any backfire this raid (or once a new raid starts). Threaded into
   * onCrowdSizeChanged as tierBump so a caller's tiered visual can read a MEDIUM
   * backfire as a bigger jump than a LOW one at the same crowd size. */
  private lastBackfireBand: "medium" | "low" | null = null;
  private readonly onProtestWin: (() => void) | null;
  private readonly onRaidStart: (() => void) | null;
  private readonly onCrowdSizeChanged: ((securityUnitCount: number, tierBump: 0 | 1) => void) | null;

  constructor(config: RaidControllerConfig) {
    this.container = config.container;
    this.grid = config.grid;
    this.avatarLayer = config.avatarLayer;
    this.onSecurityRemoved = config.onSecurityRemoved ?? null;
    this.onProtestWin = config.onProtestWin ?? null;
    this.onRaidStart = config.onRaidStart ?? null;
    this.onCrowdSizeChanged = config.onCrowdSizeChanged ?? null;
  }

  /** Feed every avatar drag-move point through here; internally detects shake and spawns raids. */
  onAvatarMove(x: number, y: number): void {
    this.lastAvatarX = x;
    this.lastAvatarY = y;
    if (this.state === "recovering" || this.state === "charging") return;

    const now = Date.now();
    this.moveBuffer.push({ x, y, t: now });
    const cutoff = now - SHAKE_WINDOW_MS;
    this.moveBuffer = this.moveBuffer.filter((s) => s.t >= cutoff);

    if (now - this.lastPulseAtMs < SHAKE_PULSE_COOLDOWN_MS) return;
    if (!detectShake(this.moveBuffer)) return;

    this.lastPulseAtMs = now;
    this.spawnPulse(x, y);
  }

  /** Called every frame with the avatar's current on-screen width (including its live
   * squeeze/inflate scale, see StickerOverlay.getWidth), so both the escort radius band
   * and getSecurityUnits()'s repel radius scale correctly if the user resizes the avatar
   * or a protest pops/inflates it mid-raid. The avatar-vs-*crowd* repel radius (as
   * opposed to security-vs-crowd, scaled here) is a separate concern owned entirely by
   * main.ts, computed directly from the sticker's own getWidth() every frame — not
   * threaded through this field, since main.ts already has the sticker instance and
   * doesn't need this controller as a relay. */
  setAvatarWidth(width: number): void {
    this.avatarWidth = width;
  }

  /** Keeps lastAvatarX/Y current every frame, independent of drag events — onAvatarMove
   * only fires while the avatar is actively being dragged, so without this, resizing the
   * avatar (corner handle or pinch) without also dragging it would leave the escort ring
   * centered on a stale pre-resize position. No shake-detection side effects here, unlike
   * onAvatarMove — this is purely a position sync. */
  syncAvatarCenter(x: number, y: number): void {
    this.lastAvatarX = x;
    this.lastAvatarY = y;
  }

  /** Every security unit the pool is still tracking, in spawn order, whatever their phase
   * (escorting or mid-shrink) — the single read path this controller's physics, formation and
   * count checks all go through. */
  private get units(): SecurityUnitState[] {
    return this.securityPool.allRefs;
  }

  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
      this.lastAttritionAtMs = Date.now();
      // Reset for a genuine new raid (a shake). The standalone-charge backfire path
      // in releaseCharge() also routes through here (it calls spawnPulse() to start
      // the raid) and re-sets this right after — that assignment intentionally wins.
      this.lastBackfireBand = null;
      this.onRaidStart?.();
    }

    const available = SECURITY_MAX_UNITS - this.units.length;
    if (available <= 0) return;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const desired = Math.round(rand(SPAWN_MIN_PER_PULSE, SPAWN_MAX_PER_PULSE));
    const n = Math.min(desired, available);
    const kinds = pickPulseKinds(n);

    // Spawned straight into the pool via add(), not spawnScheduled() — a shake pulse has no
    // delay or stagger; only the backfire trickle-in (poofAndEscalate) is scheduled.
    this.securityPool.add(
      kinds.map((kind) => {
        const unit = createSecurityUnit(this.avatarLayer, x, y, kind);
        startSecurityEntranceBurst(unit, vw, vh);
        return unit;
      }),
    );
    assignEscortFormation(this.units);
    this.notifyCrowdSizeChanged();
  }

  /** Current security units, in the shape CreatureGrid.update() expects for repulsion/catching. */
  getSecurityUnits(): SecurityUnit[] {
    const now = Date.now();
    // Same size-proportional scale as the escort band (currentEscortRadius in
    // SecurityCreature.ts) — a bigger sticker's security detail pushes the crowd back
    // proportionally further, a shrunk one lets them approach closer.
    const sizeScale = this.avatarWidth / SECURITY_ESCORT_REFERENCE_AVATAR_WIDTH;
    return this.units.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius:
        (u.phase === "shrinking"
          ? SECURITY_REPEL_RADIUS * computeSecurityShrinkFraction(u.phaseStartMs, now)
          : SECURITY_REPEL_RADIUS) * sizeScale,
    }));
  }

  /** Floor the crowd should never drop below — respected by both CreatureGrid's raidFloor
   * param (currently unused post-catch-removal, kept for signature compatibility) and
   * RaidController.tick()'s own attrition drain. */
  getRaidFloor(): number {
    if (this.state === "idle") return QTY_MIN;
    return Math.max(QTY_MIN, Math.round(this.raidStartCount * RAID_FLOOR_FRACTION));
  }

  getState(): RaidState {
    return this.state;
  }

  getChargeFraction(): number {
    return this.chargeFraction;
  }

  /** Wired to the Protest button's pointerdown. Works whether a raid is in progress
   * (state 'raiding') or not (state 'idle') — Protest is a standalone action, not
   * something gated behind an active raid. No-op while already charging/recovering.
   * Starts the power meter sweeping (see tick()) — the fraction it lands on at release
   * is what gets evaluated, not how long the button was held. */
  startCharging(): void {
    if (this.state !== "raiding" && this.state !== "idle") return;
    this.chargeStartedDuringRaid = this.state === "raiding";
    this.state = "charging";
    this.chargeStartAtMs = Date.now();
    this.chargeBaselineCount = this.grid.getCreatureCount();
    this.chargeFraction = 0;
  }

  /** Wired to the Protest button's pointerup/pointerleave/pointercancel: whatever
   * fraction the sweeping meter reads at this exact moment sorts into one of the
   * three power bands documented above FULL_POWER_THRESHOLD. Only FULL wins;
   * MEDIUM and LOW both backfire (spawn/reinforce a raid) and differ only in how
   * much of a capped crowd boost they grant before the raid's normal attrition
   * (see tick()) starts bleeding it back down. */
  releaseCharge(): void {
    if (this.state !== "charging") return;

    const fraction = this.chargeFraction;
    this.chargeFraction = 0;
    const outcome = classifyRelease(fraction, this.chargeBaselineCount);

    if (outcome.isWin) {
      // A win restores the user's own chosen crowd size (see CreatureGrid.setUserQuantity),
      // not classifyRelease's own QTY_MAX — a full-power win means "back to how you had it,"
      // not "always maxed out," so someone who deliberately dialed the crowd down keeps that
      // choice through a raid.
      this.grid.setQuantity(this.grid.getUserQuantityBaseline());
      // A complete win cancels any regrouping a prior MEDIUM/LOW release already
      // queued — otherwise those respawns would still trickle in afterward.
      this.securityPool.cancelScheduledSpawns();
      this.scheduledSpawnCount = 0;
      this.lastBackfireBand = null;
      if (this.units.length === 0) {
        this.state = "idle";
        this.onProtestWin?.();
        return;
      }
      this.state = "recovering";
      // The payoff is handed to the despawn batch's onSettled rather than polled in tick():
      // it fires exactly once, the moment the last unit has actually left the screen.
      this.beginUnitsShrinkSweep(() => {
        this.onProtestWin?.();
      });
      return;
    }

    // MEDIUM or LOW power: backfire. Grant the capped crowd boost for this band
    // *before* spawning, so the raid's attrition floor (raidStartCount, set by
    // spawnPulse below on a fresh raid) is computed from the boosted total —
    // the raid then despawns creatures back down from that peak over time.
    this.grid.setQuantity(outcome.crowdCount);

    if (!this.chargeStartedDuringRaid) {
      // No raid running when this charge began — starts one immediately, exactly
      // like a shake. spawnPulse() only runs its idle->raiding initialization when
      // the prior state is 'idle', so set that explicitly first. The spawn burst is
      // near-instant (no queued delay), so spawnPulse()'s own notifyCrowdSizeChanged()
      // call covers it — no separate notification needed here. lastBackfireBand is set
      // AFTER spawnPulse() returns: spawnPulse()'s own idle->raiding transition resets
      // it to null first (see spawnPulse), and this assignment must win over that reset.
      this.state = "idle";
      this.spawnPulse(this.lastAvatarX, this.lastAvatarY);
      this.lastBackfireBand = outcome.band === "medium" ? "medium" : "low";
      return;
    }

    // A raid is already running: it regroups AND escalates rather than just topping
    // up — some units poof out now, and more than that many trickle back in one at a
    // time after a beat (see poofAndEscalate()). MEDIUM escalates harder than LOW.
    this.state = "raiding";
    this.lastBackfireBand = outcome.band === "medium" ? "medium" : "low";
    this.poofAndEscalate(outcome.band === "medium" ? BACKFIRE_ESCALATE_MEDIUM : BACKFIRE_ESCALATE_LOW);
  }

  /** Marks a portion (BACKFIRE_POOF_FRACTION, min 1 if any units are standing) of the
   * currently-standing units shrinking right away — same despawn animation/sound as a
   * win — then queues poofCount + bonusSpawn one-by-one respawns, staggered
   * BACKFIRE_RESPAWN_STAGGER_MS apart, starting BACKFIRE_RESPAWN_DELAY_MS from now (see
   * tick()). Queuing more respawns than were poofed is the escalation: each failed
   * protest attempt grows the raid, capped by SECURITY_MAX_UNITS at queue time (counting
   * both standing units and respawns still queued from earlier backfires). */
  private poofAndEscalate(bonusSpawn: number): void {
    const now = Date.now();
    const standing = this.units.filter((u) => u.phase !== "shrinking");
    const poofCount =
      standing.length === 0 ? 0 : Math.min(standing.length, Math.max(1, Math.round(standing.length * BACKFIRE_POOF_FRACTION)));
    const targets = standing.slice(0, poofCount);
    targets.forEach((unit) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now;
    });
    this.securityPool.despawn(targets, SECURITY_SHRINK_MS);

    // Capped against both the units on screen and the ones already queued, so a run of
    // backfires can never queue its way past SECURITY_MAX_UNITS.
    const respawnCount = Math.max(
      0,
      Math.min(poofCount + bonusSpawn, SECURITY_MAX_UNITS - this.units.length - this.scheduledSpawnCount),
    );
    this.scheduledSpawnCount += respawnCount;
    this.securityPool.spawnScheduled({
      count: respawnCount,
      factory: () => {
        const unit = createSecurityUnit(this.avatarLayer, this.lastAvatarX, this.lastAvatarY, pickSecurityKind());
        const vw = this.container.clientWidth || window.innerWidth;
        const vh = this.container.clientHeight || window.innerHeight;
        startSecurityEntranceBurst(unit, vw, vh);
        return unit;
      },
      staggerMs: BACKFIRE_RESPAWN_STAGGER_MS,
      delayMs: BACKFIRE_RESPAWN_DELAY_MS,
    });
    // The crowd-size-changed notification for these respawns fires later, from
    // tick(), as each one actually spawns in — not here, before any of them exist.
  }

  /** Instantly triggers full recovery without a hold — a direct entry point kept for
   * callers that don't go through the charge mechanic (a later task). Marks every unit
   * shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so they pop out one
   * after another as tick() sweeps them, rather than all vanishing at once. */
  startRecovery(): void {
    if (this.state === "recovering" || this.state === "charging") return;

    // Same "back to how you had it" rule as a full-power win (see releaseCharge) — this is
    // just the direct, no-hold entry point to the same recovery.
    this.grid.setQuantity(this.grid.getUserQuantityBaseline());
    this.securityPool.cancelScheduledSpawns();
    this.scheduledSpawnCount = 0;

    if (this.units.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    this.beginUnitsShrinkSweep();
  }

  /** Marks every unit shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so they
   * pop out one after another, and hands the whole despawn batch to the pool so `onSettled`
   * fires exactly once every unit has actually been removed. */
  private beginUnitsShrinkSweep(onSettled?: () => void): void {
    const now = Date.now();
    const units = this.units;
    units.forEach((unit, i) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now + i * SECURITY_SHRINK_MS;
    });
    this.securityPool.despawn(units, SECURITY_SHRINK_MS, { staggerMs: SECURITY_SHRINK_MS, onSettled });
  }

  /** Call every engine frame (see main.ts). Drives the security pool, which sweeps out any
   * unit whose shrink window has elapsed (firing the despawn poof and removing it from the
   * DOM) and fires any due backfire respawn. Transitions 'recovering' -> 'idle' once every
   * unit has been swept — the post-win avatar repel radius and onProtestWin ride on the
   * despawn batch's own onSettled rather than being polled here — and while
   * 'charging', sweeps chargeFraction back and forth across [0, 1] for the power meter to
   * read — see releaseCharge() for where that fraction actually gets evaluated. */
  tick(nowMs: number): void {
    // One call drives every unit's lifecycle: elapsed shrink windows get removed (firing
    // onSecurityRemoved via the pool's onDespawn), due backfire respawns get created, and
    // either batch's onSettled fires the instant it fully lands.
    const { spawned } = this.securityPool.tick(nowMs);
    if (spawned.length > 0) {
      this.scheduledSpawnCount = Math.max(0, this.scheduledSpawnCount - spawned.length);
      assignEscortFormation(this.units);
    }

    for (const unit of this.units) {
      applyEscortStep(unit, this.lastAvatarX, this.lastAvatarY, nowMs, this.avatarWidth);
      applyEscortRangeConstraint(unit, this.lastAvatarX, this.lastAvatarY, this.avatarWidth);
    }
    applySecurityCollisions(this.units);
    this.notifyCrowdSizeChanged();

    if (this.state === "raiding" && nowMs - this.lastAttritionAtMs >= RAID_ATTRITION_INTERVAL_MS) {
      this.lastAttritionAtMs = nowMs;
      const floor = this.getRaidFloor();
      const current = this.grid.getCreatureCount();
      if (current > floor) {
        this.grid.setQuantity(current - RAID_ATTRITION_STEP);
      }
    }

    if (this.state === "recovering") {
      // The win payoff itself already fired from the despawn batch's onSettled (see
      // releaseCharge) — all that's left is the state transition, shared with the plain
      // startRecovery() entry point that has no payoff.
      if (this.units.length === 0) {
        this.state = "idle";
      }
      return;
    }

    if (this.state !== "charging") return;

    const elapsed = nowMs - this.chargeStartAtMs;
    const period = CHARGE_SWEEP_HALF_PERIOD_MS * 2;
    const cyclePos = (elapsed % period) / CHARGE_SWEEP_HALF_PERIOD_MS;
    this.chargeFraction = cyclePos <= 1 ? cyclePos : 2 - cyclePos;
  }

  /** Compares the live unit count against the last value passed to
   * onCrowdSizeChanged, firing the callback (and updating the stored value) only
   * when it actually changed — called once per tick() and once after
   * spawnPulse()'s synchronous burst, so a caller sees exactly one notification
   * per real change, never one per frame regardless of whether anything moved. */
  private notifyCrowdSizeChanged(): void {
    if (this.units.length !== this.lastNotifiedCrowdCount) {
      this.lastNotifiedCrowdCount = this.units.length;
      const tierBump: 0 | 1 = this.lastBackfireBand === "medium" ? 1 : 0;
      this.onCrowdSizeChanged?.(this.units.length, tierBump);
    }
  }

  /** Full teardown — call when tearing this controller down: removes all remaining
   * security units from the DOM and resets to idle. */
  destroy(): void {
    for (const unit of this.units) {
      removeSecurityUnit(unit);
    }
    this.securityPool.removeAll();
    this.scheduledSpawnCount = 0;
    this.state = "idle";
  }
}
