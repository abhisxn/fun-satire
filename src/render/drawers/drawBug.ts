// src/render/drawers/drawBug.ts
import type { ImageAssetCache } from "../imageAssets";

export const BUG_DRAW = Object.freeze({
  jitterAmpPx: 1.6,
  jitterSpeed: 0.011,
  naturalWidth: 420,
  naturalHeight: 216,
  imageUrl: "/creatures/cockroach.png",
} as const);

export type DrawBugInput = {
  pos: { x: number; y: number };
  sizePx: number;
  timeMs: number;
  id: number;
  rotation?: number;
  imageCache?: ImageAssetCache;
};

export function computeScuttleJitter(id: number, timeMs: number): { x: number; y: number } {
  const phase = id * 12.9898;
  const t = timeMs * BUG_DRAW.jitterSpeed;
  return {
    x: Math.sin(t + phase) * BUG_DRAW.jitterAmpPx,
    y: Math.cos(t * 1.3 + phase) * BUG_DRAW.jitterAmpPx,
  };
}

export function drawBug(ctx: CanvasRenderingContext2D, input: DrawBugInput): void {
  const { pos, sizePx, timeMs, id, imageCache } = input;
  const rotation = input.rotation ?? 0;
  const jitter = computeScuttleJitter(id, timeMs);
  const cx = pos.x + jitter.x;
  const cy = pos.y + jitter.y;

  if (!imageCache) return;

  const entry = imageCache.get(BUG_DRAW.imageUrl);
  if (entry.status !== "ready") return;

  const scale = sizePx / BUG_DRAW.naturalWidth;
  const drawW = BUG_DRAW.naturalWidth * scale;
  const drawH = BUG_DRAW.naturalHeight * scale;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation + Math.PI);
  ctx.drawImage(entry.image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}
