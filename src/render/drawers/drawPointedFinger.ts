import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export const FINGER_DRAW = Object.freeze({
  shakeAmpRad: 0.14,
  shakeSpeed: 0.014,
} as const);

export type DrawPointedFingerInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  timeMs: number;
  id: number;
  rotation?: number;
  shadowIntensity?: number;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawPointedFinger: color "${k}" is not in the locked palette`);
  }
};

/** Deterministic idle point-and-shake rotation, pure function of (id, timeMs). */
export function computePointShake(id: number, timeMs: number): number {
  const phase = id * 5.37;
  return Math.sin(timeMs * FINGER_DRAW.shakeSpeed + phase) * FINGER_DRAW.shakeAmpRad;
}

export function drawPointedFinger(ctx: CanvasRenderingContext2D, input: DrawPointedFingerInput): void {
  const { pos, sizePx, timeMs, id } = input;
  const baseRotation = input.rotation ?? 0;
  const shadowIntensity = input.shadowIntensity ?? 1;
  const shake = computePointShake(id, timeMs);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(baseRotation + shake);

  const s = sizePx;
  // fist — shared paperCut.ts edge wobble + offset shadow, same treatment as
  // drawEye.ts/drawSubject.ts/drawBug.ts (design-system consistency
  // requirement; no bespoke per-drawer shadow/edge styling)
  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: s * 0.22, rx: s * 0.24, ry: s * 0.2, seed: id * 5 + 2 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  }, shadowIntensity);
  paperCutEdgePath(ctx, { cx: 0, cy: s * 0.22, rx: s * 0.2, ry: s * 0.16, seed: id * 5 + 2 });
  ctx.fillStyle = colorByName(input.colors.shirt);
  ctx.fill();

  // pointing finger, extended along -y (up) in local space before rotation
  ctx.fillStyle = colorByName(input.colors.outline);
  ctx.beginPath();
  ctx.moveTo(-s * 0.09, s * 0.05);
  ctx.lineTo(-s * 0.09, -s * 0.5);
  ctx.quadraticCurveTo(-s * 0.09, -s * 0.58, 0, -s * 0.58);
  ctx.quadraticCurveTo(s * 0.09, -s * 0.58, s * 0.09, -s * 0.5);
  ctx.lineTo(s * 0.09, s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colorByName(input.colors.shirt);
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, s * 0.03);
  ctx.lineTo(-s * 0.06, -s * 0.47);
  ctx.quadraticCurveTo(-s * 0.06, -s * 0.53, 0, -s * 0.53);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.53, s * 0.06, -s * 0.47);
  ctx.lineTo(s * 0.06, s * 0.03);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
