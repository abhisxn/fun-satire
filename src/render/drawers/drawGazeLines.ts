// src/render/drawers/drawGazeLines.ts
import type { FieldLine } from "./drawFieldLines";

export type GazeLineEye = { id: number; pos: { x: number; y: number } };

export type GazeSubjectPos = { id: number; pos: { x: number; y: number } };

export type GazeLineInput = {
  eyes: readonly GazeLineEye[];
  subjects: readonly GazeSubjectPos[];
  lockedSubjectId: number | null;
  assistRadiusPx: number;
  chargeT: number;
};

const GAZE_LINE = Object.freeze({
  baseOpacity: 0.12,
  proximityWeight: 0.35,
  chargeWeight: 0.5,
} as const);

export function computeGazeLines(input: GazeLineInput): FieldLine[] {
  const { eyes, subjects, assistRadiusPx, chargeT } = input;
  const lockedSubjectId = input.lockedSubjectId ?? null;

  if (subjects.length === 0) return [];

  const lockedTarget =
    lockedSubjectId !== null ? subjects.find((s) => s.id === lockedSubjectId) ?? null : null;

  const out: FieldLine[] = [];
  const radiusSq = assistRadiusPx * assistRadiusPx;
  let index = 0;
  for (const eye of eyes) {
    const target = lockedTarget ?? nearestSubject(eye.pos, subjects);
    if (!target) continue;
    const dx = eye.pos.x - target.pos.x;
    const dy = eye.pos.y - target.pos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > radiusSq) continue;
    const dist = Math.sqrt(distSq);
    const proximity = assistRadiusPx > 0 ? 1 - dist / assistRadiusPx : 1;
    const opacity = Math.min(
      1,
      GAZE_LINE.baseOpacity + proximity * GAZE_LINE.proximityWeight + chargeT * GAZE_LINE.chargeWeight,
    );
    out.push({ x1: eye.pos.x, y1: eye.pos.y, x2: target.pos.x, y2: target.pos.y, opacity, index: index++ });
  }
  return out;
}

function nearestSubject(
  pos: { x: number; y: number },
  subjects: readonly GazeSubjectPos[],
): GazeSubjectPos | null {
  let best: GazeSubjectPos | null = null;
  let bestDistSq = Infinity;
  for (const s of subjects) {
    const dx = pos.x - s.pos.x;
    const dy = pos.y - s.pos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = s;
    }
  }
  return best;
}
