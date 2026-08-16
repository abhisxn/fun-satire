# Raid/Protest v2 Implementation Plan — Task 8

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues from [Task 7](2026-08-16-raid-protest-v2-task-7.md).

## Task 8: Security escorts the avatar

**Files:**
- Modify: `src/creatures/SecurityCreature.ts:41-53,79-148`
- Modify: `src/creatures/RaidController.ts:1-11,159-180,236-246,275-314`
- Test: `tests/unit/securityCreature.test.ts`
- Test: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Write the failing tests in securityCreature.test.ts**

Add `SECURITY_ESCORT_RADIUS`, `SECURITY_ESCORT_EASE`, `assignEscortAngles`, and `applyEscortStep` to the import from `'../../src/creatures/SecurityCreature'`:

```ts
import {
  SECURITY_WIDTH,
  SECURITY_Z_INDEX,
  SECURITY_ENTER_MS,
  SECURITY_SHRINK_MS,
  SECURITY_ESCORT_RADIUS,
  SECURITY_ESCORT_EASE,
  securityHeightFor,
  pickSecurityKind,
  createSecurityUnit,
  removeSecurityUnit,
  computeSecurityEnterProgress,
  computeSecurityShrinkFraction,
  burstWaypoint,
  assignEscortAngles,
  applyEscortStep,
} from '../../src/creatures/SecurityCreature';
```

Add a new `describe` block at the end of the file, before the final closing `});`:

```ts
  describe('assignEscortAngles', () => {
    it('spreads N units evenly across a full circle', () => {
      const units = [
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
        createSecurityUnit(container, 0, 0, 'police'),
      ];

      assignEscortAngles(units);

      expect(units[0]!.escortAngle).toBeCloseTo(0, 5);
      expect(units[1]!.escortAngle).toBeCloseTo(Math.PI / 2, 5);
      expect(units[2]!.escortAngle).toBeCloseTo(Math.PI, 5);
      expect(units[3]!.escortAngle).toBeCloseTo((3 * Math.PI) / 2, 5);
    });
  });

  describe('applyEscortStep', () => {
    it('eases the unit toward avatar position + its escort offset', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      unit.phase = 'wandering';
      unit.escortAngle = 0; // offset purely on +x

      applyEscortStep(unit, 200, 200, SECURITY_ESCORT_EASE);

      const targetX = 200 + SECURITY_ESCORT_RADIUS;
      const targetY = 200;
      expect(unit.x).toBeCloseTo((targetX - 0) * SECURITY_ESCORT_EASE, 5);
      expect(unit.y).toBeCloseTo((targetY - 0) * SECURITY_ESCORT_EASE, 5);
    });

    it('does nothing while the unit is still in its entrance burst', () => {
      const unit = createSecurityUnit(container, 10, 10, 'police');
      expect(unit.phase).toBe('entering');

      applyEscortStep(unit, 999, 999, SECURITY_ESCORT_EASE);

      expect(unit.x).toBe(10);
      expect(unit.y).toBe(10);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- securityCreature`
Expected: FAIL — `SECURITY_ESCORT_RADIUS`, `SECURITY_ESCORT_EASE`, `assignEscortAngles`, `applyEscortStep` not exported, and `SecurityUnitState` has no `escortAngle` field.

- [ ] **Step 3: Implement escort support in SecurityCreature.ts**

Add `escortAngle` to the `SecurityUnitState` interface:

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
  /** Fixed angle (radians) this unit holds around the avatar while escorting — assigned/
   * re-spread across the active roster by RaidController via assignEscortAngles(). */
  escortAngle: number;
}
```

Add two new exported constants near `SECURITY_SHRINK_MS`:

```ts
/** Radius (px) a security unit orbits the avatar at while escorting. */
export const SECURITY_ESCORT_RADIUS = 90;
/** Per-tick lerp factor easing a unit toward its escort target — small, so the formation
 * trails the avatar smoothly rather than snapping to it. */
export const SECURITY_ESCORT_EASE = 0.08;
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

