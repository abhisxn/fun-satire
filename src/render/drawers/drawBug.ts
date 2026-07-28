// src/render/drawers/drawBug.ts
import { PALETTE } from "../../config/tokens";
import type { EyeColors } from "../../content/schema";
import { crowdAssetForEntity } from "../crowdAssetRegistry";
import type { ImageAssetCache } from "../imageAssets";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export const BUG_DRAW = Object.freeze({
  jitterAmpPx: 1.6,
  jitterSpeed: 0.011,
  antennaTwitchAmpRad: 0.35,
  // Visual envelope: the source SVG is 32.9 x 66.75 with antennae extending
  // upward, so height is intentionally larger than width. The intrinsic aspect
  // (width / height) lets us size crowd bugs at the requested sizePx while
  // preserving the exact Figma silhouette.
  intrinsicAspect: 32.9016 / 66.7512,
  envelope: Object.freeze({
    widthRatio: 32.9016 / 66.7512,
    heightRatio: 1,
    anchorX: 0.5,
    anchorY: 0.62,
  }),
  fallback: Object.freeze({
    rxFactor: 0.32,
    ryFactor: 0.2,
    shadowOffsetYPx: 3,
    shadowBlurPx: 6,
  }),
} as const);

export type DrawBugInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: EyeColors;
  timeMs: number;
  id: number;
  rotation?: number;
  shadowIntensity?: number;
  imageCache?: ImageAssetCache;
  reducedMotion?: boolean;
};

const colorByName = (k: string): string => {
  switch (k) {
    case "cream": return PALETTE.cream;
    case "slate": return PALETTE.slate;
    case "sage": return PALETTE.sage;
    case "ink": return PALETTE.ink;
    case "coral": return PALETTE.coral;
    default: throw new Error(`drawBug: color "${k}" is not in the locked palette`);
  }
};

/**
 * Deterministic idle scuttle jitter, pure function of (id, timeMs) — no Rng
 * threading needed at render time, trivially reproducible in tests. Under
 * reduced motion the jitter is suppressed so the bug still follows the same
 * canvas transform composition without the decorative scuttle.
 */
export function computeScuttleJitter(
  id: number,
  timeMs: number,
  opts: { reducedMotion?: boolean } = {},
): { x: number; y: number } {
  if (opts.reducedMotion) return { x: 0, y: 0 };
  const phase = id * 12.9898;
  const t = timeMs * BUG_DRAW.jitterSpeed;
  return {
    x: Math.sin(t + phase) * BUG_DRAW.jitterAmpPx,
    y: Math.cos(t * 1.3 + phase) * BUG_DRAW.jitterAmpPx,
  };
}

function computeAntennaTwitch(id: number, timeMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const phase = id * 7.1;
  return Math.sin(timeMs * BUG_DRAW.jitterSpeed * 1.7 + phase) * BUG_DRAW.antennaTwitchAmpRad;
}

function drawAssetBug(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cx: number,
  cy: number,
  sizePx: number,
  rotation: number,
): void {
  const aspect = BUG_DRAW.intrinsicAspect;
  const renderHeight = sizePx;
  const renderWidth = Math.max(1, renderHeight * aspect);
  const anchorX = cx;
  const anchorY = cy + renderHeight * (BUG_DRAW.envelope.anchorY - 0.5);
  ctx.drawImage(
    image,
    anchorX - renderWidth / 2,
    anchorY - renderHeight / 2,
    renderWidth,
    renderHeight,
  );
  void rotation;
}

function drawFallbackBug(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sizePx: number,
  colors: EyeColors,
  seed: number,
  shadowIntensity: number,
  reducedMotion: boolean,
): void {
  const bodyRx = sizePx * BUG_DRAW.fallback.rxFactor;
  const bodyRy = sizePx * BUG_DRAW.fallback.ryFactor;
  const twitch = computeAntennaTwitch(seed, 0, reducedMotion);

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx, cy, rx: bodyRx, ry: bodyRy, seed });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  }, shadowIntensity);
  paperCutEdgePath(ctx, { cx, cy, rx: bodyRx * 0.86, ry: bodyRy * 0.82, seed });
  ctx.fillStyle = colorByName(colors.iris);
  ctx.fill();

  ctx.strokeStyle = colorByName(colors.outline);
  ctx.lineWidth = Math.max(1, sizePx * 0.035);
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * bodyRx * 0.5, cy);
      ctx.lineTo(cx + i * bodyRx * 0.5 + side * bodyRx * 0.6, cy + side * bodyRy * 1.4);
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.moveTo(cx + bodyRx * 0.9, cy - bodyRy * 0.3);
  ctx.quadraticCurveTo(cx + bodyRx * 1.4, cy - bodyRy * 1.2 + twitch * 10, cx + bodyRx * 1.7, cy - bodyRy * 1.6 + twitch * 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + bodyRx * 0.9, cy + bodyRy * 0.3);
  ctx.quadraticCurveTo(cx + bodyRx * 1.4, cy + bodyRy * 1.2 - twitch * 10, cx + bodyRx * 1.7, cy + bodyRy * 1.6 - twitch * 14);
  ctx.stroke();
}

export function drawBug(ctx: CanvasRenderingContext2D, input: DrawBugInput): void {
  const { sizePx, timeMs, id } = input;
  const rotation = input.rotation ?? 0;
  const shadowIntensity = input.shadowIntensity ?? 1;
  const reducedMotion = input.reducedMotion ?? false;
  const jitter = computeScuttleJitter(id, timeMs, { reducedMotion });
  const cx = input.pos.x + jitter.x;
  const cy = input.pos.y + jitter.y;

  const assetEntry = crowdAssetForEntity(id);
  const cached = input.imageCache ? input.imageCache.get(assetEntry.url) : { status: "loading" as const };
  const readyImage = cached.status === "ready" ? cached.image : null;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  if (readyImage) {
    drawAssetBug(ctx, readyImage, 0, 0, sizePx, rotation);
  } else {
    drawFallbackBug(ctx, 0, 0, sizePx, input.colors, id * 3 + 1, shadowIntensity, reducedMotion);
  }

  ctx.restore();
}
