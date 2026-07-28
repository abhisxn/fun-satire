// src/render/drawers/drawSubjectLotus.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { subjectAssetEntryFor } from "../../hud/subjectSkinRegistry";
import type { ImageAssetCache } from "../imageAssets";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectLotusInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
  shadowIntensity?: number;
  imageCache?: ImageAssetCache;
};

export const SUBJECT_LOTUS_DRAW = Object.freeze({
  minVisibleScale: 0.02,
  // subject-lotus.png is 852 x 868 (near-square). Anchor slightly above the
  // visual centerline to align the rendered artwork with the existing
  // procedural petal cluster origin.
  figmaEnvelope: Object.freeze({
    sourceWidth: 852,
    sourceHeight: 868,
    widthRatio: 1,
    heightRatio: 1,
    anchorX: 0.5,
    anchorY: 0.5,
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
    case "coral":
      return PALETTE.coral;
    default:
      throw new Error(`drawSubjectLotus: color "${k}" is not in the locked palette`);
  }
}

function drawProceduralLotus(
  ctx: CanvasRenderingContext2D,
  input: DrawSubjectLotusInput,
): void {
  const { pos, sizePx, colors, scale, rotation, shadowIntensity } = input;
  if (scale <= SUBJECT_LOTUS_DRAW.minVisibleScale) return;
  const s = sizePx * scale;
  const petalCount = 5;
  const petalLen = s * 0.48;
  const petalW = s * 0.22;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(angle);
    withPaperCutShadow(ctx, () => {
      paperCutEdgePath(ctx, { cx: 0, cy: -petalLen * 0.55, rx: petalW * 0.55, ry: petalLen * 0.55, seed: i + 1 });
      ctx.fillStyle = colorByName(colors.outline);
      ctx.fill();
    }, shadowIntensity);
    paperCutEdgePath(ctx, { cx: 0, cy: -petalLen * 0.55, rx: petalW * 0.45, ry: petalLen * 0.48, seed: i + 1 });
    ctx.fillStyle = colorByName(i % 2 === 0 ? colors.suit : colors.shirt);
    ctx.fill();
    ctx.restore();
  }

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: s * 0.16, ry: s * 0.16, seed: 21 });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  }, shadowIntensity);
  paperCutEdgePath(ctx, { cx: 0, cy: 0, rx: s * 0.12, ry: s * 0.12, seed: 21 });
  ctx.fillStyle = colorByName(colors.outline);
  ctx.fill();

  ctx.restore();
}

function tryDrawFigmaLotus(
  ctx: CanvasRenderingContext2D,
  input: DrawSubjectLotusInput,
  image: HTMLImageElement,
): void {
  const { pos, sizePx, scale, rotation, shadowIntensity } = input;
  if (scale <= SUBJECT_LOTUS_DRAW.minVisibleScale) return;
  const side = sizePx * scale;
  const dx = pos.x - side / 2;
  const dy = pos.y - side / 2;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);
  withPaperCutShadow(
    ctx,
    () => {
      ctx.drawImage(image, dx, dy, side, side);
    },
    shadowIntensity,
  );
  ctx.restore();
}

export function drawSubjectLotus(ctx: CanvasRenderingContext2D, input: DrawSubjectLotusInput): void {
  const entry = subjectAssetEntryFor("lotus");
  if (entry && input.imageCache) {
    const state = input.imageCache.get(entry.url);
    if (state.status === "ready") {
      tryDrawFigmaLotus(ctx, input, state.image);
      return;
    }
  }
  drawProceduralLotus(ctx, input);
}
