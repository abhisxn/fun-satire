export interface MoveSample {
  x: number;
  y: number;
  t: number;
}

/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 900;
/** Direction reversals required within the window to count as a shake. */
export const SHAKE_REVERSAL_THRESHOLD = 4;
/** Below this speed (px/ms) a movement doesn't count toward a reversal. */
export const SHAKE_MIN_SPEED_PX_MS = 1.2;
/** Minimum gap between shake pulses, so one shake reads as a wave, not a machine-gun spawn. */
export const SHAKE_PULSE_COOLDOWN_MS = 500;

/**
 * Pure: given a chronological buffer of recent move samples, counts fast
 * direction reversals (sign flips in x or y movement between consecutive
 * fast-enough samples) within the trailing SHAKE_WINDOW_MS. A smooth fast
 * drag in one direction never reversal-counts; only whipping back and
 * forth does.
 */
export function detectShake(samples: MoveSample[]): boolean {
  if (samples.length < 3) return false;
  const last = samples[samples.length - 1]!;
  const windowStart = last.t - SHAKE_WINDOW_MS;
  const windowed = samples.filter((s) => s.t >= windowStart);
  if (windowed.length < 3) return false;

  let reversals = 0;
  let prevDx = 0;
  let prevDy = 0;
  let havePrev = false;

  for (let i = 1; i < windowed.length; i++) {
    const a = windowed[i - 1]!;
    const b = windowed[i]!;
    const dt = Math.max(8, b.t - a.t);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const speed = Math.hypot(dx, dy) / dt;

    if (speed < SHAKE_MIN_SPEED_PX_MS) {
      havePrev = false;
      continue;
    }

    if (havePrev) {
      const reversedX = prevDx !== 0 && dx !== 0 && Math.sign(dx) !== Math.sign(prevDx);
      const reversedY = prevDy !== 0 && dy !== 0 && Math.sign(dy) !== Math.sign(prevDy);
      if (reversedX || reversedY) reversals++;
    }

    prevDx = dx;
    prevDy = dy;
    havePrev = true;
  }

  return reversals >= SHAKE_REVERSAL_THRESHOLD;
}
