import { PALETTE } from "../../config/tokens";
import type { ShapeVariant } from "../../content/schema";

export const EYE_DRAW = Object.freeze({
  outlineStrokePx: 1.5,
  irisStrokePx: 1.2,
  highlightRadiusPx: 1.5,
} as const);

export type DrawEyeInput = {
  pos: { x: number; y: number };
  sizePx: number;
  shapeVariant: ShapeVariant;
  colors: {
    sclera: string;
    iris: string;
    pupil: string;
    highlight: string | null;
    outline: string;
  };
  blinkScaleY: number;
  pupilOffset: { x: number; y: number };
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream":
      return PALETTE.cream;
    case "slate":
      return PALETTE.slate;
    case "sage":
      return PALETTE.sage;
    case "ink":
      return PALETTE.ink;
    case "coral":
      return PALETTE.coral;
    default:
      return PALETTE.ink;
  }
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
  const { pos, sizePx, shapeVariant, blinkScaleY, pupilOffset } = input;
  const rx = sizePx / 2;
  const ry = rx * (shapeVariant === "narrow" ? 0.55 : shapeVariant === "wide" ? 0.85 : 0.7);
  const irisR = rx * 0.45;
  const pupilR = rx * 0.22;
  const cx = pos.x;
  const cy = pos.y;

  ctx.save();
  almondPath(ctx, cx, cy, rx, ry, blinkScaleY);
  ctx.fillStyle = colorByName(input.colors.outline);
  ctx.fill();
  almondPath(ctx, cx, cy, rx - 1.5, ry - 1.5, blinkScaleY);
  ctx.fillStyle = colorByName(input.colors.sclera);
  ctx.fill();

  if (blinkScaleY > 0.18) {
    ctx.save();
    almondPath(ctx, cx, cy, rx - 1.5, ry - 1.5, blinkScaleY);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(cx + pupilOffset.x, cy + pupilOffset.y, irisR, 0, Math.PI * 2);
    ctx.fillStyle = colorByName(input.colors.iris);
    ctx.fill();
    ctx.lineWidth = EYE_DRAW.irisStrokePx;
    ctx.strokeStyle = colorByName(input.colors.outline);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + pupilOffset.x, cy + pupilOffset.y, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = colorByName(input.colors.pupil);
    ctx.fill();
    if (input.colors.highlight) {
      ctx.beginPath();
      ctx.arc(
        cx + pupilOffset.x + irisR * 0.45,
        cy + pupilOffset.y - irisR * 0.45,
        EYE_DRAW.highlightRadiusPx,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = colorByName(input.colors.highlight);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
