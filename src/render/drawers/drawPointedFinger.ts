import type { ImageAssetCache } from "../imageAssets";

export const FINGER_DRAW = Object.freeze({
  shakeAmpRad: 0.14,
  shakeSpeed: 0.014,
  naturalWidth: 405,
  naturalHeight: 171,
  imageUrl: "/creatures/finger.png",
} as const);

export type DrawPointedFingerInput = {
  pos: { x: number; y: number };
  sizePx: number;
  timeMs: number;
  id: number;
  rotation?: number;
  imageCache?: ImageAssetCache;
};

export function computePointShake(id: number, timeMs: number): number {
  const phase = id * 5.37;
  return Math.sin(timeMs * FINGER_DRAW.shakeSpeed + phase) * FINGER_DRAW.shakeAmpRad;
}

export function drawPointedFinger(ctx: CanvasRenderingContext2D, input: DrawPointedFingerInput): void {
  const { pos, sizePx, timeMs, id, imageCache } = input;
  const baseRotation = input.rotation ?? 0;
  const shake = computePointShake(id, timeMs);

  if (!imageCache) return;

  const entry = imageCache.get(FINGER_DRAW.imageUrl);
  if (entry.status !== "ready") return;

  const scale = sizePx / FINGER_DRAW.naturalWidth;
  const drawW = FINGER_DRAW.naturalWidth * scale;
  const drawH = FINGER_DRAW.naturalHeight * scale;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(baseRotation + shake + Math.PI);
  ctx.drawImage(entry.image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}
