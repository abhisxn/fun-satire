import { PALETTE } from "../../config/tokens";

export const EYE_DRAW = Object.freeze({
  naturalWidth: 115,
  naturalHeight: 57,
  pupilColor: "#38332F",
  pupilRadius: 23.6389,
} as const);

export type DrawEyeInput = {
  pos: { x: number; y: number };
  sizePx: number;
  blinkScaleY: number;
  pupilOffset: { x: number; y: number };
  pupilColor?: string;
};

const almondPath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  scaleY: number,
): void => {
  if (scaleY < 0.02) return;
  const yScale = Math.max(0.02, scaleY);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy);
  ctx.bezierCurveTo(cx - rx, cy - ry * yScale, cx + rx, cy - ry * yScale, cx + rx, cy);
  ctx.bezierCurveTo(cx + rx, cy + ry * yScale, cx - rx, cy + ry * yScale, cx - rx, cy);
  ctx.closePath();
};

export function drawEye(ctx: CanvasRenderingContext2D, input: DrawEyeInput): void {
  const { pos, sizePx, blinkScaleY, pupilOffset } = input;
  const pupilColor = input.pupilColor ?? EYE_DRAW.pupilColor;
  const scale = sizePx / EYE_DRAW.naturalWidth;
  const rx = (EYE_DRAW.naturalWidth / 2) * scale;
  const ry = (EYE_DRAW.naturalHeight / 2) * scale;
  const cx = pos.x;
  const cy = pos.y;

  ctx.save();
  almondPath(ctx, cx, cy, rx, ry, blinkScaleY);
  ctx.fillStyle = PALETTE.cream;
  ctx.fill();

  if (blinkScaleY > 0.18) {
    ctx.save();
    almondPath(ctx, cx, cy, rx, ry, blinkScaleY);
    ctx.clip();
    const pupilR = EYE_DRAW.pupilRadius * scale;
    ctx.beginPath();
    ctx.arc(cx + pupilOffset.x, cy + pupilOffset.y, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = pupilColor;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
