// src/render/drawers/drawSubjectFigure.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { subjectAssetEntryFor } from "../../hud/subjectSkinRegistry";
import type { ImageAssetCache } from "../imageAssets";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectFigureInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
  shadowIntensity?: number;
  imageCache?: ImageAssetCache;
};

export const SUBJECT_DRAW = Object.freeze({
  minVisibleScale: 0.02,
  headRadiusFraction: 0.22,
  shoulderWidthFraction: 0.62,
  shoulderHeightFraction: 0.5,
  headOffsetYFraction: 0.32,
  bodyTopOffsetYFraction: 0.08,
  shoulderInsetPx: 2,
  headOutlinePadPx: 1.5,
  collarHalfWidthPx: 3,
  collarNotchFraction: 0.35,
  paperCutSeed: 11,
  // Visual envelope for the subject-elder-figure PNG (642 x 350 source).
  figmaEnvelope: Object.freeze({
    sourceWidth: 642,
    sourceHeight: 350,
    widthRatio: 642 / 350,
    heightRatio: 1,
    anchorX: 0.5,
    anchorY: 0.55,
  }),
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
    default:
      throw new Error(`drawSubjectFigure: color "${k}" is not in the locked palette`);
  }
}

function drawProceduralFigure(
  ctx: CanvasRenderingContext2D,
  input: DrawSubjectFigureInput,
): void {
  const { pos, sizePx, colors, scale, rotation, shadowIntensity } = input;
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

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, {
      cx,
      cy: bodyCy,
      rx: shoulderW / 2,
      ry: shoulderH / 2,
      seed: SUBJECT_DRAW.paperCutSeed,
    });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  }, shadowIntensity);

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

  ctx.restore();
}

function tryDrawFigmaFigure(
  ctx: CanvasRenderingContext2D,
  input: DrawSubjectFigureInput,
  image: HTMLImageElement,
): void {
  const { pos, sizePx, scale, rotation, shadowIntensity } = input;
  if (scale <= SUBJECT_DRAW.minVisibleScale) return;
  const env = SUBJECT_DRAW.figmaEnvelope;
  const renderWidth = sizePx * scale * env.widthRatio;
  const renderHeight = sizePx * scale * env.heightRatio;
  const dx = pos.x - renderWidth / 2;
  const dy = pos.y - renderHeight * (env.anchorY - 0.5) - renderHeight / 2;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);
  withPaperCutShadow(
    ctx,
    () => {
      ctx.drawImage(image, dx, dy, renderWidth, renderHeight);
    },
    shadowIntensity,
  );
  ctx.restore();
}

export function drawSubjectFigure(ctx: CanvasRenderingContext2D, input: DrawSubjectFigureInput): void {
  const entry = subjectAssetEntryFor("figure");
  if (entry && input.imageCache) {
    const state = input.imageCache.get(entry.url);
    if (state.status === "ready") {
      tryDrawFigmaFigure(ctx, input, state.image);
      return;
    }
  }
  drawProceduralFigure(ctx, input);
}
