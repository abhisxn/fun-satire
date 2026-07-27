// src/render/drawers/drawLockIndicator.ts
// PR2 Task 6, Gate 1 variant A: thin amber ring around the locked subject.
// No ctx.shadowBlur — soft halo is built from layered concentric strokes (outer faint
// + mid amber + inner crisp). Ring is offset outward so it does not overlap the avatar
// outline or the paper-cut text.

export const LOCK_INDICATOR = Object.freeze({
  amber: "#E8A53A",
  amberSoft: "#F2C56B",
  inkTrim: "#2A2420",
  ringOffsetPx: 8,
  outerStrokePx: 6,
  midStrokePx: 3,
  innerStrokePx: 1.25,
  outerAlpha: 0.18,
  midAlpha: 0.45,
  innerAlpha: 0.95,
} as const);

export type DrawLockIndicatorInput = {
  pos: { x: number; y: number };
  sizePx: number;
};

export function drawLockIndicator(
  ctx: CanvasRenderingContext2D,
  input: DrawLockIndicatorInput,
): void {
  const { pos, sizePx } = input;
  const radius = sizePx * 0.5 + LOCK_INDICATOR.ringOffsetPx;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius + LOCK_INDICATOR.outerStrokePx * 0.5, 0, Math.PI * 2);
  ctx.globalAlpha = LOCK_INDICATOR.outerAlpha;
  ctx.strokeStyle = LOCK_INDICATOR.amberSoft;
  ctx.lineWidth = LOCK_INDICATOR.outerStrokePx;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.globalAlpha = LOCK_INDICATOR.midAlpha;
  ctx.strokeStyle = LOCK_INDICATOR.amber;
  ctx.lineWidth = LOCK_INDICATOR.midStrokePx;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius - LOCK_INDICATOR.innerStrokePx * 0.5, 0, Math.PI * 2);
  ctx.globalAlpha = LOCK_INDICATOR.innerAlpha;
  ctx.strokeStyle = LOCK_INDICATOR.inkTrim;
  ctx.lineWidth = LOCK_INDICATOR.innerStrokePx;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.restore();
}
