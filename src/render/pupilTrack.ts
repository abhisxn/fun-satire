export const PUPIL_TRACK = Object.freeze({
  gazeEase: 0.18,
  irisRadiusFraction: 0.42,
  pupilRadiusFraction: 0.22,
} as const);

export type PupilComputeInput = {
  eyePos: { x: number; y: number };
  cursor: { x: number; y: number; active: boolean };
  socketRx: number;
  socketRy: number;
  maxOffsetFactor?: number;
  easedPrev?: { x: number; y: number };
};

export type PupilComputeOutput = {
  x: number;
  y: number;
  magnitude: number;
};

const easeToward = (
  target: number,
  current: number,
  factor: number,
): number => current + (target - current) * factor;

export function computePupilOffset(input: PupilComputeInput): PupilComputeOutput {
  const { eyePos, cursor, socketRx, socketRy } = input;
  if (!cursor.active || socketRx <= 0 || socketRy <= 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  const dx = cursor.x - eyePos.x;
  const dy = cursor.y - eyePos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-6) return { x: 0, y: 0, magnitude: 0 };
  const reach = Math.min(dist, Math.max(socketRx, socketRy));
  const dirX = dx / dist;
  const dirY = dy / dist;
  const targetX = dirX * reach * PUPIL_TRACK.irisRadiusFraction;
  const targetY = dirY * reach * (socketRy / socketRx) * PUPIL_TRACK.irisRadiusFraction;
  const eased = input.easedPrev ?? { x: 0, y: 0 };
  const nx = easeToward(targetX, eased.x, PUPIL_TRACK.gazeEase);
  const ny = easeToward(targetY, eased.y, PUPIL_TRACK.gazeEase);

  const maxFactor = input.maxOffsetFactor ?? 1;
  const pupilMargin = PUPIL_TRACK.pupilRadiusFraction;
  const limX = (socketRx - pupilMargin) * PUPIL_TRACK.irisRadiusFraction * maxFactor;
  const limY = (socketRy - pupilMargin) * PUPIL_TRACK.irisRadiusFraction * maxFactor;

  const ellipseBound = (px: number, py: number, rx: number, ry: number): number => {
    if (rx <= 0 || ry <= 0) return 0;
    const nx2 = (px / rx) ** 2;
    const ny2 = (py / ry) ** 2;
    return nx2 + ny2;
  };

  const limitScale = Math.max(0.05, limX > 0 ? limX / Math.max(socketRx * 0.42, 1) : 0);
  const finalX = (() => {
    if (limitScale <= 0) return nx;
    const sx = limX * limitScale;
    const sy = limY * limitScale;
    const r = ellipseBound(nx, ny, sx, sy);
    if (r <= 1) return nx;
    const k = Math.sqrt(r);
    return k > 0 ? nx / k : nx;
  })();
  const finalY = (() => {
    if (limitScale <= 0) return ny;
    const sx = limX * limitScale;
    const sy = limY * limitScale;
    const r = ellipseBound(nx, ny, sx, sy);
    if (r <= 1) return ny;
    const k = Math.sqrt(r) > 0 ? Math.sqrt(r) : 1;
    return ny / k;
  })();

  return {
    x: finalX,
    y: finalY,
    magnitude: Math.sqrt(finalX * finalX + finalY * finalY),
  };
}
