# Raid/Protest v2 Implementation Plan — Task 8

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues from [Task 7](2026-08-16-raid-protest-v2-task-7.md).

## Task 8: Security escorts the avatar (natural motion + collision avoidance)

**Files:**
- Modify: `src/creatures/SecurityCreature.ts:41-53,79-148`
- Modify: `src/creatures/RaidController.ts:1-11,159-180,236-246,275-314`
- Test: `tests/unit/securityCreature.test.ts`
- Test: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Write the failing tests in securityCreature.test.ts**

Add the new exports to the import from `'../../src/creatures/SecurityCreature'`:

```ts
import {
  SECURITY_WIDTH,
  SECURITY_Z_INDEX,
  SECURITY_ENTER_MS,
  SECURITY_SHRINK_MS,
  SECURITY_ESCORT_RADIUS,
  SECURITY_ESCORT_RADIUS_JITTER,
  SECURITY_ESCORT_EASE,
  SECURITY_ESCORT_WOBBLE_RAD,
  SECURITY_ESCORT_WOBBLE_PERIOD_MS,
  SECURITY_COLLISION_RADIUS,
  securityHeightFor,
  pickSecurityKind,
  createSecurityUnit,
  removeSecurityUnit,
  computeSecurityEnterProgress,
  computeSecurityShrinkFraction,
  burstWaypoint,
  assignEscortFormation,
  applyEscortStep,
  applySecurityCollisions,
} from '../../src/creatures/SecurityCreature';
```

Add new `describe` blocks at the end of the file, before the final closing `});`:

```ts
  describe('assignEscortFormation', () => {
    it('spreads N units evenly across a full circle', () => {
      const units = [
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
      ];

      assignEscortFormation(units, () => 0.5);

      expect(units[0]!.escortAngle).toBeCloseTo(0, 5);
      expect(units[1]!.escortAngle).toBeCloseTo(Math.PI / 2, 5);
      expect(units[2]!.escortAngle).toBeCloseTo(Math.PI, 5);
      expect(units[3]!.escortAngle).toBeCloseTo((3 * Math.PI) / 2, 5);
    });

    it('assigns each unit its own escort radius within the jitter range, not one shared constant', () => {
      const units = [
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
      ];

      assignEscortFormation(units, () => 1); // maxes out the jitter: +SECURITY_ESCORT_RADIUS_JITTER

      for (const unit of units) {
        expect(unit.escortRadius).toBeCloseTo(SECURITY_ESCORT_RADIUS + SECURITY_ESCORT_RADIUS_JITTER, 5);
      }
    });

    it('assigns each unit a phase offset so their wobble is desynced', () => {
      const units = [createSecurityUnit(container, 0, 0, 'police')];

      assignEscortFormation(units, () => 0.5);

      expect(units[0]!.escortPhaseOffsetMs).toBeCloseTo(5000, 5);
    });
  });

  describe('applyEscortStep', () => {
    it('eases the unit toward avatar position + its escort offset', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.escortAngle = 0; // offset purely on +x
      unit.escortRadius = SECURITY_ESCORT_RADIUS;
      unit.escortPhaseOffsetMs = 0; // wobble = sin(0) = 0 at nowMs = 0, no wobble this instant

      applyEscortStep(unit, 200, 200, 0, SECURITY_ESCORT_EASE);

      const targetX = 200 + SECURITY_ESCORT_RADIUS;
      const targetY = 200;
      expect(unit.x).toBeCloseTo((targetX - 0) * SECURITY_ESCORT_EASE, 5);
      expect(unit.y).toBeCloseTo((targetY - 0) * SECURITY_ESCORT_EASE, 5);
    });

    it('does nothing while the unit is still in its entrance burst', () => {
      const unit = createSecurityUnit(container, 10, 10, 'police');
      expect(unit.phase).toBe('entering');

      applyEscortStep(unit, 999, 999, 0, SECURITY_ESCORT_EASE);

      expect(unit.x).toBe(10);
      expect(unit.y).toBe(10);
    });

    it('wobbles the effective angle around escortAngle as nowMs advances', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.escortAngle = 0;
      unit.escortRadius = SECURITY_ESCORT_RADIUS;
      unit.escortPhaseOffsetMs = 0;

      // A quarter period in, sin() peaks at 1 — maximum wobble offset.
      const quarterPeriod = SECURITY_ESCORT_WOBBLE_PERIOD_MS / 4;
      applyEscortStep(unit, 0, 0, quarterPeriod, 1); // ease=1 snaps straight to target

      const expectedAngle = SECURITY_ESCORT_WOBBLE_RAD;
      expect(unit.x).toBeCloseTo(Math.cos(expectedAngle) * SECURITY_ESCORT_RADIUS, 3);
      expect(unit.y).toBeCloseTo(Math.sin(expectedAngle) * SECURITY_ESCORT_RADIUS, 3);
    });
  });

  describe('applySecurityCollisions', () => {
    it('pushes two overlapping units apart', () => {
      const a = createSecurityUnit(container, 100, 100, 'police');
      const b = createSecurityUnit(container, 110, 100, 'police'); // 10px apart, well inside SECURITY_COLLISION_RADIUS
      a.phase = 'wandering';
      b.phase = 'wandering';

      applySecurityCollisions([a, b]);

      const distAfter = Math.hypot(b.x - a.x, b.y - a.y);
      expect(distAfter).toBeGreaterThan(10);
    });

    it('does not move units that are already farther apart than SECURITY_COLLISION_RADIUS', () => {
      const a = createSecurityUnit(container, 0, 0, 'police');
      const b = createSecurityUnit(container, 500, 500, 'police');
      a.phase = 'wandering';
      b.phase = 'wandering';

      applySecurityCollisions([a, b]);

      expect(a.x).toBe(0);
      expect(a.y).toBe(0);
      expect(b.x).toBe(500);
      expect(b.y).toBe(500);
    });

    it('ignores units still in their entrance burst', () => {
      const a = createSecurityUnit(container, 100, 100, 'police'); // still 'entering'
      const b = createSecurityUnit(container, 105, 100, 'police'); // still 'entering'

      applySecurityCollisions([a, b]);

      expect(a.x).toBe(100);
      expect(b.x).toBe(105);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- securityCreature`
