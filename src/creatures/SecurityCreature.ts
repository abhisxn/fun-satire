import anime from "animejs";
import type { AnimeInstance } from "animejs";

export type SecurityKind = "police" | "raf";

/** Fixed on-screen width for every security sprite — deliberately much
 * smaller than the avatar sticker's 160px default, and independent of
 * whatever size the user has resized the avatar to. */
export const SECURITY_WIDTH = 55;

export interface SecuritySprite {
  src: string;
  aspect: number; // native height / width
}

// Each kind now has 2 visual variants — a unit's SecurityKind ("police"/"raf")
// stays the gameplay-relevant category (see pickPulseKinds in RaidController.ts,
// which guarantees one of each per pulse); which specific sprite variant renders
// is a separate, purely cosmetic random pick.
const SPRITE_VARIANTS: Record<SecurityKind, SecuritySprite[]> = {
  police: [
    { src: "/creatures/security/police.png", aspect: 245 / 298 },
    { src: "/creatures/security/police-2.png", aspect: 250 / 254 },
  ],
  raf: [
    { src: "/creatures/security/raf.png", aspect: 232 / 260 },
    { src: "/creatures/security/raf2.png", aspect: 245 / 267 },
  ],
};

/** Picks a random visual variant for the given kind. `rand` is injectable for
 * deterministic tests, matching the pattern used by pickSecurityKind. */
export function pickSecuritySprite(kind: SecurityKind, rand: () => number = Math.random): SecuritySprite {
  const variants = SPRITE_VARIANTS[kind];
  return variants[Math.floor(rand() * variants.length)]!;
}

/** Equal to the avatar/sticker's z-index (100, see StickerOverlay.STICKER_Z_INDEX). Security
 * units are appended into the avatar's own DOM parent (see RaidController's `avatarLayer`
 * config, not the `#stage` container used for viewport-size reads) so this comparison is
 * actually meaningful — `#stage` itself sits at z-index 500 in index.html, so anything
 * appended inside it would outrank the avatar regardless of its own z-index. With both in
 * the same stacking context and the same z-index, the avatar staying on top is guaranteed
 * by DOM order instead: main.ts re-appends the avatar element to the end of its parent
 * every frame a raid is active, so it's always the later — and therefore topmost — sibling
 * at this tie. */
export const SECURITY_Z_INDEX = 100;

/** Duration of a freshly-spawned unit's scale/opacity pop-in (ms). */
export const SECURITY_ENTER_MS = 280;
/** Duration a unit spends shrinking (repel radius easing to 0) before RaidController.tick() removes it (ms). */
export const SECURITY_SHRINK_MS = 250;

export function securityHeightFor(sprite: SecuritySprite): number {
  return Math.round(SECURITY_WIDTH * sprite.aspect);
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
  const sprite = pickSecuritySprite(kind);
  const w = SECURITY_WIDTH;
  const h = securityHeightFor(sprite);

  const el = document.createElement("img");
  el.src = sprite.src;
  el.alt = kind === "police" ? "Police" : "RAF";
  el.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    `width:${w}px`,
    `height:${h}px`,
    "pointer-events:none",
    `z-index:${SECURITY_Z_INDEX}`,
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
