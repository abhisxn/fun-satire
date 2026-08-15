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

/** Strictly below the avatar/sticker's z-index (100, see StickerOverlay.STICKER_Z_INDEX)
 * so security can never render above the avatar, regardless of DOM append order. */
export const SECURITY_Z_INDEX = 90;

/** Duration of a freshly-spawned unit's scale/opacity pop-in (ms). */
export const SECURITY_ENTER_MS = 280;
/** Duration a unit spends shrinking (repel radius easing to 0) before RaidController.tick() removes it (ms). */
export const SECURITY_SHRINK_MS = 250;

export function securityHeightFor(kind: SecurityKind): number {
  return Math.round(SECURITY_WIDTH * SPRITE_ASPECT[kind]);
}

export function pickSecurityKind(rand: () => number = Math.random): SecurityKind {
  return rand() < 0.5 ? "police" : "raf";
}

export type SecurityPhase = "entering" | "wandering" | "shrinking";

export interface SecurityUnitState {
  el: HTMLImageElement;
  kind: SecurityKind;
  x: number;
  y: number;
  w: number;
  h: number;
  posAnim: AnimeInstance | null;
  phase: SecurityPhase;
  phaseStartMs: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Pure: 0 at phaseStartMs, ramping linearly to 1 (fully shown) over SECURITY_ENTER_MS. */
export function computeSecurityEnterProgress(
  phaseStartMs: number,
  nowMs: number,
): { scale: number; opacity: number; done: boolean } {
  const t = nowMs - phaseStartMs;
  if (t <= 0) return { scale: 0, opacity: 0, done: false };
  if (t >= SECURITY_ENTER_MS) return { scale: 1, opacity: 1, done: true };
  const p = t / SECURITY_ENTER_MS;
  return { scale: p, opacity: p, done: false };
}

/** Pure: 1 (full strength) until phaseStartMs, ramping linearly to 0 over SECURITY_SHRINK_MS.
 * Clamped to [0,1] so a phaseStartMs still in the future (staggered recovery — see
 * RaidController.startRecovery) reads as "hasn't started shrinking yet" instead of going negative. */
export function computeSecurityShrinkFraction(phaseStartMs: number, nowMs: number): number {
  const t = (nowMs - phaseStartMs) / SECURITY_SHRINK_MS;
  return 1 - Math.max(0, Math.min(1, t));
}

function applyTransform(state: SecurityUnitState): void {
  const tx = state.x - state.w / 2;
  const ty = state.y - state.h / 2;

  let scale = 1;
  let opacity = 1;
  if (state.phase === "entering") {
    const progress = computeSecurityEnterProgress(state.phaseStartMs, Date.now());
    scale = progress.scale;
    opacity = progress.opacity;
    if (progress.done) state.phase = "wandering";
  }

  state.el.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
  state.el.style.opacity = String(opacity);
}

function nextWaypoint(state: SecurityUnitState, vw: number, vh: number): { x: number; y: number } {
  const margin = 40;
  const maxStep = 220;
  const nx = Math.max(margin, Math.min(vw - margin, state.x + rand(-maxStep, maxStep)));
  const ny = Math.max(margin, Math.min(vh - margin, state.y + rand(-maxStep, maxStep)));
  return { x: nx, y: ny };
}

/** First-leg waypoint for a freshly-spawned unit: a large step (150-300px) in a random
 * direction, so a pulse visibly bursts outward like a disturbed swarm before settling
 * into normal wander. `randFn` is injectable for deterministic tests. */
export function burstWaypoint(
  state: { x: number; y: number },
  vw: number,
  vh: number,
  randFn: () => number = Math.random,
): { x: number; y: number } {
  const margin = 40;
  const angle = randFn() * Math.PI * 2;
  const dist = 150 + randFn() * 150;
  const nx = Math.max(margin, Math.min(vw - margin, state.x + Math.cos(angle) * dist));
  const ny = Math.max(margin, Math.min(vh - margin, state.y + Math.sin(angle) * dist));
  return { x: nx, y: ny };
}

/** Starts (or continues, once the current leg completes) an endless
 * waypoint wander — same shape as BugSwarm.ts's startWander, without the
 * leg-gait animation this simpler sprite doesn't have. Pass `initialBurst`
 * true for a freshly-spawned unit's first leg only. */
export function startSecurityWander(
  state: SecurityUnitState,
  vw: number,
  vh: number,
  initialBurst = false,
): void {
  const target = initialBurst ? burstWaypoint(state, vw, vh) : nextWaypoint(state, vw, vh);
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
    `z-index:${SECURITY_Z_INDEX}`,
    "filter:drop-shadow(0 1px 1px rgba(0,0,0,0.12))",
  ].join(";");
  container.appendChild(el);

  const state: SecurityUnitState = {
    el,
    kind,
    x,
    y,
    w,
    h,
    posAnim: null,
    phase: "entering",
    phaseStartMs: Date.now(),
  };
  applyTransform(state);
  return state;
}

export function removeSecurityUnit(state: SecurityUnitState): void {
  if (state.posAnim) state.posAnim.pause();
  state.el.remove();
}
