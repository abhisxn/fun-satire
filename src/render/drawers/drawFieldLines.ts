export type FieldLineInput = {
  cursor: { x: number; y: number; active: boolean };
  origin: { x: number; y: number };
  maxLength: number;
  angleStep?: number;
  maxLines?: number;
  target?: number | null;
  chargeT?: number;
};

export type FieldLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  index: number;
};

import * as FF from "../../physics/ForceField";

const TAU = Math.PI * 2;

export function computeFieldLines(input: FieldLineInput): FieldLine[] {
  if (!input.cursor.active) return [];
  const step = input.angleStep ?? (TAU / 16);
  const max = input.maxLines ?? 16;
  const out: FieldLine[] = [];
  const targetBoost = (input.chargeT ?? 0) * 0.4;
  for (let i = 0; i < max; i++) {
    const angle = i * step;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const samples = FF.sampleAlongRay(
      input.origin,
      input.cursor,
      { origin: input.origin, dir: { x: dx, y: dy }, maxDist: input.maxLength, samples: 12 },
    );
    let reach = 0;
    let totalStrength = 0;
    for (const s of samples) {
      if (s.strength > 0.05) reach = s.t;
      totalStrength += s.strength;
    }
    const length = Math.min(input.maxLength * Math.max(reach, 0.08), input.maxLength);
    if (totalStrength < 0.02) continue;
    const opacity = Math.min(1, 0.15 + totalStrength / samples.length + targetBoost);
    out.push({
      x1: input.origin.x,
      y1: input.origin.y,
      x2: input.origin.x + dx * length,
      y2: input.origin.y + dy * length,
      opacity,
      index: i,
    });
  }
  return out;
}

export function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  lines: FieldLine[],
  colors: { stroke: string; ink: string },
): void {
  if (lines.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  for (const line of lines) {
    ctx.globalAlpha = line.opacity;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
  ctx.restore();
}
