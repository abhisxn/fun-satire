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
  const multiplier = Math.max(0, input.repelMultiplier ?? 1);
  const mag = falloff(r) * multiplier;
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

export const SEPARATION = Object.freeze({
  strength: 900,
  minStrengthFraction: 0.15,
} as const);

export type SeparationMember = { pos: { x: number; y: number }; radiusPx: number };
export type SeparationForce = { fx: number; fy: number };

export function computeSeparation(self: SeparationMember, other: SeparationMember): SeparationForce {
  const dx = self.pos.x - other.pos.x;
  const dy = self.pos.y - other.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = self.radiusPx + other.radiusPx;
  if (dist < EPS) {
    return { fx: SEPARATION.strength * SEPARATION.minStrengthFraction, fy: 0 };
  }
  if (dist >= minDist) return { fx: 0, fy: 0 };
  const overlap = minDist - dist;
  const strengthFrac = Math.max(SEPARATION.minStrengthFraction, overlap / minDist);
  const mag = SEPARATION.strength * strengthFrac;
  return { fx: (dx / dist) * mag, fy: (dy / dist) * mag };
}

export type SeparationEntry = SeparationMember & { id: number };
export type AccumulateSeparationOptions = { strengthMultiplier?: number };

export function accumulateSeparation(
  members: readonly SeparationEntry[],
  opts?: AccumulateSeparationOptions,
): Map<number, SeparationForce> {
  const strengthMultiplier = opts?.strengthMultiplier ?? 1;
  const forces = new Map<number, SeparationForce>();
  for (const m of members) forces.set(m.id, { fx: 0, fy: 0 });
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i]!;
      const b = members[j]!;
      const f = computeSeparation(a, b);
      const fa = forces.get(a.id)!;
      const fb = forces.get(b.id)!;
      forces.set(a.id, { fx: fa.fx + f.fx * strengthMultiplier, fy: fa.fy + f.fy * strengthMultiplier });
      forces.set(b.id, { fx: fb.fx - f.fx * strengthMultiplier, fy: fb.fy - f.fy * strengthMultiplier });
    }
  }
  return forces;
}
