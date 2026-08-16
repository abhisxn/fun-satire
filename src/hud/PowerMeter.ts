import "./powerMeter.css";

// Figma node 447:10282 — vertical bar of 15 rounded segments (not the earlier
// horizontal row of 10 circles), filled bottom-up. Same weak->strong gradient
// as before, just sampled top-to-bottom instead of left-to-right: yellow at
// the bottom (0%), green at ~50.5%, red-orange at the top (100%).
const GRADIENT_STOPS: ReadonlyArray<{ offset: number; rgb: readonly [number, number, number] }> = [
  { offset: 0, rgb: [0xdf, 0xc3, 0x0c] },
  { offset: 0.504808, rgb: [0x8c, 0xbc, 0x24] },
  { offset: 1, rgb: [0xbc, 0x47, 0x24] },
];

const SEGMENT_COUNT = 15;
const EMPTY_SEGMENT_COLOR = "#d0c5be";
const ANCHOR_GAP_PX = 20;

function sampleGradient(t: number): string {
  let lo = GRADIENT_STOPS[0]!;
  let hi = GRADIENT_STOPS[GRADIENT_STOPS.length - 1]!;
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    if (t >= GRADIENT_STOPS[i]!.offset && t <= GRADIENT_STOPS[i + 1]!.offset) {
      lo = GRADIENT_STOPS[i]!;
      hi = GRADIENT_STOPS[i + 1]!;
      break;
    }
  }
  const span = hi.offset - lo.offset;
  const localT = span === 0 ? 0 : (t - lo.offset) / span;
  const r = Math.round(lo.rgb[0] + (hi.rgb[0] - lo.rgb[0]) * localT);
  const g = Math.round(lo.rgb[1] + (hi.rgb[1] - lo.rgb[1]) * localT);
  const b = Math.round(lo.rgb[2] + (hi.rgb[2] - lo.rgb[2]) * localT);
  return `rgb(${r}, ${g}, ${b})`;
}

export class PowerMeter {
  readonly root: HTMLElement;
  private readonly segments: HTMLElement[];
  private readonly segmentColors: string[];
  private fraction = 0;
  private anchor: HTMLElement | null = null;

  constructor() {
    const root = document.createElement("div");
    root.className = "power-meter";
    root.setAttribute("role", "meter");
    root.setAttribute("aria-label", "Protest strength");
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    root.classList.add("power-meter--hidden");
    this.root = root;

    const track = document.createElement("div");
    track.className = "power-meter__track";
    root.appendChild(track);

    // Bottom-up: segment 0 is the lowest (weakest/yellow), the last is the
    // highest (strongest/red). column-reverse on .power-meter__track (see
    // powerMeter.css) renders them in that visual order while this array
    // stays index-0-is-weakest for setFraction()'s fill math.
    this.segmentColors = [];
    this.segments = [];
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const color = sampleGradient(i / (SEGMENT_COUNT - 1));
      this.segmentColors.push(color);
      const seg = document.createElement("span");
      seg.className = "power-meter__segment";
      seg.style.background = EMPTY_SEGMENT_COLOR;
      track.appendChild(seg);
      this.segments.push(seg);
    }

    this.setFraction(0);
  }

  /** anchor is the protest button's anchor (Hud.getProtestAnchor()), used only to
   * compute position — the root itself attaches to document.body, not as a
   * descendant of the anchor, so its backdrop-filter can actually see page
   * content behind it (see powerMeter.css's top comment for why). */
  attachTo(anchor: HTMLElement): void {
    this.anchor = anchor;
    document.body.appendChild(this.root);
  }

  private updatePosition(): void {
    if (!this.anchor) return;
    const anchorRect = this.anchor.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const left = anchorRect.left + anchorRect.width / 2 - rootRect.width / 2;
    const top = anchorRect.top - ANCHOR_GAP_PX - rootRect.height;
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
  }

  setFraction(fraction: number): void {
    this.fraction = Math.max(0, Math.min(1, fraction));
    const filledCount = Math.round(this.fraction * SEGMENT_COUNT);
    this.segments.forEach((seg, i) => {
      seg.style.background = i < filledCount ? this.segmentColors[i]! : EMPTY_SEGMENT_COLOR;
    });
    this.root.setAttribute("aria-valuenow", String(Math.round(this.fraction * 100)));
  }

  getFraction(): number {
    return this.fraction;
  }

  /** Shown only while the protest button is actively being pressed and held —
   * hidden the rest of the time so it doesn't sit permanently above the button. */
  show(): void {
    this.root.classList.remove("power-meter--hidden");
    this.updatePosition();
  }

  hide(): void {
    this.root.classList.add("power-meter--hidden");
  }

  destroy(): void {
    this.root.remove();
  }
}
