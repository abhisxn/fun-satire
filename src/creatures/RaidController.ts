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
import { QTY_MAX, QTY_MIN } from "../config/tokens";

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

/** Hard cap on simultaneous security units, regardless of how long shaking continues. */
export const SECURITY_MAX_UNITS = 40;
/** Repulsion radius each security unit exerts on the crowd, same model as the avatar's. */
export const SECURITY_REPEL_RADIUS = 160;
/** How far the avatar's own repel radius shrinks once a raid fully clears via a full-power
 * hold — the crowd can gather closer in the moment of winning, instead of still being held
 * at arm's length by the normal repel field (180px, see CreatureGrid's physicsParams). Set
 * here as a plain, unscaled baseline (for callers with no sticker, e.g. tests) — the value
 * actually applied once a sticker is involved gets rescaled by main.ts's onProtestWin
 * (against the sticker's live, POST-lockSqueeze width) right after this fires, since the
 * sticker itself shrinks to SQUEEZE_MIN_SCALE at the very same moment: a bigger sticker
 * (inflated by prior backfires) needs proportionally more room, a shrunk one needs less, and
 * only the sticker's own getWidth() — not this controller's frame-delayed avatarWidth —
 * reflects that shrink at the instant it actually happens. Reset the moment the next raid
 * starts (see spawnPulse). */
export const AVATAR_REPEL_RADIUS_AFTER_WIN = 190;
export const SPAWN_MIN_PER_PULSE = 2;
export const SPAWN_MAX_PER_PULSE = 3;
/** Crowd never drops below this fraction of its size when the raid started. */
export const RAID_FLOOR_FRACTION = 0.25;
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
 * ============================================================================ */
export const FULL_POWER_THRESHOLD = 0.92;
/** Below this fraction, a backfired release counts as LOW power rather than MEDIUM. */
export const MEDIUM_POWER_THRESHOLD = 0.4;
/** MEDIUM-power crowd boost: baseline * (1 + this), rounded to the nearest 10,
 * capped at QTY_BOOST_MEDIUM_CAP. */
export const QTY_BOOST_MEDIUM_FRACTION = 0.75;
export const QTY_BOOST_MEDIUM_CAP = 400;
/** LOW-power crowd boost: same shape as MEDIUM, smaller fraction and cap. */
export const QTY_BOOST_LOW_FRACTION = 0.3;
export const QTY_BOOST_LOW_CAP = 280;

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
/** Extra units added on top of the poofed count when the raid regroups — MEDIUM
 * escalates faster than LOW, mirroring the QTY_BOOST_* asymmetry above. */
export const BACKFIRE_ESCALATE_MEDIUM = 2;
export const BACKFIRE_ESCALATE_LOW = 1;

