// src/render/drawers/drawSubject.ts
import { PALETTE } from "../../config/tokens";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectColors = {
  suit: "slate" | "sage" | "ink";
  shirt: "cream";
  outline: "ink";
};

export type DrawSubjectInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: DrawSubjectColors;
  scale: number;
};

const SUBJECT_DRAW = Object.freeze({
  minVisibleScale: 0.02,
  headRadiusFraction: 0.22,
  shoulderWidthFraction: 0.62,
  shoulderHeightFraction: 0.5,
  headOffsetYFraction: 0.32,
  bodyTopOffsetYFraction: 0.08,
} as const);

function colorByName(k: string): string {
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
      throw new Error(`drawSubject: color "${k}" is not in the locked palette`);
  }
}

export function drawSubject(ctx: CanvasRenderingContext2D, input: DrawSubjectInput): void {
  const { pos, sizePx, colors, scale } = input;
  if (scale <= SUBJECT_DRAW.minVisibleScale) return;

  const headR = sizePx * SUBJECT_DRAW.headRadiusFraction * scale;
  const shoulderW = sizePx * SUBJECT_DRAW.shoulderWidthFraction * scale;
  const shoulderH = sizePx * SUBJECT_DRAW.shoulderHeightFraction * scale;
  const cx = pos.x;
  const headCy = pos.y - sizePx * SUBJECT_DRAW.headOffsetYFraction * scale;
  const bodyTop = pos.y - sizePx * SUBJECT_DRAW.bodyTopOffsetYFraction * scale;
  const bodyCy = bodyTop + shoulderH / 2;

  ctx.save();

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx, cy: bodyCy, rx: shoulderW / 2, ry: shoulderH / 2, seed: 11 });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  });

  paperCutEdgePath(ctx, { cx, cy: bodyCy, rx: shoulderW / 2 - 2, ry: shoulderH / 2 - 2, seed: 11 });
  ctx.fillStyle = colorByName(colors.suit);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 3, bodyTop);
  ctx.lineTo(cx + 3, bodyTop);
  ctx.lineTo(cx, bodyTop + shoulderH * 0.35);
  ctx.closePath();
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.restore();
}
