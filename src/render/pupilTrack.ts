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

const clampInEllipse = (
  px: number,
  py: number,
  rx: number,
  ry: number,
): { x: number; y: number } => {
  if (rx <= 0 || ry <= 0) return { x: 0, y: 0 };
  const r2 = (px / rx) ** 2 + (py / ry) ** 2;
  if (r2 <= 1) return { x: px, y: py };
  const k = Math.sqrt(r2);
  return { x: px / k, y: py / k };
};

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
  const easedX = easeToward(targetX, eased.x, PUPIL_TRACK.gazeEase);
  const easedY = easeToward(targetY, eased.y, PUPIL_TRACK.gazeEase);

  const limitX = socketRx * PUPIL_TRACK.irisRadiusFraction - PUPIL_TRACK.pupilRadiusFraction;
  const limitY = socketRy * PUPIL_TRACK.irisRadiusFraction - PUPIL_TRACK.pupilRadiusFraction;
  const clamped = clampInEllipse(easedX, easedY, limitX, limitY);
  return {
    x: clamped.x,
    y: clamped.y,
    magnitude: Math.sqrt(clamped.x * clamped.x + clamped.y * clamped.y),
  };
}
