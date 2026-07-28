export const FORCEFIELD = Object.freeze({
  repelRadius: 180,
  repelStrength: 120,
  falloffExponent: 2,
} as const);

export type ForceFieldInput = {
  avatarPos: { x: number; y: number };
  entityPos: { x: number; y: number };
  repelMultiplier?: number;
};

export type ForceFieldResult = {
  fx: number;
  fy: number;
  magnitude: number;
  dirX: number;
  dirY: number;
};

const EPS = 1e-6;

export function compute(input: ForceFieldInput): ForceFieldResult {
  const dx = input.entityPos.x - input.avatarPos.x;
  const dy = input.entityPos.y - input.avatarPos.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < EPS || r >= FORCEFIELD.repelRadius) {
    return { fx: 0, fy: 0, magnitude: 0, dirX: 0, dirY: 0 };
  }
  const multiplier = Math.max(0, input.repelMultiplier ?? 1);
  const norm = 1 - r / FORCEFIELD.repelRadius;
  const mag = FORCEFIELD.repelStrength * norm * multiplier;
  const inv = 1 / r;
  return {
    fx: mag * dx * inv,
    fy: mag * dy * inv,
    magnitude: mag,
    dirX: dx * inv,
    dirY: dy * inv,
  };
}
