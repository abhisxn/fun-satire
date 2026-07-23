import { PALETTE } from "../../config/tokens";

export const CURSOR = Object.freeze({
  baseRingPx: 12,
  maxRingPx: 26,
  crosshairExtentPx: 17,
  baseStrokePx: 1.5,
  hoverStrokePx: 2,
  cancelFadeMs: 140,
} as const);

export type CursorInput = {
  x: number;
  y: number;
  chargeT: number;
  hover: boolean;
  reducedMotion: boolean;
  timeMs: number;
};

export type CursorState = {
  x: number;
  y: number;
  charging: boolean;
  ringRadius: number;
  ringOpacity: number;
  crosshairOpacity: number;
  strokeWidth: number;
  pulse: number;
};

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

const ease = (t: number): number => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - Math.pow(1 - c, 3);
};

const pulseAt = (tMs: number, reducedMotion: boolean): number => {
  if (reducedMotion) return 0;
  return Math.sin(tMs / 220) * 0.5 + 0.5;
};

export function computeCursorState(input: CursorInput): CursorState {
  const { x, y, chargeT, hover, reducedMotion, timeMs } = input;
  const c = clamp(chargeT, 0, 1);
  const baseEase = ease(c);
  const amplitude = CURSOR.maxRingPx - CURSOR.baseRingPx;
  const damp = reducedMotion ? 0.4 : 1;
  const easedRingRadius = CURSOR.baseRingPx + baseEase * amplitude * damp;
  const pulse = pulseAt(timeMs, reducedMotion) * 1.5 * damp * baseEase;
  const ringRadius = clamp(
    easedRingRadius + pulse,
    CURSOR.baseRingPx,
    CURSOR.maxRingPx
  );
  const ringOpacity = clamp(1 - baseEase * 0.85, 0.05, 1);
  const crosshairOpacity = 1;
  const strokeWidth = hover ? CURSOR.hoverStrokePx : CURSOR.baseStrokePx;
  return {
    x,
    y,
    charging: chargeT > 0,
    ringRadius,
    ringOpacity,
    crosshairOpacity,
    strokeWidth,
    pulse,
  };
}

const fillCoral = PALETTE.coral;
const strokeInk = PALETTE.ink;

export function drawCursor(ctx: CanvasRenderingContext2D, state: CursorState): void {
  const { x, y, ringRadius, ringOpacity, crosshairOpacity, strokeWidth } = state;
  ctx.save();
  ctx.lineCap = "round";

  ctx.globalAlpha = ringOpacity;
  ctx.strokeStyle = fillCoral;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = strokeInk;
  ctx.lineWidth = Math.max(1, strokeWidth * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - CURSOR.crosshairExtentPx, y);
  ctx.lineTo(x + CURSOR.crosshairExtentPx, y);
  ctx.moveTo(x, y - CURSOR.crosshairExtentPx);
  ctx.lineTo(x, y + CURSOR.crosshairExtentPx);
  ctx.stroke();

  ctx.globalAlpha = crosshairOpacity;
  ctx.fillStyle = fillCoral;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, strokeWidth * 0.9), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
