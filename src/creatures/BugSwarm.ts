import anime from "animejs";
import type { AnimeInstance } from "animejs";

interface BugState {
  el: HTMLDivElement;
  svg: SVGSVGElement;
  legs: { el: SVGGElement; group: "A" | "B" }[];
  x: number;
  y: number;
  w: number;
  h: number;
  heading: number;
  gaitPhase: number;
  posAnim: AnimeInstance | null;
  gaitAnim: AnimeInstance | null;
}

const TINTS: ReadonlyArray<readonly [string, string]> = [
  ["#5D4949", "#2A2420"],
  ["#49525D", "#2A2420"],
  ["#4A5D49", "#2A2420"],
  ["#5D4F3A", "#2A2420"],
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shortestAngleTo(from: number, to: number): number {
  const diff = (((to - from + 180) % 360) + 360) % 360 - 180;
  return from + diff;
}

function buildBugNode(): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "bug";
  node.style.cssText =
    "position:absolute;top:0;left:0;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.18));";

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg") as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 35 67");
  svg.setAttribute("width", "30");
  svg.setAttribute("height", "57");
  svg.style.cssText = "display:block;overflow:visible;";

  const legPaths: ReadonlyArray<{ tx: number; ty: number; d: string; group: "A" | "B" }> = [
    { tx: 22.2671, ty: 48.6146, d: "M0,0 L7.5063,-1.6221 L3.0025,12.3854 L4.7329,16.3854", group: "A" },
    { tx: 22.2671, ty: 38.6045, d: "M0,0 L7.2329,-1.1045 L11.2329,5.3955", group: "B" },
    { tx: 24.1437, ty: 31.0957, d: "M0,0 L4.3563,-2.5957 L9.3563,-1.5957", group: "A" },
    { tx: 13.2329, ty: 48.6146, d: "M0,0 L-7.5063,-1.6221 L-3.0025,12.3854 L-4.7329,16.3854", group: "B" },
    { tx: 13.2329, ty: 38.6045, d: "M0,0 L-7.2329,-1.1045 L-11.2329,5.3955", group: "A" },
    { tx: 11.3563, ty: 31.0957, d: "M0,0 L-4.3563,-2.5957 L-9.3563,-1.5957", group: "B" },
  ];

  for (const leg of legPaths) {
    const hip = document.createElementNS(svgNS, "g") as SVGGElement;
    hip.setAttribute("transform", `translate(${leg.tx},${leg.ty})`);
    hip.classList.add("leg-hip");
    const swing = document.createElementNS(svgNS, "g") as SVGGElement;
    swing.classList.add("leg-swing", "leg");
    swing.dataset.group = leg.group;
    const path = document.createElementNS(svgNS, "path") as SVGPathElement;
    path.setAttribute("d", leg.d);
    path.style.cssText = "stroke:var(--stroke-0,#2A2420);stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;fill:none;";
    swing.appendChild(path);
    hip.appendChild(swing);
    svg.appendChild(hip);
  }

  const body = document.createElementNS(svgNS, "path") as SVGPathElement;
  body.setAttribute("class", "body");
  body.setAttribute(
    "d",
    "M26.0014 30.345C26.0014 35.9415 26.8143 61.4961 17.7633 61.4961C8.71226 61.4961 9.5252 35.9415 9.5252 30.345C9.5252 24.7484 13.2135 20.2115 17.7633 20.2114C22.3131 20.2114 26.0014 24.7484 26.0014 30.345Z",
  );
  body.style.cssText = "fill:var(--fill-0,#5D4949);";
  svg.appendChild(body);

  const antenna1 = document.createElementNS(svgNS, "path") as SVGPathElement;
  antenna1.setAttribute("class", "antenna");
  antenna1.setAttribute("d", "M20.7657 21.7128C21.7666 14.3316 25.1945 -0.130604 30.8993 1.07041");
  antenna1.style.cssText = "stroke:var(--stroke-0,#2A2420);stroke-width:1.75;stroke-linecap:round;fill:none;";
  svg.appendChild(antenna1);

  const antenna2 = document.createElementNS(svgNS, "path") as SVGPathElement;
  antenna2.setAttribute("class", "antenna");
  antenna2.setAttribute("d", "M14.3854 21.7128C13.3845 14.3316 9.95665 -0.130604 4.25186 1.07041");
  antenna2.style.cssText = "stroke:var(--stroke-0,#2A2420);stroke-width:1.75;stroke-linecap:round;fill:none;";
  svg.appendChild(antenna2);

  node.appendChild(svg);
  return node;
}