Expected: FAIL — none of the new exports exist yet, and `SecurityUnitState` has no `escortAngle`/`escortRadius`/`escortPhaseOffsetMs` fields.

- [ ] **Step 3: Implement escort + collision support in SecurityCreature.ts**

Add the three new fields to the `SecurityUnitState` interface:

```ts
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
```

becomes:

```ts
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
```

Add the new exported constants near `SECURITY_SHRINK_MS`:

```ts
/** Base radius (px) a security unit orbits the avatar at while escorting. */
export const SECURITY_ESCORT_RADIUS = 90;
/** How far each unit's own escortRadius is randomized from the base, in either direction. */
export const SECURITY_ESCORT_RADIUS_JITTER = 20;
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
```

Export `applyTransform` (it stays otherwise unchanged) by adding the `export` keyword:

```ts
function applyTransform(state: SecurityUnitState): void {
```

becomes:

```ts
export function applyTransform(state: SecurityUnitState): void {
```

Remove the now-unused `nextWaypoint` function entirely:

```ts
function nextWaypoint(state: SecurityUnitState, vw: number, vh: number): { x: number; y: number } {
  const margin = 40;
  const maxStep = 220;
  const nx = Math.max(margin, Math.min(vw - margin, state.x + rand(-maxStep, maxStep)));
  const ny = Math.max(margin, Math.min(vh - margin, state.y + rand(-maxStep, maxStep)));
  return { x: nx, y: ny };
}

```

Delete this whole function.

Replace `startSecurityWander` (it's now a one-shot entrance burst, not an endless wander — the ongoing "wander" is replaced entirely by escort-following + collision avoidance, driven by `RaidController.tick()` every frame instead of this module recursing into more waypoints):

```ts
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
```

becomes:

```ts
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
    Math.sin((nowMs + state.escortPhaseOffsetMs) / SECURITY_ESCORT_WOBBLE_PERIOD_MS) *
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
```

Finally, add the three new fields to the state object built in `createSecurityUnit` (they get overwritten by `assignEscortFormation` right after RaidController pushes the unit, but need valid initial values to satisfy the interface):

```ts
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
```

becomes:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- securityCreature`
Expected: PASS

---

Continued in [2026-08-16-raid-protest-v2-task-8b.md](2026-08-16-raid-protest-v2-task-8b.md) (RaidController wiring, tests, and manual verification).
