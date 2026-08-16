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
export const SPRITE_VARIANTS: Record<SecurityKind, SecuritySprite[]> = {
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
  return variants[Math.min(variants.length - 1, Math.floor(rand() * variants.length))]!;
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

/** Base radius (px) a security unit orbits the avatar at while escorting. */
export const SECURITY_ESCORT_RADIUS = 130;
/** How far each unit's own escortRadius is randomized from the base, in either direction. */
export const SECURITY_ESCORT_RADIUS_JITTER = 25;
/** Per-tick lerp factor easing a unit toward its escort target — small, so the formation
 * trails the avatar smoothly rather than snapping to it. */
export const SECURITY_ESCORT_EASE = 0.08;
/** How far (radians) a unit's effective angle wobbles from its assigned escortAngle. */
export const SECURITY_ESCORT_WOBBLE_RAD = 0.35;
/** Full period (ms) of one wobble cycle — a slow back-and-forth pace, not a fast jitter. */
export const SECURITY_ESCORT_WOBBLE_PERIOD_MS = 2200;
/** Minimum center-to-center distance (px) two security units keep from each other and the
 * avatar — closer than this, applySecurityCollisions() pushes them apart. Set just under
 * SECURITY_WIDTH so units read as touching-but-not-overlapping at the boundary. */
export const SECURITY_COLLISION_RADIUS = 50;
/** How strongly overlapping units push apart per tick (fraction of the overlap distance). */
export const SECURITY_COLLISION_STRENGTH = 0.15;
/** Minimum distance (px) a security unit keeps from the avatar itself — if escort wobble
 * or mutual-collision jostling ever pushes a unit closer than this, it gets pushed back
 * out, so units never visually overlap the avatar sticker. */
export const SECURITY_AVATAR_REPEL_RADIUS = 100;
/** How strongly a unit is pushed back out of the avatar-repel zone per tick. */
export const SECURITY_AVATAR_REPEL_STRENGTH = 0.15;

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
  /** Base angle (radians) this unit holds around the avatar while escorting — assigned/
   * re-spread across the active roster by RaidController via assignEscortFormation(). The
   * unit's actual angle at any instant also wobbles around this via applyEscortStep(). */
  escortAngle: number;
  /** This unit's own orbit radius (px) — randomized per unit around SECURITY_ESCORT_RADIUS
   * so the formation isn't a perfectly circular ring. */
  escortRadius: number;
  /** Per-unit phase offset (ms) for the wobble sine wave, so units don't wobble in sync. */
  escortPhaseOffsetMs: number;
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

export function applyTransform(state: SecurityUnitState): void {
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

/** One-shot entrance: bursts a freshly-spawned unit outward from the avatar like a
 * disturbed swarm. Once this leg completes, RaidController.tick() takes over positioning
 * every frame via applyEscortStep()/applySecurityCollisions() — this function doesn't
 * recurse into further legs. */
export function startSecurityEntranceBurst(
  state: SecurityUnitState,
  vw: number,
  vh: number,
): void {
  const target = burstWaypoint(state, vw, vh);
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
    },
  });
}

/** Re-spreads escort angles, per-unit radius jitter, and per-unit wobble phase across the
 * full active roster (not just new units), so the formation stays evenly spaced and varied
 * as units join/leave. `randFn` is injectable for deterministic tests. */
export function assignEscortFormation(
  units: SecurityUnitState[],
  randFn: () => number = Math.random,
): void {
  const n = units.length;
  for (let i = 0; i < n; i++) {
    const unit = units[i]!;
    unit.escortAngle = (i / n) * Math.PI * 2;
    unit.escortRadius = SECURITY_ESCORT_RADIUS + (randFn() * 2 - 1) * SECURITY_ESCORT_RADIUS_JITTER;
    unit.escortPhaseOffsetMs = randFn() * 10000;
  }
}

/** Eases a unit toward avatar position + its escort offset, wobbling the effective angle
 * around escortAngle as a pure function of nowMs (no velocity integration, no per-frame
 * drift accumulation — the wobble at any instant is computed fresh). Called every frame by
 * RaidController.tick() for as long as the unit exists. No-op during the entrance burst
 * (that leg is still animating via startSecurityEntranceBurst's own anime tween). */
export function applyEscortStep(
  state: SecurityUnitState,
  avatarX: number,
  avatarY: number,
  nowMs: number,
  ease: number = SECURITY_ESCORT_EASE,
): void {
  if (state.phase === 'entering') return;
  const wobble =
    Math.sin((2 * Math.PI * (nowMs + state.escortPhaseOffsetMs)) / SECURITY_ESCORT_WOBBLE_PERIOD_MS) *
    SECURITY_ESCORT_WOBBLE_RAD;
  const angle = state.escortAngle + wobble;
  const targetX = avatarX + Math.cos(angle) * state.escortRadius;
  const targetY = avatarY + Math.sin(angle) * state.escortRadius;
  state.x += (targetX - state.x) * ease;
  state.y += (targetY - state.y) * ease;
  applyTransform(state);
}

/** Pairwise positional repulsion across the active roster so units don't overlap or pass
 * through each other — same shape as applyRepulsion in creaturePhysics.ts, but positional
 * rather than velocity-based, since security units are stepped directly toward their
 * escort target each frame rather than integrated via vx/vy. Ignores units still in their
 * entrance burst (their position is owned by that leg's anime tween). */
export function applySecurityCollisions(units: SecurityUnitState[]): void {
  for (let i = 0; i < units.length; i++) {
    const a = units[i]!;
    if (a.phase === 'entering') continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j]!;
      if (b.phase === 'entering') continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= SECURITY_COLLISION_RADIUS || dist < 1e-6) continue;
      const overlap = SECURITY_COLLISION_RADIUS - dist;
      const pushX = (dx / dist) * overlap * SECURITY_COLLISION_STRENGTH;
      const pushY = (dy / dist) * overlap * SECURITY_COLLISION_STRENGTH;
      a.x -= pushX;
      a.y -= pushY;
      b.x += pushX;
      b.y += pushY;
      applyTransform(a);
      applyTransform(b);
    }
  }
}

/** Pushes a security unit away from the avatar's own position if escort wobble or
 * mutual-collision jostling has brought it closer than SECURITY_AVATAR_REPEL_RADIUS —
 * positional, not velocity-based, same reasoning as applySecurityCollisions. No-op during
 * the entrance burst. */
export function applyAvatarRepel(state: SecurityUnitState, avatarX: number, avatarY: number): void {
  if (state.phase === 'entering') return;
  const dx = state.x - avatarX;
  const dy = state.y - avatarY;
  const dist = Math.hypot(dx, dy);
  if (dist >= SECURITY_AVATAR_REPEL_RADIUS || dist < 1e-6) return;
  const overlap = SECURITY_AVATAR_REPEL_RADIUS - dist;
  state.x += (dx / dist) * overlap * SECURITY_AVATAR_REPEL_STRENGTH;
  state.y += (dy / dist) * overlap * SECURITY_AVATAR_REPEL_STRENGTH;
  applyTransform(state);
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
    escortAngle: 0,
    escortRadius: SECURITY_ESCORT_RADIUS,
    escortPhaseOffsetMs: 0,
  };
  applyTransform(state);
  return state;
}

export function removeSecurityUnit(state: SecurityUnitState): void {
  if (state.posAnim) state.posAnim.pause();
  state.el.remove();
}
