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

export function computeLookAtRotation(from: LookAtVector, to: LookAtVector, mode: LookAtMode): number {
  return computeLookAtAngle(from, to) * LOOKAT_GAIN[mode];
}
