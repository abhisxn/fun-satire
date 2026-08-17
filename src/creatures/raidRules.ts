import { QTY_MAX } from "../config/tokens";

/** Threshold (inclusive) a released protest charge fraction must reach to count as FULL
 * power — the only winning outcome. Deliberately tight (top of the sweep) so landing it is a
 * real timing skill, not a coin flip. */
export const FULL_POWER_THRESHOLD = 0.92;
/** Below this fraction, a backfired release counts as LOW power rather than MEDIUM. */
export const MEDIUM_POWER_THRESHOLD = 0.4;
/** MEDIUM-power crowd boost: baseline * (1 + this), rounded to the nearest 10, capped at
 * QTY_BOOST_MEDIUM_CAP. */
export const QTY_BOOST_MEDIUM_FRACTION = 0.75;
export const QTY_BOOST_MEDIUM_CAP = 400;
/** LOW-power crowd boost: same shape as MEDIUM, smaller fraction and cap. */
export const QTY_BOOST_LOW_FRACTION = 0.3;
export const QTY_BOOST_LOW_CAP = 280;
/** Extra units added on top of the poofed count when a raid regroups after a MEDIUM/LOW
 * backfire — MEDIUM escalates faster than LOW (see RaidController.poofAndEscalate). */
export const BACKFIRE_ESCALATE_MEDIUM = 2;
export const BACKFIRE_ESCALATE_LOW = 1;
/** Hard cap on simultaneous security units, regardless of raid severity. */
export const SECURITY_MAX_UNITS = 40;
/** Crowd never drops below this fraction of its size when a raid started (see
 * RaidController.getRaidFloor) — RaidController's own attrition timer (RAID_ATTRITION_STEP/
 * RAID_ATTRITION_INTERVAL_MS) enforces this discretely rather than via decayTowardFloor below;
 * an existing test pins that discrete timer's exact step behavior, so unifying attrition onto
 * the shared decay curve was deliberately left as a follow-up, not done here. */
export const RAID_FLOOR_FRACTION = 0.25;

function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

export type PowerBand = "full" | "medium" | "low";

export interface PowerOutcome {
  band: PowerBand;
  /** The crowd's new count once this outcome is applied. */
  crowdCount: number;
  /** true only for "full" — the only winning outcome. */
  isWin: boolean;
}

/**
 * Pure: classifies a released protest charge fraction into one of three power bands and
 * computes the resulting crowd count. `baselineCrowdCount` must be the crowd size at the
 * moment the charge started (RaidController.chargeBaselineCount), not the current, possibly
 * already-decayed live count — MEDIUM/LOW boosts grow from that baseline.
 */
export function classifyRelease(fraction: number, baselineCrowdCount: number): PowerOutcome {
  if (fraction >= FULL_POWER_THRESHOLD) {
    return { band: "full", crowdCount: QTY_MAX, isWin: true };
  }
  const isMedium = fraction >= MEDIUM_POWER_THRESHOLD;
  const boostFraction = isMedium ? QTY_BOOST_MEDIUM_FRACTION : QTY_BOOST_LOW_FRACTION;
  const cap = isMedium ? QTY_BOOST_MEDIUM_CAP : QTY_BOOST_LOW_CAP;
  const crowdCount = Math.min(roundToTen(baselineCrowdCount * (1 + boostFraction)), cap);
  return { band: isMedium ? "medium" : "low", crowdCount, isWin: false };
}

/**
 * Pure: fraction of a starting quantity that should remain `elapsedMs` after decay began,
 * ramping from 1 down toward `floorFraction` with the given `halfLifeMs` — an exponential
 * half-life curve: at elapsedMs === halfLifeMs, exactly halfway between 1 and floorFraction
 * remains. Currently used by CreatureGrid's idle-decay (see IDLE_HALF_LIFE_MS); RaidController's
 * raid-attrition still uses its own discrete step timer rather than this curve (see
 * RAID_FLOOR_FRACTION's doc comment for why), so this is a shared *primitive*, not (yet)
 * shared by both callers it was originally designed for. Callers with a grace period before
 * decay should start (e.g. CreatureGrid's IDLE_GRACE_MS) pass `Math.max(0, elapsedMs - grace)`.
 */
export function decayTowardFloor(elapsedMs: number, floorFraction: number, halfLifeMs: number): number {
  if (elapsedMs <= 0) return 1;
  const decay = Math.pow(0.5, elapsedMs / halfLifeMs);
  return floorFraction + (1 - floorFraction) * decay;
}
