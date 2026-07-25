// src/render/drawers/drawSubjectScribe.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";
import { SUBJECT_DRAW } from "./drawSubjectFigure";

export type DrawSubjectScribeInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
  shadowIntensity?: number;
};

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
      throw new Error(`drawSubjectScribe: color "${k}" is not in the locked palette`);
  }
}

export function drawSubjectScribe(ctx: CanvasRenderingContext2D, input: DrawSubjectScribeInput): void {
  const { pos, sizePx, colors, scale, rotation } = input;
  const shadowIntensity = input.shadowIntensity ?? 1;
  if (scale <= SUBJECT_DRAW.minVisibleScale) return;

  const headR = sizePx * SUBJECT_DRAW.headRadiusFraction * scale;
  const shoulderW = sizePx * SUBJECT_DRAW.shoulderWidthFraction * scale;
  const shoulderH = sizePx * SUBJECT_DRAW.shoulderHeightFraction * scale;
  const cx = pos.x;
  const headCy = pos.y - sizePx * SUBJECT_DRAW.headOffsetYFraction * scale;
  const bodyTop = pos.y - sizePx * SUBJECT_DRAW.bodyTopOffsetYFraction * scale;
  const bodyCy = bodyTop + shoulderH / 2;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(
    ctx,
    () => {
      paperCutEdgePath(ctx, {
        cx,
        cy: bodyCy,
        rx: shoulderW / 2,
        ry: shoulderH / 2,
        seed: SUBJECT_DRAW.paperCutSeed,
      });
      ctx.fillStyle = colorByName(colors.outline);
      ctx.fill();
    },
    shadowIntensity,
  );

  paperCutEdgePath(ctx, {
    cx,
    cy: bodyCy,
    rx: shoulderW / 2 - SUBJECT_DRAW.shoulderInsetPx * scale,
    ry: shoulderH / 2 - SUBJECT_DRAW.shoulderInsetPx * scale,
    seed: SUBJECT_DRAW.paperCutSeed,
  });
  ctx.fillStyle = colorByName(colors.suit);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR + SUBJECT_DRAW.headOutlinePadPx * scale, 0, Math.PI * 2);
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - SUBJECT_DRAW.collarHalfWidthPx * scale, bodyTop);
  ctx.lineTo(cx + SUBJECT_DRAW.collarHalfWidthPx * scale, bodyTop);
  ctx.lineTo(cx, bodyTop + shoulderH * SUBJECT_DRAW.collarNotchFraction);
  ctx.closePath();
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  withPaperCutShadow(
    ctx,
    () => {
      paperCutEdgePath(ctx, {
        cx: cx + shoulderW * 0.38,
        cy: bodyCy,
        rx: sizePx * scale * 0.05,
        ry: sizePx * scale * 0.15,
        seed: 31,
      });
      ctx.fillStyle = colorByName(colors.outline);
      ctx.fill();
    },
    shadowIntensity,
  );
  paperCutEdgePath(ctx, {
    cx: cx + shoulderW * 0.38,
    cy: bodyCy,
    rx: sizePx * scale * 0.04,
    ry: sizePx * scale * 0.125,
    seed: 31,
  });
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.restore();
}
