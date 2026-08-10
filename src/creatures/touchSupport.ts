/** True on touch-capable devices (phones/tablets), where hover-only affordances (mouseenter/mouseleave) never fire. */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
