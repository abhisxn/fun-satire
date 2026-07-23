export type StepVec = { x: number; y: number };

export type IntegratorInput = {
  pos: StepVec;
  vel: StepVec;
  acc: StepVec;
  dtSeconds: number;
  maxSpeed?: number;
};

const clampMag = (vx: number, vy: number, max: number): [number, number] => {
  if (!Number.isFinite(max) || max <= 0) return [vx, vy];
  const m = Math.sqrt(vx * vx + vy * vy);
  if (m <= max || m < 1e-9) return [vx, vy];
  const k = max / m;
  return [vx * k, vy * k];
};

const sanitizeDt = (dt: number): number => {
  if (!Number.isFinite(dt) || dt < 0) return 0;
  if (dt > 0.1) return 0.1;
  return dt;
};

export function integrate(input: IntegratorInput): { pos: StepVec; vel: StepVec } {
  const dt = sanitizeDt(input.dtSeconds);
  const vx = input.vel.x + input.acc.x * dt;
  const vy = input.vel.y + input.acc.y * dt;
  const [csVx, csVy] = clampMag(vx, vy, input.maxSpeed ?? Infinity);
  const px = input.pos.x + csVx * dt;
  const py = input.pos.y + csVy * dt;
  return { pos: { x: px, y: py }, vel: { x: csVx, y: csVy } };
}

export type TargetSpeedInput = {
  pos: StepVec;
  vel: StepVec;
  target: StepVec;
  acceleration: number;
  dtSeconds: number;
};

export function steerToward(input: TargetSpeedInput): StepVec {
  const dx = input.target.x - input.pos.x;
  const dy = input.target.y - input.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-6) return { x: 0, y: 0 };
  const desiredSpeed = Math.min(dist / Math.max(input.dtSeconds, 1e-3), 600);
  const desiredX = (dx / dist) * desiredSpeed;
  const desiredY = (dy / dist) * desiredSpeed;
  return {
    x: (desiredX - input.vel.x) * input.acceleration,
    y: (desiredY - input.vel.y) * input.acceleration,
  };
}
