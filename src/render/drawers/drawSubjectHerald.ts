// src/render/drawers/drawSubjectHerald.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";
import { SUBJECT_DRAW } from "./drawSubjectFigure";

export type DrawSubjectHeraldInput = {
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
      throw new Error(`drawSubjectHerald: color "${k}" is not in the locked palette`);
  }
}

export function drawSubjectHerald(ctx: CanvasRenderingContext2D, input: DrawSubjectHeraldInput): void {
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

  const bannerTop = bodyTop + sizePx * scale * 0.06;
  const bannerBottom = bodyTop + sizePx * scale * 0.38;
  const bannerHalfWidth = sizePx * scale * 0.12;

  withPaperCutShadow(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(cx, bannerTop);
      ctx.lineTo(cx - bannerHalfWidth, bannerBottom);
      ctx.lineTo(cx + bannerHalfWidth, bannerBottom);
      ctx.closePath();
      ctx.fillStyle = colorByName(colors.outline);
      ctx.fill();
    },
    shadowIntensity,
  );
  ctx.beginPath();
  ctx.moveTo(cx, bannerTop + sizePx * scale * 0.02);
  ctx.lineTo(cx - bannerHalfWidth + sizePx * scale * 0.02, bannerBottom - sizePx * scale * 0.02);
  ctx.lineTo(cx + bannerHalfWidth - sizePx * scale * 0.02, bannerBottom - sizePx * scale * 0.02);
  ctx.closePath();
  ctx.fillStyle = colorByName("coral");
  ctx.fill();

  ctx.restore();
}
