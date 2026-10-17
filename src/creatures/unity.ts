export interface UnityPoint {
  x: number;
  y: number;
}

export interface UnityInput {
  points: ReadonlyArray<UnityPoint>;
  /** The crowd size that counts as "full" (the user's chosen baseline), so a deliberately
   * small crowd can still become united. */
  maxCount: number;
  /** Distinct creature kinds currently present. */
  kindCount: number;
  /** Kinds that can exist at all. While this is 1 the variety term is dropped and the other
   * weights are renormalised (only one mode exists until the mixed crowd ships). */
  kindTotal: number;
}

export interface UnityResult {
  /** Combined 0 to 1 score. */
  unity: number;
  size: number;
  cluster: number;
  variety: number;
  /** Crowd centroid in px, null with no points. */
  centroid: UnityPoint | null;
  /** Mean distance of points from the centroid in px, 0 with no points. */
  spread: number;
}

/** Placeholder weights, tuned in playtest. */
export const UNITY_WEIGHT_SIZE = 0.35;
export const UNITY_WEIGHT_CLUSTER = 0.45;
export const UNITY_WEIGHT_VARIETY = 0.2;

/** Mean distance from the centroid at or below which the crowd counts as fully clustered. */
export const CLUSTER_TIGHT_PX = 140;
/** Mean distance at or above which the crowd counts as fully scattered. */
export const CLUSTER_LOOSE_PX = 520;

/** Unity at which force is fully broken (forceFactor reaches 0). */
export const FORCE_BREAK_UNITY = 0.85;
/** Unity must fall this far below FORCE_BREAK_UNITY before a broken force recovers. */
export const FORCE_BREAK_HYSTERESIS = 0.08;
/** A winning Protest release needs at least this much unity. */
export const WIN_UNITY = 0.7;

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Pure: how united the crowd is. O(n): one pass for the centroid and one for the spread,
 * so it is cheap enough to run every frame.
 */
export function computeUnity(input: UnityInput): UnityResult {
  const { points, maxCount, kindCount, kindTotal } = input;
  const n = points.length;
  if (n === 0) {
    return { unity: 0, size: 0, cluster: 0, variety: 0, centroid: null, spread: 0 };
  }

  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const centroid = { x: sx / n, y: sy / n };

  let dist = 0;
  for (const p of points) {
    dist += Math.hypot(p.x - centroid.x, p.y - centroid.y);
  }
  const spread = dist / n;

  const size = maxCount > 0 ? clamp01(n / maxCount) : 0;
  const cluster = clamp01(1 - (spread - CLUSTER_TIGHT_PX) / (CLUSTER_LOOSE_PX - CLUSTER_TIGHT_PX));
  const hasVariety = kindTotal > 1;
  const variety = hasVariety ? clamp01((kindCount - 1) / (kindTotal - 1)) : 0;

  const wSize = UNITY_WEIGHT_SIZE;
  const wCluster = UNITY_WEIGHT_CLUSTER;
  const wVariety = hasVariety ? UNITY_WEIGHT_VARIETY : 0;
  const wTotal = wSize + wCluster + wVariety;
  const unity = clamp01((size * wSize + cluster * wCluster + variety * wVariety) / wTotal);

  return { unity, size, cluster, variety, centroid, spread };
}

/**
 * Pure: how much of its normal strength force keeps at a given unity. 1 at unity 0, 0 at
 * FORCE_BREAK_UNITY, eased with a smoothstep so it fades rather than snaps.
 */
export function forceFactor(unity: number): number {
  const t = clamp01(unity / FORCE_BREAK_UNITY);
  const eased = t * t * (3 - 2 * t);
  return 1 - eased;
}

/**
 * Pure: whether force is broken, with hysteresis so it does not flicker around the threshold.
 */
export function isForceBroken(unity: number, wasBroken: boolean): boolean {
  return wasBroken ? unity > FORCE_BREAK_UNITY - FORCE_BREAK_HYSTERESIS : unity >= FORCE_BREAK_UNITY;
}
