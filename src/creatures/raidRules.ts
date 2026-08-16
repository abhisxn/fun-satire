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
/** Crowd never drops below this fraction of its size when a raid started. */
export const RAID_FLOOR_FRACTION = 0.25;
/** Half-life (ms) of the raid-attrition decay curve — see decayTowardFloor. At this many ms
 * elapsed since the current attrition baseline was set, the crowd has decayed exactly halfway
 * from that baseline toward the floor. */
export const RAID_HALF_LIFE_MS = 45_000;

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
 * remains. Shared by CreatureGrid's idle-decay and RaidController's raid-attrition — same
 * shape, different (floorFraction, halfLifeMs) per caller. Callers with a grace period before
 * decay should start (e.g. CreatureGrid's IDLE_GRACE_MS) pass `Math.max(0, elapsedMs - grace)`.
 */
export function decayTowardFloor(elapsedMs: number, floorFraction: number, halfLifeMs: number): number {
  if (elapsedMs <= 0) return 1;
  const decay = Math.pow(0.5, elapsedMs / halfLifeMs);
  return floorFraction + (1 - floorFraction) * decay;
}
