// src/render/drawers/drawGazeLines.ts
import type { FieldLine } from "./drawFieldLines";

export type GazeLineEye = { id: number; pos: { x: number; y: number } };

export type GazeLineInput = {
  eyes: readonly GazeLineEye[];
  subjectPos: { x: number; y: number } | null;
  assistRadiusPx: number;
  chargeT: number;
};

const GAZE_LINE = Object.freeze({
  baseOpacity: 0.12,
  proximityWeight: 0.35,
  chargeWeight: 0.5,
} as const);

export function computeGazeLines(input: GazeLineInput): FieldLine[] {
  const { eyes, subjectPos, assistRadiusPx, chargeT } = input;
  if (!subjectPos) return [];

  const out: FieldLine[] = [];
  const radiusSq = assistRadiusPx * assistRadiusPx;
  let index = 0;
  for (const eye of eyes) {
    const dx = eye.pos.x - subjectPos.x;
    const dy = eye.pos.y - subjectPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > radiusSq) continue;
    const dist = Math.sqrt(distSq);
    const proximity = assistRadiusPx > 0 ? 1 - dist / assistRadiusPx : 1;
    const opacity = Math.min(
      1,
      GAZE_LINE.baseOpacity + proximity * GAZE_LINE.proximityWeight + chargeT * GAZE_LINE.chargeWeight,
    );
    out.push({ x1: eye.pos.x, y1: eye.pos.y, x2: subjectPos.x, y2: subjectPos.y, opacity, index: index++ });
  }
  return out;
}
