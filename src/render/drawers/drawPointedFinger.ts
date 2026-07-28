import { PALETTE } from "../../config/tokens";
import type { SubjectColors } from "../../content/schema";
import { FIGMA_ASSETS } from "../../assets/figmaAssetRegistry";
import type { ImageAssetCache } from "../imageAssets";
import { paperCutEdgePath, withPaperCutShadow } from "../paperCut";

export const FINGER_DRAW = Object.freeze({
  shakeAmpRad: 0.14,
  shakeSpeed: 0.014,
  envelope: Object.freeze({
    widthRatio: 0.46,
    heightRatio: 0.92,
    anchorX: 0.5,
    anchorY: 0.55,
  }),
  fallback: Object.freeze({
    wristRxFactor: 0.24,
    wristRyFactor: 0.2,
    wristOffsetYFactor: 0.22,
    fingerWidthFactor: 0.18,
    fingerLengthFactor: 0.58,
    fingerTipRadiusFactor: 0.09,
  }),
} as const);

// The Figma pointed-finger scene is not yet exported as scene assets. The
// approved interim rendering uses the exported control-hand-* fragments to
// assemble the canonical hand silhouette: wrist + palm + index + thumb. Each
// fragment is sourced from the frozen FIGMA_ASSETS table so URLs and
// provenance stay consistent.
type HandFragmentId =
  | "control-hand-wrist"
  | "control-hand-palm"
  | "control-hand-index"
  | "control-hand-finger"
  | "control-hand-thumb";

const HAND_FRAGMENTS: readonly HandFragmentId[] = Object.freeze([
  "control-hand-wrist",
  "control-hand-palm",
  "control-hand-index",
  "control-hand-finger",
  "control-hand-thumb",
]);

const handFragmentUrl = (id: HandFragmentId): string => {
  const entry = FIGMA_ASSETS.find((a) => a.id === id);
  if (!entry) throw new Error(`drawPointedFinger: missing hand fragment "${id}"`);
  return entry.url;
};

export type DrawPointedFingerInput = {
  pos: { x: number; y: number };
  sizePx: number;
  colors: SubjectColors;
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
    default: throw new Error(`drawPointedFinger: color "${k}" is not in the locked palette`);
  }
};

/** Deterministic idle point-and-shake rotation, pure function of (id, timeMs). */
export function computePointShake(
  id: number,
  timeMs: number,
  opts: { reducedMotion?: boolean } = {},
): number {
  if (opts.reducedMotion) return 0;
  const phase = id * 5.37;
  return Math.sin(timeMs * FINGER_DRAW.shakeSpeed + phase) * FINGER_DRAW.shakeAmpRad;
}

function tryDrawAssetFinger(
  ctx: CanvasRenderingContext2D,
  imageCache: ImageAssetCache,
  sizePx: number,
): boolean {
  const ready: Record<HandFragmentId, HTMLImageElement | null> = {
    "control-hand-wrist": null,
    "control-hand-palm": null,
    "control-hand-index": null,
    "control-hand-finger": null,
    "control-hand-thumb": null,
  };
  for (const id of HAND_FRAGMENTS) {
    const entry = imageCache.get(handFragmentUrl(id));
    if (entry.status !== "ready") return false;
    ready[id] = entry.image;
  }
  const w = ready["control-hand-wrist"]!;
  const palm = ready["control-hand-palm"]!;
  const index = ready["control-hand-index"]!;
  const finger = ready["control-hand-finger"]!;
  const thumb = ready["control-hand-thumb"]!;
  const s = sizePx;
  ctx.drawImage(w, -s * 0.45, s * 0.05, s * 0.9, s * 0.32);
  ctx.drawImage(palm, -s * 0.22, -s * 0.15, s * 0.44, s * 0.5);
  ctx.drawImage(index, -s * 0.08, -s * 0.6, s * 0.16, s * 0.5);
  ctx.drawImage(finger, -s * 0.04, -s * 0.55, s * 0.08, s * 0.18);
  ctx.drawImage(thumb, s * 0.05, -s * 0.12, s * 0.16, s * 0.22);
  return true;
}

