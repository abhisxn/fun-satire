export const MAX_DT_MS = 250;
const sanitize = (v: number, fallback: number): number => {
  if (!Number.isFinite(v)) return fallback;
  return v < 0 ? fallback : v;
};

export class Clock {
  readonly startMs: number;
  private prevMs: number;
  private totalElapsed = 0;

  constructor(startMs: number = performance.now()) {
    this.startMs = sanitize(startMs, 0);
    this.prevMs = this.startMs;
  }

  tick(nowMs: number = performance.now()): number {
    const safeNow = sanitize(nowMs, this.prevMs);
    const raw = safeNow - this.prevMs;
    const dt = raw > MAX_DT_MS ? MAX_DT_MS : raw < 0 ? 0 : raw;
    if (safeNow > this.prevMs) this.prevMs = safeNow;
    this.totalElapsed += dt;
    return dt;
  }

  advanceBy(dt: number): number {
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    const clamped = dt > MAX_DT_MS ? MAX_DT_MS : dt;
    this.prevMs += clamped;
    this.totalElapsed += clamped;
    return clamped;
  }

  now(): number {
    return this.prevMs;
  }

  elapsed(): number {
    return this.totalElapsed;
  }
}
