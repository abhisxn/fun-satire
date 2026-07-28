export type LookAtVector = { x: number; y: number };

export function computeLookAtAngle(from: LookAtVector, to: LookAtVector): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export const LOOKAT_GAIN = Object.freeze({
  eyes: 0.2,
  bugs: 0.85,
  pointedFinger: 0.85,
} as const);

export type LookAtMode = keyof typeof LOOKAT_GAIN;

/**
 * Deterministic per-entity rotation-gain variance, pure function of `id` —
 * no Rng threading needed at render time, trivially reproducible in tests.
 * Gives each eye a slightly different partial-turn amount toward its target
 * (organic crowd, not every eye snapping to the identical angle), while
 * keeping the mean equal to the mode's base LOOKAT_GAIN. Range: [0.7, 1.3).
 */
export function computeLookAtDamping(id: number): number {
  const raw = Math.sin(id * 12.9898) * 43758.5453;
  const frac = raw - Math.floor(raw);
  return 0.7 + frac * 0.6;
}

export function computeLookAtRotation(
  from: LookAtVector,
  to: LookAtVector,
  mode: LookAtMode,
  perEntityDamping?: number,
): number {
  return computeLookAtAngle(from, to) * LOOKAT_GAIN[mode] * (perEntityDamping ?? 1);
}
