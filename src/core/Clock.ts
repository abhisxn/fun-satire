export const MAX_DT_MS = 250;
export const DEFAULT_DT_MS = 16.6667;

export class Clock {
  readonly startMs: number;
  readonly prevMs: number;
  readonly totalElapsed: number;

  constructor(startMs: number = performance.now()) {
    this.startMs = startMs;
    this.prevMs = startMs;
    this.totalElapsed = 0;
  }

  tick(nowMs: number = performance.now()): number {
    const raw = nowMs - this.prevMs;
    const dt = raw < 0 ? 0 : raw > MAX_DT_MS ? MAX_DT_MS : raw;
    (this as { prevMs: number }).prevMs = nowMs;
    (this as { totalElapsed: number }).totalElapsed += dt;
    return dt;
  }

  advanceBy(dt: number): number {
    const clamped = dt < 0 ? 0 : dt > MAX_DT_MS ? MAX_DT_MS : dt;
    (this as { prevMs: number }).prevMs += clamped;
    (this as { totalElapsed: number }).totalElapsed += clamped;
    return clamped;
  }

  now(): number {
    return this.prevMs;
  }

  elapsed(): number {
    return this.totalElapsed;
  }
}
