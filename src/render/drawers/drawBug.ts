// src/render/drawers/drawBug.ts
import { PALETTE } from "../../config/tokens";
import type { EyeColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export const BUG_DRAW = Object.freeze({
  jitterAmpPx: 1.6,
  jitterSpeed: 0.011,
  antennaTwitchAmpRad: 0.35,
} as const);

export type DrawBugInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: EyeColors;
  timeMs: number;
  id: number;
  rotation?: number;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawBug: color "${k}" is not in the locked palette`);
  }
};

/**
 * Deterministic idle scuttle jitter, pure function of (id, timeMs) — no Rng
 * threading needed at render time, trivially reproducible in tests.
 */
export function computeScuttleJitter(id: number, timeMs: number): { x: number; y: number } {
  const phase = id * 12.9898;
  const t = timeMs * BUG_DRAW.jitterSpeed;
  return {
    x: Math.sin(t + phase) * BUG_DRAW.jitterAmpPx,
    y: Math.cos(t * 1.3 + phase) * BUG_DRAW.jitterAmpPx,
  };
}

function computeAntennaTwitch(id: number, timeMs: number): number {
  const phase = id * 7.1;
  return Math.sin(timeMs * BUG_DRAW.jitterSpeed * 1.7 + phase) * BUG_DRAW.antennaTwitchAmpRad;
}

export function drawBug(ctx: CanvasRenderingContext2D, input: DrawBugInput): void {
  const { sizePx, timeMs, id } = input;
  const rotation = input.rotation ?? 0;
  const jitter = computeScuttleJitter(id, timeMs);
  const twitch = computeAntennaTwitch(id, timeMs);
  const cx = input.pos.x + jitter.x;
  const cy = input.pos.y + jitter.y;
  const bodyRx = sizePx * 0.32;
  const bodyRy = sizePx * 0.2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // legs
  ctx.strokeStyle = colorByName(input.colors.outline);
  ctx.lineWidth = Math.max(1, sizePx * 0.035);
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * bodyRx * 0.5, 0);
      ctx.lineTo(i * bodyRx * 0.5 + side * bodyRx * 0.6, side * bodyRy * 1.4);
      ctx.stroke();
    }
  }

  // antennae
  ctx.beginPath();
  ctx.moveTo(bodyRx * 0.9, -bodyRy * 0.3);
  ctx.quadraticCurveTo(bodyRx * 1.4, -bodyRy * 1.2 + twitch * 10, bodyRx * 1.7, -bodyRy * 1.6 + twitch * 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bodyRx * 0.9, bodyRy * 0.3);
  ctx.quadraticCurveTo(bodyRx * 1.4, bodyRy * 1.2 - twitch * 10, bodyRx * 1.7, bodyRy * 1.6 - twitch * 14);
  ctx.stroke();

  // body — shared paperCut.ts edge wobble + offset shadow, same treatment as
  // drawEye.ts/drawSubject.ts (design-system consistency requirement; no
  // bespoke per-drawer shadow/edge styling)
  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: bodyRx, ry: bodyRy, seed: id * 3 + 1 });
    ctx.fillStyle = colorByName(input.colors.outline);
    ctx.fill();
  });
  paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: bodyRx * 0.86, ry: bodyRy * 0.82, seed: id * 3 + 1 });
  ctx.fillStyle = colorByName(input.colors.iris);
  ctx.fill();

  // head
  ctx.fillStyle = colorByName(input.colors.outline);
  ctx.beginPath();
  ctx.arc(bodyRx * 0.92, 0, bodyRy * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