function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

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
   * now," not accumulate or count calls. */
  onCrowdSizeChanged?: (securityUnitCount: number) => void;
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
  private units: SecurityUnitState[] = [];
  /** Fire timestamps (ms) for one-by-one backfire respawns queued by poofSomeUnits() —
   * tick() spawns exactly one unit each time nowMs passes an entry. */
  private pendingRespawns: number[] = [];
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
  /** True while a 'recovering' sweep was entered via a full-power release (releaseCharge),
   * as opposed to the plain startRecovery() entry point — only the former restores the
   * avatar's post-win repel radius, and fires onProtestWin, once the sweep finishes
   * (see tick()). */
  private clearingViaProtestWin = false;
  /** True while a poofAndEscalate() regroup has outstanding respawns queued —
   * tick() notifies onCrowdSizeChanged as each respawn spawns in and the count changes. */
  private regroupInFlight = false;
  /** Last security-unit count passed to onCrowdSizeChanged — compared against
   * this.units.length once per tick() (and once after spawnPulse()'s synchronous
   * burst) so the callback fires exactly once per actual change. */
  private lastNotifiedCrowdCount = 0;
  private readonly onProtestWin: (() => void) | null;
  private readonly onRaidStart: (() => void) | null;
  private readonly onCrowdSizeChanged: ((securityUnitCount: number) => void) | null;

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
   * squeeze/inflate scale, see StickerOverlay.getWidth), so the escort radius band
   * scales correctly if the user resizes the avatar or a protest pops/inflates it
   * mid-raid. Deliberately NOT used to scale the post-win repel radius (see
   * AVATAR_REPEL_RADIUS_AFTER_WIN's call sites) — this field is only refreshed once
   * per engine frame, *before* tick() runs, so at the exact moment a win fires it
   * still holds the sticker's pre-shrink width. Scaling off it there would size the
   * radius for a sticker that's about to shrink, not the one that's actually about to
   * sit there — see main.ts's onProtestWin, which recomputes it from the sticker's
   * live width immediately after lockSqueeze() has actually applied. */
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

  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
      this.lastAttritionAtMs = Date.now();
      this.grid.setAvatarRepelRadius(null);
      this.onRaidStart?.();
    }

    const available = SECURITY_MAX_UNITS - this.units.length;
    if (available <= 0) return;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const desired = Math.round(rand(SPAWN_MIN_PER_PULSE, SPAWN_MAX_PER_PULSE));
    const n = Math.min(desired, available);
    const kinds = pickPulseKinds(n);

    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.avatarLayer, x, y, kinds[i]);
      startSecurityEntranceBurst(unit, vw, vh);
      this.units.push(unit);
    }
    assignEscortFormation(this.units);
    this.notifyCrowdSizeChanged();
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

    if (fraction >= FULL_POWER_THRESHOLD) {
      this.grid.setQuantity(QTY_MAX);
      // A complete win cancels any regrouping a prior MEDIUM/LOW release already
      // queued — otherwise those respawns would still trickle in afterward.
      this.pendingRespawns = [];
      this.regroupInFlight = false;
      if (this.units.length === 0) {
        this.state = "idle";
        this.grid.setAvatarRepelRadius(AVATAR_REPEL_RADIUS_AFTER_WIN);
        this.onProtestWin?.();
        return;
      }
      this.state = "recovering";
      this.clearingViaProtestWin = true;
      this.beginUnitsShrinkSweep();
      // onProtestWin fires later, in tick(), once the despawn sweep actually finishes.
      return;
    }

    // MEDIUM or LOW power: backfire. Grant the capped crowd boost for this band
    // *before* spawning, so the raid's attrition floor (raidStartCount, set by
    // spawnPulse below on a fresh raid) is computed from the boosted total —
    // the raid then despawns creatures back down from that peak over time.
    const isMedium = fraction >= MEDIUM_POWER_THRESHOLD;
    const boostFraction = isMedium ? QTY_BOOST_MEDIUM_FRACTION : QTY_BOOST_LOW_FRACTION;
    const cap = isMedium ? QTY_BOOST_MEDIUM_CAP : QTY_BOOST_LOW_CAP;
    const boosted = Math.min(roundToTen(this.chargeBaselineCount * (1 + boostFraction)), cap);
    this.grid.setQuantity(boosted);

    if (!this.chargeStartedDuringRaid) {
      // No raid running when this charge began — starts one immediately, exactly
      // like a shake. spawnPulse() only runs its idle->raiding initialization when
      // the prior state is 'idle', so set that explicitly first. The spawn burst is
      // near-instant (no queued delay), so spawnPulse()'s own notifyCrowdSizeChanged()
      // call covers it — no separate notification needed here.
      this.state = "idle";
      this.spawnPulse(this.lastAvatarX, this.lastAvatarY);
      return;
    }

    // A raid is already running: it regroups AND escalates rather than just topping
    // up — some units poof out now, and more than that many trickle back in one at a
    // time after a beat (see poofAndEscalate()). MEDIUM escalates harder than LOW.
    this.state = "raiding";
    this.poofAndEscalate(isMedium ? BACKFIRE_ESCALATE_MEDIUM : BACKFIRE_ESCALATE_LOW);
  }

  /** Marks a portion (BACKFIRE_POOF_FRACTION, min 1 if any units are standing) of the
   * currently-standing units shrinking right away — same despawn animation/sound as a
   * win — then queues poofCount + bonusSpawn one-by-one respawns, staggered
   * BACKFIRE_RESPAWN_STAGGER_MS apart, starting BACKFIRE_RESPAWN_DELAY_MS from now (see
   * tick()). Queuing more respawns than were poofed is the escalation: each failed
   * protest attempt grows the raid, capped by SECURITY_MAX_UNITS at spawn time. */
  private poofAndEscalate(bonusSpawn: number): void {
    const now = Date.now();
    const standing = this.units.filter((u) => u.phase !== "shrinking");
    const poofCount =
      standing.length === 0 ? 0 : Math.min(standing.length, Math.max(1, Math.round(standing.length * BACKFIRE_POOF_FRACTION)));
    standing.slice(0, poofCount).forEach((unit) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now;
    });
    const respawnCount = poofCount + bonusSpawn;
    for (let i = 0; i < respawnCount; i++) {
      this.pendingRespawns.push(now + BACKFIRE_RESPAWN_DELAY_MS + i * BACKFIRE_RESPAWN_STAGGER_MS);
    }
    // The crowd-size-changed notification for these respawns fires later, from
    // tick(), as each one actually spawns in — not here, before any of them exist.
    this.regroupInFlight = true;
  }

  /** Instantly triggers full recovery without a hold — a direct entry point kept for
   * callers that don't go through the charge mechanic (a later task). Marks every unit
   * shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so they pop out one
   * after another as tick() sweeps them, rather than all vanishing at once. */
  startRecovery(): void {
    if (this.state === "recovering" || this.state === "charging") return;

    this.grid.setQuantity(QTY_MAX);
    this.pendingRespawns = [];
    this.regroupInFlight = false;

    if (this.units.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    this.beginUnitsShrinkSweep();
  }

  /** Marks every unit shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so
   * they pop out one after another as tick() sweeps them, rather than all vanishing
   * at once. */
  private beginUnitsShrinkSweep(): void {
    const now = Date.now();
    this.units.forEach((unit, i) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now + i * SECURITY_SHRINK_MS;
    });
  }

  /** Call every engine frame (see main.ts). Sweeps out any unit whose shrink window has
   * elapsed, firing the despawn poof and removing it from the DOM. Transitions
   * 'recovering' -> 'idle' once every unit has been swept (restoring the post-win avatar
   * repel radius if that sweep was entered via a full-power release), and while
   * 'charging', sweeps chargeFraction back and forth across [0, 1] for the power meter to
   * read — see releaseCharge() for where that fraction actually gets evaluated. */
  tick(nowMs: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]!;
      if (unit.phase === "shrinking" && nowMs - unit.phaseStartMs >= SECURITY_SHRINK_MS) {
        this.units.splice(i, 1);
        this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
        removeSecurityUnit(unit);
      }
    }

    if (this.pendingRespawns.length > 0) {
      let spawnedAny = false;
      for (let i = this.pendingRespawns.length - 1; i >= 0; i--) {
        if (nowMs < this.pendingRespawns[i]!) continue;
        this.pendingRespawns.splice(i, 1);
        if (this.units.length >= SECURITY_MAX_UNITS) continue;
        const unit = createSecurityUnit(this.avatarLayer, this.lastAvatarX, this.lastAvatarY, pickSecurityKind());
        const vw = this.container.clientWidth || window.innerWidth;
        const vh = this.container.clientHeight || window.innerHeight;
        startSecurityEntranceBurst(unit, vw, vh);
        this.units.push(unit);
        spawnedAny = true;
      }
      if (spawnedAny) assignEscortFormation(this.units);
      if (this.regroupInFlight && this.pendingRespawns.length === 0) {
        this.regroupInFlight = false;
      }
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
      if (this.units.length === 0) {
        this.state = "idle";
        if (this.clearingViaProtestWin) {
          this.clearingViaProtestWin = false;
          this.grid.setAvatarRepelRadius(AVATAR_REPEL_RADIUS_AFTER_WIN);
          this.onProtestWin?.();
        }
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
      this.onCrowdSizeChanged?.(this.units.length);
    }
  }

  /** Full teardown — call when tearing this controller down: removes all remaining
   * security units from the DOM and resets to idle. */
  destroy(): void {
    for (const unit of this.units) {
      removeSecurityUnit(unit);
    }
    this.units = [];
    this.pendingRespawns = [];
    this.regroupInFlight = false;
    this.state = "idle";
  }
}
