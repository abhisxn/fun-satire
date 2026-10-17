import "./unityRing.css";

/** Ring never shrinks below this diameter so a very tight crowd still shows one. */
export const RING_MIN_DIAMETER_PX = 160;
/** The ring sits this far outside the crowd's mean spread (a mean is well inside the edge). */
export const RING_SPREAD_MULTIPLIER = 2.4;
/** Below this unity the ring stays invisible. */
export const RING_VISIBLE_FROM_UNITY = 0.08;

export interface RingStyle {
  visible: boolean;
  x: number;
  y: number;
  diameter: number;
  opacity: number;
  borderWidth: number;
}

/**
 * Pure: where and how strongly to draw the pressure ring. Opacity and thickness rise with
 * unity; the ring is hidden with no crowd or very low unity.
 */
export function computeRingStyle(
  unity: number,
  centroid: { x: number; y: number } | null,
  spread: number,
): RingStyle {
  if (!centroid || unity < RING_VISIBLE_FROM_UNITY) {
    return { visible: false, x: 0, y: 0, diameter: 0, opacity: 0, borderWidth: 0 };
  }
  const u = Math.max(0, Math.min(1, unity));
  return {
    visible: true,
    x: centroid.x,
    y: centroid.y,
    diameter: Math.max(RING_MIN_DIAMETER_PX, spread * RING_SPREAD_MULTIPLIER),
    opacity: 0.15 + 0.7 * u,
    borderWidth: 1 + 5 * u,
  };
}

/** A soft ring around the crowd that thickens as unity rises and glows once force breaks. */
export class UnityRing {
  readonly el: HTMLDivElement;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "unity-ring unity-ring--hidden";
    this.el.setAttribute("aria-hidden", "true");
  }

  attachTo(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  update(
    unity: number,
    centroid: { x: number; y: number } | null,
    spread: number,
    broken: boolean,
  ): void {
    const s = computeRingStyle(unity, centroid, spread);
    this.el.classList.toggle("unity-ring--hidden", !s.visible);
    this.el.classList.toggle("unity-ring--broken", broken && s.visible);
    if (!s.visible) return;
    const style = this.el.style;
    style.width = `${s.diameter.toFixed(0)}px`;
    style.height = `${s.diameter.toFixed(0)}px`;
    style.transform = `translate3d(${(s.x - s.diameter / 2).toFixed(1)}px,${(s.y - s.diameter / 2).toFixed(1)}px,0)`;
    style.opacity = s.opacity.toFixed(2);
    style.borderWidth = `${s.borderWidth.toFixed(1)}px`;
  }

  destroy(): void {
    this.el.remove();
  }
}