Replace `startSecurityWander` (it's now a one-shot entrance burst, not an endless wander — the ongoing "wander" is replaced entirely by escort-following, driven by `RaidController.tick()` calling `applyEscortStep` every frame instead of this module recursing into more waypoints):

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
 * every frame via applyEscortStep() — this function doesn't recurse into further legs. */
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

/** Re-spreads escort angles evenly across the full active roster (not just new units), so
 * the formation stays evenly spaced around the avatar as units join/leave. */
export function assignEscortAngles(units: SecurityUnitState[]): void {
  const n = units.length;
  for (let i = 0; i < n; i++) {
    units[i]!.escortAngle = (i / n) * Math.PI * 2;
  }
}

/** Eases a unit toward avatar position + its fixed escort offset. Called every frame by
 * RaidController.tick() for as long as the unit exists. No-op during the entrance burst
 * (that leg is still animating via startSecurityEntranceBurst's own anime tween). */
export function applyEscortStep(
  state: SecurityUnitState,
  avatarX: number,
  avatarY: number,
  ease: number = SECURITY_ESCORT_EASE,
): void {
  if (state.phase === 'entering') return;
  const targetX = avatarX + Math.cos(state.escortAngle) * SECURITY_ESCORT_RADIUS;
  const targetY = avatarY + Math.sin(state.escortAngle) * SECURITY_ESCORT_RADIUS;
  state.x += (targetX - state.x) * ease;
  state.y += (targetY - state.y) * ease;
  applyTransform(state);
}
```

Finally, add `escortAngle: 0,` to the state object built in `createSecurityUnit` (it gets overwritten by `assignEscortAngles` right after RaidController pushes the unit, but needs a valid initial value to satisfy the interface):

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
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- securityCreature`
Expected: PASS

- [ ] **Step 5: Wire escort into RaidController**

In `src/creatures/RaidController.ts`, update the import:

```ts
import {
  createSecurityUnit,
  removeSecurityUnit,
  startSecurityWander,
  pickSecurityKind,
  computeSecurityShrinkFraction,
  SECURITY_SHRINK_MS,
} from "./SecurityCreature";
```

becomes:

```ts
import {
  createSecurityUnit,
  removeSecurityUnit,
  startSecurityEntranceBurst,
  pickSecurityKind,
  computeSecurityShrinkFraction,
  assignEscortAngles,
  applyEscortStep,
  SECURITY_SHRINK_MS,
} from "./SecurityCreature";
```

In `spawnPulse()`, replace the wander call and add angle re-assignment:

```ts
    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.avatarLayer, x, y, kinds[i]);
      startSecurityWander(unit, vw, vh, true);
      this.units.push(unit);
    }
  }
```

becomes:

```ts
    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.avatarLayer, x, y, kinds[i]);
      startSecurityEntranceBurst(unit, vw, vh);
      this.units.push(unit);
    }
    assignEscortAngles(this.units);
  }
```

In `releaseCharge()`, same rename plus angle re-assignment:

```ts
    const missing = this.chargeBaselineUnitCount - this.units.length;
    if (missing > 0) {
      const vw = this.container.clientWidth || window.innerWidth;
      const vh = this.container.clientHeight || window.innerHeight;
      const kinds = pickPulseKinds(missing);
      for (let i = 0; i < missing; i++) {
        const unit = createSecurityUnit(this.avatarLayer, this.lastAvatarX, this.lastAvatarY, kinds[i]);
        startSecurityWander(unit, vw, vh, true);
        this.units.push(unit);
      }
    }
```

becomes:

```ts
    const missing = this.chargeBaselineUnitCount - this.units.length;
    if (missing > 0) {
      const vw = this.container.clientWidth || window.innerWidth;
      const vh = this.container.clientHeight || window.innerHeight;
      const kinds = pickPulseKinds(missing);
      for (let i = 0; i < missing; i++) {
        const unit = createSecurityUnit(this.avatarLayer, this.lastAvatarX, this.lastAvatarY, kinds[i]);
        startSecurityEntranceBurst(unit, vw, vh);
        this.units.push(unit);
      }
      assignEscortAngles(this.units);
    }
```

In `tick(nowMs)`, add the per-frame escort step right after the shrink-sweep loop (before the attrition block added in Task 5):

```ts
  tick(nowMs: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]!;
      if (unit.phase === "shrinking" && nowMs - unit.phaseStartMs >= SECURITY_SHRINK_MS) {
        this.units.splice(i, 1);
        this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
        removeSecurityUnit(unit);
      }
    }

    if (this.state === "raiding" && nowMs - this.lastAttritionAtMs >= RAID_ATTRITION_INTERVAL_MS) {
```

becomes:

```ts
  tick(nowMs: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]!;
      if (unit.phase === "shrinking" && nowMs - unit.phaseStartMs >= SECURITY_SHRINK_MS) {
        this.units.splice(i, 1);
        this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
        removeSecurityUnit(unit);
      }
    }

    for (const unit of this.units) {
      applyEscortStep(unit, this.lastAvatarX, this.lastAvatarY);
    }

    if (this.state === "raiding" && nowMs - this.lastAttritionAtMs >= RAID_ATTRITION_INTERVAL_MS) {
```

- [ ] **Step 6: Write a failing test proving units move toward the avatar over ticks**

Add this test inside `describe('RaidController', ...)`, after the `'appends security units into avatarLayer...'` test added in Task 7:

```ts
  it('escorts security units toward the avatar\'s current position over successive ticks', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    // Force every unit past its entrance burst so applyEscortStep takes effect
    // (anime.js is mocked in this suite, so the real tween never fires).
    const units = (raid as unknown as { units: { phase: string; x: number; y: number }[] }).units;
    for (const unit of units) unit.phase = 'wandering';
    const startX = units[0]!.x;

    raid.onAvatarMove(1000, 0);
    for (let i = 0; i < 20; i++) {
      t += 16;
      raid.tick(t);
    }

    expect(Math.abs(units[0]!.x - startX)).toBeGreaterThan(0);
    expect(units[0]!.x).toBeGreaterThan(startX);

    now.mockRestore();
  });
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS

- [ ] **Step 8: Run the full suite and build**

Run: `npm test && npm run build`
Expected: Both succeed; no new failures beyond the known baseline.

- [ ] **Step 9: Commit**

```bash
git add src/creatures/SecurityCreature.ts src/creatures/RaidController.ts tests/unit/securityCreature.test.ts tests/unit/raidController.test.ts
git commit -m "feat: security escorts the avatar in formation instead of free-wandering"
```

- [ ] **Step 10: Manual verification (human testing)**

Run `npm run dev`, trigger a raid, and drag the avatar around. Confirm security units ring the avatar and follow it smoothly as it moves, rather than wandering independently around the screen.

---


---

Continued in [2026-08-16-raid-protest-v2-task-9.md](2026-08-16-raid-protest-v2-task-9.md).
