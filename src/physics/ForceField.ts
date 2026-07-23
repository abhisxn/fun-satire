export const FORCEFIELD = Object.freeze({
  repulsionMinR: 24,
  repulsionMaxR: 220,
  repulsionPeak: 850,
  falloffExponent: 2,
} as const);

export type ForceFieldInput = {
  cursor: { x: number; y: number; active: boolean };
  entityPos: { x: number; y: number };
  entityScale?: number;
};

export type ForceFieldResult = {
  fx: number;
  fy: number;
  magnitude: number;
  dirX: number;
  dirY: number;
};

const EPS = 1e-6;

export function clampR(r: number): number {
  if (!Number.isFinite(r) || r < FORCEFIELD.repulsionMinR) return FORCEFIELD.repulsionMinR;
  if (r > FORCEFIELD.repulsionMaxR) return FORCEFIELD.repulsionMaxR;
  return r;
}

export function falloff(r: number): number {
  const cr = clampR(r);
  if (cr >= FORCEFIELD.repulsionMaxR) return 0;
  const norm = 1 - cr / FORCEFIELD.repulsionMaxR;
  const e = FORCEFIELD.falloffExponent;
  return FORCEFIELD.repulsionPeak * Math.pow(norm, e);
}

export function compute(input: ForceFieldInput): ForceFieldResult {
  if (!input.cursor.active) {
    return { fx: 0, fy: 0, magnitude: 0, dirX: 0, dirY: 0 };
  }
  const dx = input.entityPos.x - input.cursor.x;
  const dy = input.entityPos.y - input.cursor.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < EPS) {
    return { fx: 0, fy: 0, magnitude: 0, dirX: 0, dirY: 0 };
  }
  const mag = falloff(r);
  const inv = 1 / r;
  return {
    fx: mag * dx * inv,
    fy: mag * dy * inv,
    magnitude: mag,
    dirX: dx * inv,
    dirY: dy * inv,
  };
}

export type SampleRayInput = {
  origin: { x: number; y: number };
  dir: { x: number; y: number };
  maxDist: number;
  samples?: number;
};

export type RaySample = { t: number; strength: number };

export function sampleAlongRay(
  origin: { x: number; y: number },
  cursor: { x: number; y: number; active: boolean },
  input: SampleRayInput,
): RaySample[] {
  const count = input.samples ?? 16;
  if (count <= 0) return [];
  if (!cursor.active) return new Array(count).fill({ t: 0, strength: 0 });
  const dx = input.dir.x;
  const dy = input.dir.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = len < EPS ? 0 : dx / len;
  const uy = len < EPS ? 0 : dy / len;
  const out: RaySample[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const px = origin.x + ux * input.maxDist * t;
    const py = origin.y + uy * input.maxDist * t;
    const r = Math.sqrt((cursor.x - px) ** 2 + (cursor.y - py) ** 2);
    out.push({ t, strength: falloff(r) / FORCEFIELD.repulsionPeak });
  }
  return out;
}
