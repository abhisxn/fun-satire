// src/render/drawers/drawEye.ts
import { PALETTE } from "../../config/tokens";
import type { EyeAssetId, ShapeVariant, EyeColors } from "../../content/schema";
import { getEyeAssetEntry } from "../../assets/eyeAssetRegistry";
import type { ImageAssetCache } from "../imageAssets";
import { withPaperCutShadow } from "../paperCut";

export const EYE_DRAW = Object.freeze({
  outlineStrokePx: 1.5,
  irisStrokePx: 1.2,
  highlightRadiusPx: 1.5,
  socketInflatePx: 0,
  irisStrokeShrinkFactor: 0.94,
  assetMinimumScale: 0.02,
} as const);

export type DrawEyeInput = {
  pos: { x: number; y: number };
  sizePx: number;
  assetId?: EyeAssetId;
  shapeVariant: ShapeVariant;
  colors: EyeColors;
  blinkScaleY: number;
  pupilOffset: { x: number; y: number };
  imageCache?: ImageAssetCache;
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

const socketPathCache = new Map<string, Path2D>();

export function __resetEyeDrawerCacheForTests(): void {
  socketPathCache.clear();
}

const getSocketPath2D = (key: string, d: string): Path2D => {
  const cached = socketPathCache.get(key);
  if (cached) return cached;
  const ctor = (globalThis as { Path2D?: typeof Path2D }).Path2D;
  if (!ctor) {
    throw new Error("Path2D is not available in this environment");
  }
  const path = new ctor(d);
  socketPathCache.set(key, path);
  return path;
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

const drawProceduralEye = (
  ctx: CanvasRenderingContext2D,
  input: DrawEyeInput,
): void => {
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
  withPaperCutShadow(ctx, () => {
    ctx.fill();
  });
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
};

const tryDrawAssetGeometryEye = (
  ctx: CanvasRenderingContext2D,
  input: DrawEyeInput,
): boolean => {
  if (!input.assetId) return false;
  if (input.imageCache) {
    const entry = getEyeAssetEntry(input.assetId);
    if (entry) {
      const state = input.imageCache.get(entry.url);
      if (state.status === "error") return false;
    }
  }
  const entry = getEyeAssetEntry(input.assetId);
  const geometry = entry?.geometry;
  if (!geometry) return false;
  if (!("Path2D" in globalThis)) return false;

  const { pos, sizePx, blinkScaleY, pupilOffset } = input;
  const vb = geometry.viewBox;
  const scale = sizePx / vb.width;
  const vbCx = vb.x + vb.width / 2;
  const vbCy = vb.y + vb.height / 2;
  const socketPath = getSocketPath2D(input.assetId, geometry.socketPath);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(0);
  ctx.scale(scale, scale);
  ctx.translate(-vbCx, -vbCy);

  if (blinkScaleY < EYE_DRAW.assetMinimumScale) {
    ctx.restore();
    return true;
  }
  if (blinkScaleY < 1) {
    ctx.save();
    ctx.translate(0, vbCy);
    ctx.scale(1, Math.max(EYE_DRAW.assetMinimumScale, blinkScaleY));
    ctx.translate(0, -vbCy);
  }

  ctx.fillStyle = colorByName(input.colors.outline);
  withPaperCutShadow(ctx, () => {
    ctx.fill(socketPath);
  });

  ctx.save();
  ctx.clip(socketPath);
  ctx.fillStyle = colorByName(input.colors.sclera);
  ctx.fill(socketPath);
  ctx.restore();

  if (blinkScaleY > 0.18) {
    const irisX = geometry.iris.centerX + pupilOffset.x / Math.max(scale, 1e-6);
    const irisY = geometry.iris.centerY + pupilOffset.y / Math.max(scale, 1e-6);
    const irisR = geometry.iris.radius * EYE_DRAW.irisStrokeShrinkFactor;
    const pupilR = irisR * 0.45;

    ctx.save();
    ctx.beginPath();
    ctx.arc(irisX, irisY, geometry.iris.radius, 0, Math.PI * 2);
    ctx.fillStyle = colorByName(input.colors.iris);
    ctx.fill();
    ctx.lineWidth = EYE_DRAW.irisStrokePx / Math.max(scale, 1e-6);
    ctx.strokeStyle = colorByName(input.colors.outline);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(irisX, irisY, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = colorByName(input.colors.pupil);
    ctx.fill();

    if (input.colors.highlight) {
      ctx.beginPath();
      ctx.arc(
        irisX + irisR * 0.45,
        irisY - irisR * 0.45,
        EYE_DRAW.highlightRadiusPx / Math.max(scale, 1e-6),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = colorByName(input.colors.highlight);
      ctx.fill();
    }
    ctx.restore();
  }

  if (blinkScaleY < 1) {
    ctx.restore();
  }
  ctx.restore();
  return true;
};

export function drawEye(ctx: CanvasRenderingContext2D, input: DrawEyeInput): void {
  if (tryDrawAssetGeometryEye(ctx, input)) return;
  drawProceduralEye(ctx, input);
}
