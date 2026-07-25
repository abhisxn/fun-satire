import { PALETTE } from "../../config/tokens";
import type { ShapeVariant } from "../../content/schema";
import type { EyeColors } from "../../content/schema";

export const EYE_DRAW = Object.freeze({
  outlineStrokePx: 1.5,
  irisStrokePx: 1.2,
  highlightRadiusPx: 1.5,
} as const);

export type DrawEyeInput = {
  pos: { x: number; y: number };
  sizePx: number;
  shapeVariant: ShapeVariant;
  colors: EyeColors;
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
      throw new Error(`drawEye: color "${k}" is not in the locked palette`);
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

const shapeRy = (variant: ShapeVariant, baseRy: number): number => {
  switch (variant) {
    case "narrow":
      return baseRy * 0.6;
    case "wide":
      return baseRy * 1.1;
    case "round":
      return baseRy * 1.15;
    case "hooded":
      return baseRy * 0.7;
    case "almond":
    default:
      return baseRy;
  }
};

const shapeRx = (variant: ShapeVariant, baseRx: number): number => {
  switch (variant) {
    case "round":
      return baseRx * 0.92;
    case "hooded":
      return baseRx * 0.88;
    case "wide":
      return baseRx * 1.05;
    case "narrow":
      return baseRx * 0.86;
    case "almond":
    default:
      return baseRx;
  }
};

const irisRadius = (variant: ShapeVariant, rx: number): number => {
  switch (variant) {
    case "round":
      return rx * 0.6;
    case "hooded":
      return rx * 0.4;
    case "wide":
      return rx * 0.5;
    case "narrow":
      return rx * 0.35;
    case "almond":
    default:
      return rx * 0.45;
  }
};

export function drawEye(ctx: CanvasRenderingContext2D, input: DrawEyeInput): void {
  const { pos, sizePx, shapeVariant, blinkScaleY, pupilOffset } = input;
  const baseRx = sizePx / 2;
  const baseRy = baseRx * 0.7;
  const rx = shapeRx(shapeVariant, baseRx);
  const ry = shapeRy(shapeVariant, baseRy);
  const irisR = irisRadius(shapeVariant, rx);
  const pupilR = irisR * 0.45;
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