function drawFallbackFinger(
  ctx: CanvasRenderingContext2D,
  sizePx: number,
  colors: SubjectColors,
  seed: number,
  shadowIntensity: number,
): void {
  const s = sizePx;
  const wristY = s * FINGER_DRAW.fallback.wristOffsetYFactor;
  const wristRx = s * FINGER_DRAW.fallback.wristRxFactor;
  const wristRy = s * FINGER_DRAW.fallback.wristRyFactor;

  withPaperCutShadow(ctx, () => {
    paperCutEdgePath(ctx, { cx: 0, cy: wristY, rx: wristRx, ry: wristRy, seed });
    ctx.fillStyle = colorByName(colors.outline);
    ctx.fill();
  }, shadowIntensity);
  paperCutEdgePath(ctx, { cx: 0, cy: wristY, rx: wristRx * 0.84, ry: wristRy * 0.8, seed });
  ctx.fillStyle = colorByName(colors.shirt);
  ctx.fill();

  ctx.fillStyle = colorByName(colors.outline);
  ctx.beginPath();
  ctx.moveTo(-s * FINGER_DRAW.fallback.fingerWidthFactor, s * 0.05);
  ctx.lineTo(-s * FINGER_DRAW.fallback.fingerWidthFactor, -s * FINGER_DRAW.fallback.fingerLengthFactor);
  ctx.quadraticCurveTo(
    -s * FINGER_DRAW.fallback.fingerWidthFactor,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor + FINGER_DRAW.fallback.fingerTipRadiusFactor),
    0,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor + FINGER_DRAW.fallback.fingerTipRadiusFactor),
  );
  ctx.quadraticCurveTo(
    s * FINGER_DRAW.fallback.fingerWidthFactor,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor + FINGER_DRAW.fallback.fingerTipRadiusFactor),
    s * FINGER_DRAW.fallback.fingerWidthFactor,
    -s * FINGER_DRAW.fallback.fingerLengthFactor,
  );
  ctx.lineTo(s * FINGER_DRAW.fallback.fingerWidthFactor, s * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colorByName(colors.shirt);
  ctx.beginPath();
  ctx.moveTo(
    -s * FINGER_DRAW.fallback.fingerWidthFactor * 0.66,
    s * 0.03,
  );
  ctx.lineTo(
    -s * FINGER_DRAW.fallback.fingerWidthFactor * 0.66,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor - 0.03),
  );
  ctx.quadraticCurveTo(
    -s * FINGER_DRAW.fallback.fingerWidthFactor * 0.66,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor + FINGER_DRAW.fallback.fingerTipRadiusFactor * 0.55),
    0,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor + FINGER_DRAW.fallback.fingerTipRadiusFactor * 0.55),
  );
  ctx.quadraticCurveTo(
    s * FINGER_DRAW.fallback.fingerWidthFactor * 0.66,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor + FINGER_DRAW.fallback.fingerTipRadiusFactor * 0.55),
    s * FINGER_DRAW.fallback.fingerWidthFactor * 0.66,
    -s * (FINGER_DRAW.fallback.fingerLengthFactor - 0.03),
  );
  ctx.lineTo(s * FINGER_DRAW.fallback.fingerWidthFactor * 0.66, s * 0.03);
  ctx.closePath();
  ctx.fill();
}

export function drawPointedFinger(ctx: CanvasRenderingContext2D, input: DrawPointedFingerInput): void {
  const { pos, sizePx, timeMs, id } = input;
  const baseRotation = input.rotation ?? 0;
  const shadowIntensity = input.shadowIntensity ?? 1;
  const reducedMotion = input.reducedMotion ?? false;
  const shake = computePointShake(id, timeMs, { reducedMotion });

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(baseRotation + shake);

  if (input.imageCache && tryDrawAssetFinger(ctx, input.imageCache, sizePx)) {
    ctx.restore();
    return;
  }

  drawFallbackFinger(ctx, sizePx, input.colors, id * 5 + 2, shadowIntensity);
  ctx.restore();
}
