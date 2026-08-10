export interface PinchZoomHandle {
  attach(): void;
  detach(): void;
}

function distance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

/**
 * Two-finger pinch-to-scale gesture. Calls onScale(factor) on every
 * touchmove with exactly two fingers down, where factor is the current
 * inter-finger distance divided by the distance when the pinch started (so
 * 2 means "twice as far apart as the start of the gesture", not a delta
 * since the last event) — callers multiply their own start-of-gesture size
 * by this factor, same shape as the existing corner-handle resize drag.
 * Single-finger touches are ignored entirely so this can coexist with a
 * one-finger drag gesture registered on the same or a related element.
 */
export function attachPinchZoom(
  el: HTMLElement,
  onScale: (factor: number) => void,
  onPinchStart?: () => void,
  onPinchEnd?: () => void,
): PinchZoomHandle {
  let pinching = false;
  let startDistance = 0;

  const handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    pinching = true;
    startDistance = distance(e.touches[0]!, e.touches[1]!);
    onPinchStart?.();
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!pinching) return;
    if (e.touches.length !== 2) {
      pinching = false;
      onPinchEnd?.();
      return;
    }
    e.preventDefault();
    if (startDistance <= 0) return;
    const current = distance(e.touches[0]!, e.touches[1]!);
    onScale(current / startDistance);
  };

  const handleTouchEnd = (e: TouchEvent): void => {
    if (!pinching) return;
    if (e.touches.length < 2) {
      pinching = false;
      onPinchEnd?.();
    }
  };

  return {
    attach(): void {
      el.addEventListener("touchstart", handleTouchStart, { passive: false });
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);
    },
    detach(): void {
      el.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    },
  };
}
