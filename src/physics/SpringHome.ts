export const SPRINGHOME = Object.freeze({
  kBase: 60,
  damping: 5.5,
  maxAccel: 1800,
} as const);

export type SpringHomeInput = {
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  home: { x: number; y: number };
  dtSeconds: number;
  scale?: number;
};

export type SpringHomeResult = {
  ax: number;
  ay: number;
};

const clampMag = (x: number, y: number, max: number): [number, number] => {
  const m = Math.sqrt(x * x + y * y);
  if (m <= max || m < 1e-9) return [x, y];
  const k = max / m;
  return [x * k, y * k];
};

export function compute(input: SpringHomeInput): SpringHomeResult {
  const scale = input.scale ?? 1;
  const k = SPRINGHOME.kBase * scale;
  const dx = input.home.x - input.pos.x;
  const dy = input.home.y - input.pos.y;
  const sx = k * dx - SPRINGHOME.damping * input.vel.x;
  const sy = k * dy - SPRINGHOME.damping * input.vel.y;
  const [ax, ay] = clampMag(sx, sy, SPRINGHOME.maxAccel);
  return { ax, ay };
}
