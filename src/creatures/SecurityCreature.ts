import anime from "animejs";
import type { AnimeInstance } from "animejs";

export type SecurityKind = "police" | "raf";

/** Fixed on-screen width for every security sprite — deliberately much
 * smaller than the avatar sticker's 160px default, and independent of
 * whatever size the user has resized the avatar to. */
export const SECURITY_WIDTH = 55;

// height/width computed from each source PNG's native pixel dimensions
// (police.png 298x245, raf.png 260x232), so the sprite keeps its real
// proportions at the fixed display width above.
const SPRITE_ASPECT: Record<SecurityKind, number> = {
  police: 245 / 298,
  raf: 232 / 260,
};

const SPRITE_SRC: Record<SecurityKind, string> = {
  police: "/creatures/security/police.png",
  raf: "/creatures/security/raf.png",
};

export function securityHeightFor(kind: SecurityKind): number {
  return Math.round(SECURITY_WIDTH * SPRITE_ASPECT[kind]);
}

export function pickSecurityKind(rand: () => number = Math.random): SecurityKind {
  return rand() < 0.5 ? "police" : "raf";
}

export interface SecurityUnitState {
  el: HTMLImageElement;
  kind: SecurityKind;
  x: number;
  y: number;
  w: number;
  h: number;
  posAnim: AnimeInstance | null;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function applyTransform(state: SecurityUnitState): void {
  const tx = state.x - state.w / 2;
  const ty = state.y - state.h / 2;
  state.el.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0)`;
}

function nextWaypoint(state: SecurityUnitState, vw: number, vh: number): { x: number; y: number } {
  const margin = 40;
  const maxStep = 220;
  const nx = Math.max(margin, Math.min(vw - margin, state.x + rand(-maxStep, maxStep)));
  const ny = Math.max(margin, Math.min(vh - margin, state.y + rand(-maxStep, maxStep)));
  return { x: nx, y: ny };
}

/** Starts (or continues, once the current leg completes) an endless
 * waypoint wander — same shape as BugSwarm.ts's startWander, without the
 * leg-gait animation this simpler sprite doesn't have. */
export function startSecurityWander(state: SecurityUnitState, vw: number, vh: number): void {
  const target = nextWaypoint(state, vw, vh);
  const dist = Math.hypot(target.x - state.x, target.y - state.y) || 1;
  const speed = rand(30, 70);
  const duration = Math.max(400, (dist / speed) * 1000);

  state.posAnim = anime({
    targets: state,
    x: target.x,
    y: target.y,
    duration,
    easing: "easeInOutSine",
    update: () => applyTransform(state),
    complete: () => {
      state.posAnim = null;
      startSecurityWander(state, vw, vh);
    },
  });
}

export function createSecurityUnit(
  container: HTMLElement,
  x: number,
  y: number,
  kind: SecurityKind = pickSecurityKind(),
): SecurityUnitState {
  const w = SECURITY_WIDTH;
  const h = securityHeightFor(kind);

  const el = document.createElement("img");
  el.src = SPRITE_SRC[kind];
  el.alt = kind === "police" ? "Police" : "RAF";
  el.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    `width:${w}px`,
    `height:${h}px`,
    "pointer-events:none",
    "z-index:210",
    "filter:drop-shadow(0 2px 3px rgba(0,0,0,0.25))",
  ].join(";");
  container.appendChild(el);

  const state: SecurityUnitState = { el, kind, x, y, w, h, posAnim: null };
  applyTransform(state);
  return state;
}

export function removeSecurityUnit(state: SecurityUnitState): void {
  if (state.posAnim) state.posAnim.pause();
  state.el.remove();
}
