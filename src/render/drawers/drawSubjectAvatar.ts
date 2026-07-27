// src/render/drawers/drawSubjectAvatar.ts
import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import type { AvatarAssetId } from "../../hud/subjectSkinRegistry";
import { getAvatarAssetEntry } from "../../hud/avatarAssetRegistry";
import type { ImageAssetCache } from "../../render/imageAssets";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export type DrawSubjectAvatarInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
  scale: number;
  rotation: number;
  shadowIntensity?: number;
  assetId: AvatarAssetId;
  imageCache: ImageAssetCache;
};

export const AVATAR_DRAW = Object.freeze({
  minVisibleScale: 0.02,
  paddingXFraction: 0.14,
  paddingYFraction: 0.28,
  paperCutSeed: 71,
  placeholderHeadRadiusFraction: 0.18,
  placeholderBodyWidthFraction: 0.5,
  placeholderBodyHeightFraction: 0.4,
  placeholderBodyOffsetYFraction: 0.1,
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
      throw new Error(`drawSubjectAvatar: color "${k}" is not in the locked palette`);
  }
}

export function drawSubjectAvatar(ctx: CanvasRenderingContext2D, input: DrawSubjectAvatarInput): void {
  const { pos, sizePx, colors, scale, rotation, shadowIntensity, assetId, imageCache } = input;
  if (scale <= AVATAR_DRAW.minVisibleScale) return;

  const entry = getAvatarAssetEntry(assetId);
  if (!entry) return;

  const s = sizePx * scale;
  const rx = s * (0.5 + AVATAR_DRAW.paddingXFraction);
  const ry = s * (0.28 + AVATAR_DRAW.paddingYFraction);
  const cx = pos.x;
  const cy = pos.y;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.translate(-pos.x, -pos.y);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx, cy, rx, ry, seed: AVATAR_DRAW.paperCutSeed });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  }, shadowIntensity);

  paperCutEdgePath(ctx, { cx, cy, rx: rx * 0.92, ry: ry * 0.86, seed: AVATAR_DRAW.paperCutSeed });
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  const assetState = imageCache.get(entry.url);

  if (assetState.status === "ready") {
    ctx.save();
    paperCutEdgePath(ctx, { cx, cy, rx: rx * 0.92, ry: ry * 0.86, seed: AVATAR_DRAW.paperCutSeed });
    ctx.clip();
    const imgW = rx * 2 * 0.92;
    const imgH = ry * 2 * 0.86;
    ctx.drawImage(assetState.image, cx - imgW / 2, cy - imgH / 2, imgW, imgH);
    ctx.restore();
  } else {
    const headR = s * AVATAR_DRAW.placeholderHeadRadiusFraction;
    const headCy = cy - s * 0.08;
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();

    const bodyW = s * AVATAR_DRAW.placeholderBodyWidthFraction;
    const bodyH = s * AVATAR_DRAW.placeholderBodyHeightFraction;
    const bodyCy = cy + s * AVATAR_DRAW.placeholderBodyOffsetYFraction;
    ctx.beginPath();
    ctx.ellipse(cx, bodyCy, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  }

  ctx.restore();
}