function nextWaypoint(state: BugState, vw: number, vh: number): { x: number; y: number } {
  const margin = 40;
  const maxStep = 260;
  const nx = Math.max(margin, Math.min(vw - margin, state.x + rand(-maxStep, maxStep)));
  const ny = Math.max(margin, Math.min(vh - margin, state.y + rand(-maxStep, maxStep)));
  return { x: nx, y: ny };
}

function applyTransform(state: BugState): void {
  const tx = state.x - state.w / 2;
  const ty = state.y - state.h / 2;
  state.el.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) rotate(${state.heading.toFixed(1)}deg)`;
}

function startWander(state: BugState, vw: number, vh: number): void {
  const target = nextWaypoint(state, vw, vh);
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  const dist = Math.hypot(dx, dy) || 1;
  const targetHeadingDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  const headingTo = shortestAngleTo(state.heading, targetHeadingDeg);
  const speed = rand(35, 80);
  const duration = (dist / speed) * 1000;

  state.posAnim = anime({
    targets: state,
    x: target.x,
    y: target.y,
    heading: headingTo,
    duration: Math.max(400, duration),
    easing: "easeInOutSine",
    update: () => applyTransform(state),
    complete: () => {
      state.posAnim = null;
      startWander(state, vw, vh);
    },
  });
}

function startGait(state: BugState): void {
  state.gaitAnim = anime({
    targets: state,
    gaitPhase: 360,
    duration: rand(450, 700),
    easing: "linear",
    loop: true,
    update: () => {
      const rad = (state.gaitPhase * Math.PI) / 180;
      const amplitude = 13;
      for (const leg of state.legs) {
        const phase = rad + (leg.group === "A" ? 0 : Math.PI);
        const delta = Math.sin(phase) * amplitude;
        leg.el.setAttribute("transform", `rotate(${delta.toFixed(1)})`);
      }
    },
  });
}

function makeBug(container: HTMLElement, x: number, y: number): BugState {
  const node = buildBugNode();
  const tint = TINTS[Math.floor(rand(0, TINTS.length))]!;
  node.style.setProperty("--fill-0", tint[0]);
  node.style.setProperty("--stroke-0", tint[1]);
  const scale = rand(0.1, 0.3);
  const svg = node.querySelector("svg") as SVGSVGElement;
  svg.style.transform = `scale(${scale.toFixed(2)})`;
  container.appendChild(node);

  const legs = Array.from(node.querySelectorAll<SVGGElement>(".leg-swing")).map((el) => ({
    el,
    group: (el.dataset.group === "B" ? "B" : "A") as "A" | "B",
  }));

  const state: BugState = {
    el: node,
    svg,
    legs,
    x,
    y,
    w: 30 * scale,
    h: 57 * scale,
    heading: rand(0, 360),
    gaitPhase: 0,
    posAnim: null,
    gaitAnim: null,
  };
  applyTransform(state);
  return state;
}

const SCATTER_MIN = 10;
const SCATTER_MAX = 16;

export class BugSwarm {
  private readonly container: HTMLElement;
  private bugs: BugState[] = [];
  private active = false;
  private boundClick: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.scatter();
      this.attachClick();
    } else {
      this.detachClick();
      this.clear();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getCount(): number {
    return this.bugs.length;
  }

  private scatter(): void {
    this.clear();
    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const n = Math.floor(rand(SCATTER_MIN, SCATTER_MAX));
    for (let i = 0; i < n; i++) {
      const b = makeBug(this.container, rand(0, vw), rand(0, vh));
      startWander(b, vw, vh);
      startGait(b);
      this.bugs.push(b);
    }
  }

  private clear(): void {
    for (const bug of this.bugs) {
      if (bug.posAnim) bug.posAnim.pause();
      if (bug.gaitAnim) bug.gaitAnim.pause();
      bug.el.remove();
    }
    this.bugs = [];
  }

  private attachClick(): void {
    this.boundClick = (e: MouseEvent) => {
      const b = makeBug(this.container, e.clientX, e.clientY);
      const vw = this.container.clientWidth || window.innerWidth;
      const vh = this.container.clientHeight || window.innerHeight;
      startWander(b, vw, vh);
      startGait(b);
      this.bugs.push(b);
    };
    this.container.addEventListener("click", this.boundClick);
  }

  private detachClick(): void {
    if (this.boundClick) {
      this.container.removeEventListener("click", this.boundClick);
      this.boundClick = null;
    }
  }
}
