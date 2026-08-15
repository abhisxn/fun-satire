# Security Raid & Protest Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shaking the active avatar sticker spawns wandering police/RAF "security" sprites that repel and permanently thin the creature crowd; clicking a new "Protest" HUD button poofs security away and ramps the crowd back to max.

**Architecture:** Two new self-contained modules (`SecurityCreature.ts` for a single wandering sprite, `RaidController.ts` for the shake→spawn→catch→recovery state machine) plug into the existing `CreatureGrid`/`creaturePhysics` repulsion pipeline via one additive signature change (single `repulsor` → `repulsors[]`), plus one new `CreatureGrid.update()` param for catch/removal, one new HUD button, and a few wiring lines in `main.ts`.

**Tech Stack:** TypeScript, vitest (`@vitest-environment happy-dom`), anime.js (already a dependency, used the same way `BugSwarm.ts` uses it).

---

## Reference: constants this plan introduces

| Constant | Value | File |
|---|---|---|
| `SECURITY_WIDTH` | 55 (px) | `SecurityCreature.ts` |
| `SECURITY_MAX_UNITS` | 24 | `RaidController.ts` |
| `SECURITY_REPEL_RADIUS` | 160 (px) | `RaidController.ts` |
| `SECURITY_CATCH_RADIUS` | 50 (px) | `RaidController.ts` |
| `SPAWN_MIN_PER_PULSE` / `SPAWN_MAX_PER_PULSE` | 2 / 3 | `RaidController.ts` |
| `RAID_FLOOR_FRACTION` | 0.25 | `RaidController.ts` |
| `RECOVERY_POOF_INTERVAL_MS` | 350 | `RaidController.ts` |
| `SHAKE_WINDOW_MS` | 900 | `RaidController.ts` |
| `SHAKE_REVERSAL_THRESHOLD` | 4 | `RaidController.ts` |
| `SHAKE_MIN_SPEED_PX_MS` | 1.2 | `RaidController.ts` |
| `SHAKE_PULSE_COOLDOWN_MS` | 500 | `RaidController.ts` |
| `CATCH_CHECK_INTERVAL_MS` | 400 | `CreatureGrid.ts` |
| `CATCH_MAX_PER_UNIT_PER_TICK` | 3 | `CreatureGrid.ts` |

---

### Task 1: Add security sprite assets

**Files:**
- Create: `public/creatures/security/police.png` (already copied into this worktree at that path)
- Create: `public/creatures/security/raf.png` (already copied into this worktree at that path)

- [ ] **Step 1: Verify the assets are present**

Run: `ls -la "public/creatures/security"`
Expected: `police.png` (116432 bytes) and `raf.png` (103711 bytes) listed.

- [ ] **Step 2: Commit**

```bash
git add public/creatures/security/police.png public/creatures/security/raf.png
git commit -m "feat: add police and RAF security sprite assets"
```

---

### Task 2: `creaturePhysics.ts` — support multiple repulsors

**Files:**
- Modify: `src/creatures/creaturePhysics.ts`
- Test: `tests/unit/creaturePhysics.test.ts`

The grid currently supports exactly one extra repulsor (the onboarding-card repulsor). Security units need to add more repulsors alongside it, so `updateCreature` moves from a single optional `repulsor` to a `repulsors: Repulsor[]` array. This is a breaking signature change to an existing function — update it and its tests together.

- [ ] **Step 1: Update the two existing repulsor tests to use an array (this will fail against the current implementation)**

In `tests/unit/creaturePhysics.test.ts`, change these two `it` blocks:

```typescript
    it("repulsor with its own radius repels beyond the default repelRadius", () => {
      const repulsor = { x: 380, y: 100, radius: 300 };
      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS, [repulsor]);

      expect(creature.x).toBeLessThan(100);
    });

    it("repulsor without a radius uses the default repelRadius", () => {
      const repulsor = { x: 380, y: 100 };
      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS, [repulsor]);

      expect(creature.x).toBe(100);
    });
```

Also add a new test right after them:

```typescript
    it("applies repulsion from multiple repulsors in the same call", () => {
      const repulsorA = { x: 380, y: 100, radius: 300 };
      const repulsorB = { x: 100, y: 380, radius: 300 };
      const farAvatar: AvatarPos = { x: 1000, y: 1000 };

      updateCreature(creature, farAvatar, DEFAULT_PARAMS, [repulsorA, repulsorB]);

      // Pushed away from A (leftward, x decreases) AND away from B (upward, y decreases)
      expect(creature.x).toBeLessThan(100);
      expect(creature.y).toBeLessThan(100);
    });
```

- [ ] **Step 2: Run tests to verify the two modified tests fail**

Run: `npm test -- creaturePhysics -t "repulsor"`
Expected: FAIL — with the current `if (repulsor)` truthy-array check, `repulsor.radius`/`repulsor.x`/`repulsor.y` read `undefined` off the array, so the position assertions fail.

- [ ] **Step 3: Update the implementation**

In `src/creatures/creaturePhysics.ts`, replace the `updateCreature` function:

```typescript
export function updateCreature(
  creature: Creature,
  avatar: AvatarPos,
  params: PhysicsParams,
  repulsors: Repulsor[] = [],
): void {
  const { springStrength, damping } = params;

  applyRepulsion(creature, avatar, params);
  for (const repulsor of repulsors) {
    applyRepulsion(creature, repulsor, params, repulsor.radius);
  }

  // Spring to home
  creature.vx += (creature.hx - creature.x) * springStrength;
  creature.vy += (creature.hy - creature.y) * springStrength;

  // Damping
  creature.vx *= damping;
  creature.vy *= damping;

  // Position update (semi-implicit Euler)
  creature.x += creature.vx;
  creature.y += creature.vy;

  // Rotation: face AWAY from avatar
  const angle = Math.atan2(avatar.y - creature.y, avatar.x - creature.x) * (180 / Math.PI) + 180;

  // Update DOM transform
  creature.el.style.transform = `translate(${creature.x - creature.w * creature.scale * 0.5}px, ${creature.y - creature.h * creature.scale * 0.5}px) scale(${creature.scale}) rotate(${angle}deg)`;
}
```

(Only the signature and the `if (repulsor) ...` line change — the rest of the function body is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- creaturePhysics`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/creatures/creaturePhysics.ts tests/unit/creaturePhysics.test.ts
git commit -m "feat: support multiple simultaneous repulsors in creature physics"
```

---

### Task 3: `CreatureGrid.ts` — security repulsion + catch/removal

**Files:**
- Modify: `src/creatures/CreatureGrid.ts`
- Test: `tests/unit/creatureGrid.test.ts`

The onboarding repulsor (`this.repulsor`) now joins an array alongside any security units before being passed to `updateCreature`. A new throttled catch pass permanently removes creatures caught within a security unit's tight `catchRadius`, down to a floor, and reports each removal through a callback so `main.ts` can trigger a poof.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/creatureGrid.test.ts` (inside the top-level `describe('CreatureGrid', ...)`, as a new `describe` block — place it near the existing `describe('update', ...)`/physics-related tests):

```typescript
  describe('security units', () => {
    it('removes a creature caught within a security unit catchRadius and calls onCreatureTerminated', () => {
      const terminated: Array<{ x: number; y: number; w: number; h: number }> = [];
      const grid = new CreatureGrid({
        ...config,
        initialQuantity: 20,
        onCreatureTerminated: (x, y, w, h) => terminated.push({ x, y, w, h }),
      });
      grid.spawn('cockroach');
      const before = grid.getCreatureCount();

      // Security unit sitting exactly on top of wherever creature 0 spawned.
      const target = (grid as unknown as { creatures: { x: number; y: number }[] }).creatures[0]!;
      const securityUnits = [{ x: target.x, y: target.y, repelRadius: 160, catchRadius: 50 }];

      grid.update(-1000, -1000, securityUnits, 0);

      expect(grid.getCreatureCount()).toBeLessThan(before);
      expect(terminated.length).toBeGreaterThan(0);
    });

    it('does not remove creatures once targetCount is at or below raidFloor', () => {
      const grid = new CreatureGrid({ ...config, initialQuantity: 5 });
      grid.spawn('cockroach');

      const target = (grid as unknown as { creatures: { x: number; y: number }[] }).creatures[0]!;
      const securityUnits = [{ x: target.x, y: target.y, repelRadius: 160, catchRadius: 50 }];

      grid.update(-1000, -1000, securityUnits, 5);

      expect(grid.getCreatureCount()).toBe(5);
    });

    it('repels creatures away from a security unit like it does the avatar', () => {
      const grid = new CreatureGrid({ ...config, initialQuantity: 20 });
      grid.spawn('cockroach');

      const target = (grid as unknown as { creatures: { x: number; y: number; vx: number }[] }).creatures[0]!;
      const startVx = target.vx;
      const securityUnits = [{ x: target.x - 50, y: target.y, repelRadius: 160, catchRadius: 1 }];

      // Avatar far away so only the security unit's repulsion is in play.
      grid.update(-5000, -5000, securityUnits, 20);

      expect(target.vx).not.toBe(startVx);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- creatureGrid -t "security units"`
Expected: FAIL — `grid.update` doesn't accept a third/fourth argument yet, and `CreatureGridConfig` doesn't accept `onCreatureTerminated` (TypeScript compile error surfaces as a test failure under vitest's esbuild transform, or the extra args are silently ignored and the assertions fail because no catch logic exists).

- [ ] **Step 3: Implement the changes**

In `src/creatures/CreatureGrid.ts`:

Add a new exported interface and two new constants near the top, after the existing exported constants (after `HOVER_SCALE_BUMP`'s block, before `easeOutBack`):

```typescript
/** How often the catch-radius check runs against security units (ms). */
export const CATCH_CHECK_INTERVAL_MS = 400;
/** Max creatures a single security unit can catch per check interval. */
export const CATCH_MAX_PER_UNIT_PER_TICK = 3;

/** A wandering security sprite's current position and its two effect radii. */
export interface SecurityUnit {
  x: number;
  y: number;
  repelRadius: number;
  catchRadius: number;
}
```

Add `onCreatureTerminated` to `CreatureGridConfig`:

```typescript
export interface CreatureGridConfig {
  container: HTMLElement;
  mode: CreatureMode;
  initialQuantity?: number;
  onCreatureTerminated?: (x: number, y: number, w: number, h: number) => void;
}
```

Add a private field and store the callback in the constructor. Change:

```typescript
  private lastFadePickMs: number = 0;
```
to:
```typescript
  private lastFadePickMs: number = 0;
  private lastCatchPickMs: number = 0;
```

And change the constructor body:
```typescript
  constructor(config: CreatureGridConfig) {
    this.container = config.container;
    this.mode = config.mode;
    const modeConfig = MODE_CONFIGS[this.mode];
    this.targetCount = config.initialQuantity ?? modeConfig.cols * modeConfig.rows;
  }
```
to:
```typescript
  constructor(config: CreatureGridConfig) {
    this.container = config.container;
    this.mode = config.mode;
    const modeConfig = MODE_CONFIGS[this.mode];
    this.targetCount = config.initialQuantity ?? modeConfig.cols * modeConfig.rows;
    this.onCreatureTerminated = config.onCreatureTerminated ?? null;
  }
```

Add the field itself next to `private repulsor: Repulsor | null = null;`:
```typescript
  private repulsor: Repulsor | null = null;
  private onCreatureTerminated: ((x: number, y: number, w: number, h: number) => void) | null = null;
```

Change the `update` method signature (currently `update(avatarX: number, avatarY: number): void {`) to:
```typescript
  update(avatarX: number, avatarY: number, securityUnits: SecurityUnit[] = [], raidFloor: number = QTY_MIN): void {
```

Inside `update`, replace the physics loop:
```typescript
    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams, this.repulsor);
    }
```
with:
```typescript
    const repulsors: Repulsor[] = this.repulsor ? [this.repulsor] : [];
    for (const unit of securityUnits) {
      repulsors.push({ x: unit.x, y: unit.y, radius: unit.repelRadius });
    }
    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams, repulsors);
    }
```

Add the catch pass at the very end of `update`, right before its closing `}` (after the existing "Demand-driven respawn" block):
```typescript
    // Security catch: throttled pass that permanently removes creatures
    // caught within a security unit's tight catchRadius, down to raidFloor.
    // Kept separate from the fade/respawn cycle above — a catch is a
    // permanent removal, not a temporary despawn that repop can undo.
    if (securityUnits.length > 0 && now - this.lastCatchPickMs >= CATCH_CHECK_INTERVAL_MS) {
      this.lastCatchPickMs = now;
      for (const unit of securityUnits) {
        if (this.targetCount <= raidFloor) break;
        let caughtThisUnit = 0;
        for (let i = this.creatures.length - 1; i >= 0 && caughtThisUnit < CATCH_MAX_PER_UNIT_PER_TICK; i--) {
          if (this.targetCount <= raidFloor) break;
          const c = this.creatures[i]!;
          const dx = c.x - unit.x;
          const dy = c.y - unit.y;
          if (Math.sqrt(dx * dx + dy * dy) >= unit.catchRadius) continue;

          this.creatures.splice(i, 1);
          const eyeIdx = this.eyeCreatures.indexOf(c as EyeCreature);
          if (eyeIdx >= 0) this.eyeCreatures.splice(eyeIdx, 1);
          this.onCreatureTerminated?.(c.x, c.y, c.w * c.scale, c.h * c.scale);
          c.el.remove();
          this.targetCount--;
          caughtThisUnit++;
        }
      }
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- creatureGrid`
Expected: PASS, all tests in the file green (including the pre-existing ones — the array-repulsor change must not regress the onboarding-repulsor tests).

- [ ] **Step 5: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGrid.test.ts
git commit -m "feat: security units repel and permanently catch stragglers in CreatureGrid"
```

---

### Task 4: `SecurityCreature.ts` — wandering security sprite

**Files:**
- Create: `src/creatures/SecurityCreature.ts`
- Test: `tests/unit/securityCreature.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/securityCreature.test.ts`:

```typescript
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('animejs', () => {
  const makeInstance = () => ({ pause: vi.fn() });
  return {
    default: (_opts: Record<string, unknown>) => makeInstance(),
  };
});

import {
  SECURITY_WIDTH,
  securityHeightFor,
  pickSecurityKind,
  createSecurityUnit,
  removeSecurityUnit,
} from '../../src/creatures/SecurityCreature';

describe('SecurityCreature', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('pickSecurityKind', () => {
    it('returns "police" when rand() is below 0.5', () => {
      expect(pickSecurityKind(() => 0.1)).toBe('police');
    });

    it('returns "raf" when rand() is at or above 0.5', () => {
      expect(pickSecurityKind(() => 0.9)).toBe('raf');
    });
  });

  describe('securityHeightFor', () => {
    it('scales police height proportionally from its native aspect ratio', () => {
      expect(securityHeightFor('police')).toBe(45);
    });

    it('scales raf height proportionally from its native aspect ratio', () => {
      expect(securityHeightFor('raf')).toBe(49);
    });
  });

  describe('createSecurityUnit', () => {
    it('appends an <img> sized to SECURITY_WIDTH at the given position', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');

      expect(container.children.length).toBe(1);
      expect(unit.el.tagName).toBe('IMG');
      expect(unit.el.src).toContain('/creatures/security/police.png');
      expect(unit.w).toBe(SECURITY_WIDTH);
      expect(unit.x).toBe(100);
      expect(unit.y).toBe(200);
      expect(unit.el.style.transform).toContain('translate3d(');
    });

    it('picks a random kind when none is given', () => {
      const unit = createSecurityUnit(container, 0, 0);
      expect(['police', 'raf']).toContain(unit.kind);
    });
  });

  describe('removeSecurityUnit', () => {
    it('removes the element from the DOM and pauses any running animation', () => {
      const unit = createSecurityUnit(container, 0, 0, 'raf');
      const pauseSpy = vi.fn();
      unit.posAnim = { pause: pauseSpy } as unknown as ReturnType<typeof vi.fn> extends never ? never : { pause: () => void };

      removeSecurityUnit(unit);

      expect(container.children.length).toBe(0);
      expect(pauseSpy).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- securityCreature`
Expected: FAIL with "Cannot find module '../../src/creatures/SecurityCreature'".

- [ ] **Step 3: Implement `src/creatures/SecurityCreature.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- securityCreature`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/creatures/SecurityCreature.ts tests/unit/securityCreature.test.ts
git commit -m "feat: add wandering security sprite (police/raf)"
```

---

### Task 5: `RaidController.ts` — shake detector (pure function)

**Files:**
- Create: `src/creatures/RaidController.ts`
- Test: `tests/unit/raidController.test.ts`

Build the shake-reversal detector first, in isolation, since it's the trickiest piece of logic and is fully pure (no DOM, no timers).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/raidController.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectShake } from '../../src/creatures/RaidController';
import type { MoveSample } from '../../src/creatures/RaidController';

function sample(x: number, y: number, t: number): MoveSample {
  return { x, y, t };
}

describe('detectShake', () => {
  it('returns false for fewer than 3 samples', () => {
    expect(detectShake([sample(0, 0, 0), sample(10, 0, 10)])).toBe(false);
  });

  it('returns false for a smooth fast drag in one direction (no reversals)', () => {
    const samples: MoveSample[] = [];
    for (let i = 0; i < 10; i++) {
      samples.push(sample(i * 20, 0, i * 10));
    }
    expect(detectShake(samples)).toBe(false);
  });

  it('returns false for slow back-and-forth movement (below the speed floor)', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(2, 0, 100),
      sample(0, 0, 200),
      sample(2, 0, 300),
      sample(0, 0, 400),
      sample(2, 0, 500),
    ];
    expect(detectShake(samples)).toBe(false);
  });

  it('returns true for fast rapid direction reversals within the window', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
      sample(60, 0, 100),
      sample(0, 0, 120),
    ];
    expect(detectShake(samples)).toBe(true);
  });

  it('ignores samples outside the shake window', () => {
    const old: MoveSample[] = [
      sample(0, 0, -5000),
      sample(60, 0, -4980),
      sample(0, 0, -4960),
      sample(60, 0, -4940),
      sample(0, 0, -4920),
    ];
    const recent: MoveSample[] = [sample(500, 500, 0), sample(520, 500, 50)];
    expect(detectShake([...old, ...recent])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- raidController`
Expected: FAIL with "Cannot find module '../../src/creatures/RaidController'".

- [ ] **Step 3: Implement the shake detector**

Create `src/creatures/RaidController.ts` and start it with:

```typescript
export interface MoveSample {
  x: number;
  y: number;
  t: number;
}

/** Sliding window over which reversals are counted (ms). */
export const SHAKE_WINDOW_MS = 900;
/** Direction reversals required within the window to count as a shake. */
export const SHAKE_REVERSAL_THRESHOLD = 4;
/** Below this speed (px/ms) a movement doesn't count toward a reversal. */
export const SHAKE_MIN_SPEED_PX_MS = 1.2;
/** Minimum gap between shake pulses, so one shake reads as a wave, not a machine-gun spawn. */
export const SHAKE_PULSE_COOLDOWN_MS = 500;

/**
 * Pure: given a chronological buffer of recent move samples, counts fast
 * direction reversals (sign flips in x or y movement between consecutive
 * fast-enough samples) within the trailing SHAKE_WINDOW_MS. A smooth fast
 * drag in one direction never reversal-counts; only whipping back and
 * forth does.
 */
export function detectShake(samples: MoveSample[]): boolean {
  if (samples.length < 3) return false;
  const last = samples[samples.length - 1]!;
  const windowStart = last.t - SHAKE_WINDOW_MS;
  const windowed = samples.filter((s) => s.t >= windowStart);
  if (windowed.length < 3) return false;

  let reversals = 0;
  let prevDx = 0;
  let prevDy = 0;
  let havePrev = false;

  for (let i = 1; i < windowed.length; i++) {
    const a = windowed[i - 1]!;
    const b = windowed[i]!;
    const dt = Math.max(1, b.t - a.t);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const speed = Math.hypot(dx, dy) / dt;

    if (speed < SHAKE_MIN_SPEED_PX_MS) {
      havePrev = false;
      continue;
    }

    if (havePrev) {
      const reversedX = prevDx !== 0 && dx !== 0 && Math.sign(dx) !== Math.sign(prevDx);
      const reversedY = prevDy !== 0 && dy !== 0 && Math.sign(dy) !== Math.sign(prevDy);
      if (reversedX || reversedY) reversals++;
    }

    prevDx = dx;
    prevDy = dy;
    havePrev = true;
  }

  return reversals >= SHAKE_REVERSAL_THRESHOLD;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS (all 5 `detectShake` tests).

- [ ] **Step 5: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "feat: add shake-reversal detector for raid triggering"
```

---

### Task 6: `RaidController.ts` — state machine (spawn, catch floor, recovery)

**Files:**
- Modify: `src/creatures/RaidController.ts`
- Modify: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/raidController.test.ts` (mock `animejs` the same way `securityCreature.test.ts` does, since `RaidController` creates `SecurityCreature` units under the hood):

```typescript
// (add near the top of the file, after the existing imports)
import { describe as describeBlock, beforeEach as beforeEachHook, afterEach, vi as viMock } from 'vitest';
```

That import line is unnecessary — `vi`, `beforeEach`, `afterEach` are already available from the top-level `import { describe, it, expect } from 'vitest';`. Update that top import instead to:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

Add the `animejs` mock right after the imports, before the first `describe`:

```typescript
vi.mock('animejs', () => {
  const makeInstance = () => ({ pause: vi.fn() });
  return {
    default: (_opts: Record<string, unknown>) => makeInstance(),
  };
});
```

Then add a second top-level `describe`:

```typescript
describe('RaidController', () => {
  let container: HTMLElement;
  let grid: CreatureGrid;
  let raid: RaidController;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);

    grid = new CreatureGrid({ container, mode: 'cockroach', initialQuantity: 40 });
    grid.spawn('cockroach');

    raid = new RaidController({ container, grid });
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
  });

  function shakeInto(controller: RaidController, startT: number): number {
    let t = startT;
    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      controller.onAvatarMove(x, 0);
      t += 20;
    }
    return t;
  }

  it('starts idle with no security units', () => {
    expect(raid.getState()).toBe('idle');
    expect(raid.getSecurityUnits()).toEqual([]);
  });

  it('transitions to raiding and spawns 2-3 units on a detected shake', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    expect(raid.getState()).toBe('raiding');
    expect(raid.getSecurityUnits().length).toBeGreaterThanOrEqual(2);
    expect(raid.getSecurityUnits().length).toBeLessThanOrEqual(3);
    expect(container.querySelectorAll('img').length).toBe(raid.getSecurityUnits().length);

    now.mockRestore();
  });

  it('never exceeds SECURITY_MAX_UNITS even with repeated shakes', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    for (let pulse = 0; pulse < 15; pulse++) {
      const xs = [0, 60, 0, 60, 0, 60, 0];
      for (const x of xs) {
        raid.onAvatarMove(x, 0);
        t += 20;
      }
      t += 600; // clear the pulse cooldown
    }

    expect(raid.getSecurityUnits().length).toBeLessThanOrEqual(24);
    now.mockRestore();
  });

  it('startRecovery poofs units out one by one and ramps the crowd to QTY_MAX', () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;
    expect(spawned).toBeGreaterThan(0);

    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');
    expect(raid.getSecurityUnits().length).toBe(spawned - 1);

    vi.advanceTimersByTime(350 * spawned);

    expect(raid.getSecurityUnits().length).toBe(0);
    expect(raid.getState()).toBe('idle');
    expect(grid.getCreatureCount()).toBe(900); // QTY_MAX

    now.mockRestore();
  });

  it('getRaidFloor is QTY_MIN while idle and rises with the crowd size once raiding', () => {
    expect(raid.getRaidFloor()).toBe(10); // QTY_MIN

    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);
    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    now.mockRestore();

    // raidStartCount was 40 (initialQuantity), floor = round(40 * 0.25) = 10
    expect(raid.getRaidFloor()).toBe(10);
  });
});
```

Add the two new imports this block needs at the top of the file:

```typescript
import { CreatureGrid } from '../../src/creatures/CreatureGrid';
import { RaidController } from '../../src/creatures/RaidController';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- raidController -t "RaidController"`
Expected: FAIL — `RaidController` class doesn't exist yet (only `detectShake` does).

- [ ] **Step 3: Implement the state machine**

Append to `src/creatures/RaidController.ts` (after the `detectShake` function from Task 5):

```typescript
import { CreatureGrid } from "./CreatureGrid";
import type { SecurityUnit } from "./CreatureGrid";
import { createSecurityUnit, removeSecurityUnit, startSecurityWander } from "./SecurityCreature";
import type { SecurityUnitState } from "./SecurityCreature";
import { QTY_MAX, QTY_MIN } from "../config/tokens";

/** Hard cap on simultaneous security units, regardless of how long shaking continues. */
export const SECURITY_MAX_UNITS = 24;
/** Repulsion radius each security unit exerts on the crowd, same model as the avatar's. */
export const SECURITY_REPEL_RADIUS = 160;
/** Tight radius within which a security unit catches (permanently removes) a creature. */
export const SECURITY_CATCH_RADIUS = 50;
export const SPAWN_MIN_PER_PULSE = 2;
export const SPAWN_MAX_PER_PULSE = 3;
/** Crowd never drops below this fraction of its size when the raid started. */
export const RAID_FLOOR_FRACTION = 0.25;
/** Stagger between each security unit poofing away during recovery (ms). */
export const RECOVERY_POOF_INTERVAL_MS = 350;

export type RaidState = "idle" | "raiding" | "recovering";

export interface RaidControllerConfig {
  container: HTMLElement;
  grid: CreatureGrid;
  onSecurityRemoved?: (x: number, y: number, w: number, h: number) => void;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class RaidController {
  private readonly container: HTMLElement;
  private readonly grid: CreatureGrid;
  private readonly onSecurityRemoved: ((x: number, y: number, w: number, h: number) => void) | null;

  private state: RaidState = "idle";
  private units: SecurityUnitState[] = [];
  private moveBuffer: MoveSample[] = [];
  private lastPulseAtMs = -Infinity;
  private raidStartCount = 0;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: RaidControllerConfig) {
    this.container = config.container;
    this.grid = config.grid;
    this.onSecurityRemoved = config.onSecurityRemoved ?? null;
  }

  /** Feed every avatar drag-move point through here; internally detects shake and spawns raids. */
  onAvatarMove(x: number, y: number): void {
    if (this.state === "recovering") return;

    const now = Date.now();
    this.moveBuffer.push({ x, y, t: now });
    const cutoff = now - SHAKE_WINDOW_MS;
    this.moveBuffer = this.moveBuffer.filter((s) => s.t >= cutoff);

    if (now - this.lastPulseAtMs < SHAKE_PULSE_COOLDOWN_MS) return;
    if (!detectShake(this.moveBuffer)) return;

    this.lastPulseAtMs = now;
    this.spawnPulse(x, y);
  }

  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
    }

    const available = SECURITY_MAX_UNITS - this.units.length;
    if (available <= 0) return;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const desired = Math.round(rand(SPAWN_MIN_PER_PULSE, SPAWN_MAX_PER_PULSE));
    const n = Math.min(desired, available);

    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.container, x, y);
      startSecurityWander(unit, vw, vh);
      this.units.push(unit);
    }
  }

  /** Current security units, in the shape CreatureGrid.update() expects for repulsion/catching. */
  getSecurityUnits(): SecurityUnit[] {
    return this.units.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius: SECURITY_REPEL_RADIUS,
      catchRadius: SECURITY_CATCH_RADIUS,
    }));
  }

  /** Floor CreatureGrid.update() should respect when catching creatures right now. */
  getRaidFloor(): number {
    if (this.state === "idle") return QTY_MIN;
    return Math.max(QTY_MIN, Math.round(this.raidStartCount * RAID_FLOOR_FRACTION));
  }

  getState(): RaidState {
    return this.state;
  }

  /** Wired to the Protest button: ends the raid, poofing security away and rebuilding the crowd. */
  startRecovery(): void {
    this.grid.setQuantity(QTY_MAX);

    if (this.units.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    this.popNextUnit();
  }

  private popNextUnit(): void {
    const unit = this.units.shift();
    if (unit) {
      this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
      removeSecurityUnit(unit);
    }

    if (this.units.length === 0) {
      this.state = "idle";
      this.recoveryTimer = null;
      return;
    }

    this.recoveryTimer = setTimeout(() => this.popNextUnit(), RECOVERY_POOF_INTERVAL_MS);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "feat: add raid state machine (shake-triggered spawn, catch floor, protest recovery)"
```

---

### Task 7: `Hud.ts` — restore the Protest button

**Files:**
- Modify: `src/hud/Hud.ts`
- Modify: `src/hud/hud.css`
- Test: `tests/unit/hud.test.ts`

A "Protest" pill button (class `hud-attack`, gradient CTA styling, text "Protest") previously existed in the HUD, driving an old press-and-hold "attack"/burn mechanic. It was deleted in commit `2e918ef` ("drop dead Protest button") because that mechanic was ripped out and the button was left wired to nothing. Restore its visual design — it's identical in style to the still-live `.menu-share-btn` gradient CTA in `menuPanel.css`, so it's not a stale look — but wire it as a plain click (not press/hold, since starting recovery is a one-shot action, not a continuous one) via a `getProtestButton()` getter, matching how `getSettingsButton()`/`getGalleryButton()` are wired externally in `main.ts`. The restored button also gets an `aria-label` of "Protest" (not the original "Attack") so it matches its own visible text.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/hud.test.ts`, inside `describe("DOM structure", ...)`, right after the existing `it("creates utility buttons", ...)` block:

```typescript
    it("creates a protest button", () => {
      const protestBtn = host.querySelector(".hud-attack");
      expect(protestBtn).toBeTruthy();
      expect(protestBtn?.getAttribute("aria-label")).toBe("Protest");
      expect(protestBtn?.querySelector("span")?.textContent).toBe("Protest");
    });
```

Add this `describe` block at the end of the file, before the final closing `});`:

```typescript
  describe("getProtestButton", () => {
    it("returns the protest button element", () => {
      expect(hud.getProtestButton()).toBe(host.querySelector(".hud-attack"));
    });
  });

  describe("protest button", () => {
    it("plays the HUD select tone on click", () => {
      const audioContext = {} as AudioContext;
      hud.setAudioContext(audioContext);
      const btn = host.querySelector<HTMLButtonElement>(".hud-attack");
      expect(() => btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }))).not.toThrow();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- hud.test -t "protest"`
Expected: FAIL — no `.hud-attack` element exists, `getProtestButton` doesn't exist.

- [ ] **Step 3: Implement the button**

In `src/hud/Hud.ts`, add a field next to `private galleryBtn: HTMLButtonElement | null = null;`:

```typescript
  private galleryBtn: HTMLButtonElement | null = null;
  private protestBtn: HTMLButtonElement | null = null;
```

In the constructor, right after `this.galleryBtn = this.buildUtilityBtn(...)` and its `root.appendChild(this.galleryBtn);` line, add:

```typescript
    this.protestBtn = this.buildProtestBtn();
    root.appendChild(this.protestBtn);
```

Add a getter next to `getGalleryButton()`:

```typescript
  getProtestButton(): HTMLElement {
    if (!this.protestBtn) throw new Error("Protest button not initialized");
    return this.protestBtn;
  }
```

Add a new private builder method next to `buildUtilityBtn()`:

```typescript
  private buildProtestBtn(): HTMLButtonElement {
    const btn = el("button", "hud-attack");
    btn.type = "button";
    btn.setAttribute("aria-label", "Protest");

    const span = el("span");
    span.textContent = "Protest";
    btn.appendChild(span);

    btn.addEventListener("click", () => {
      if (this.audioContext) playHudSelectTone(this.audioContext);
    });

    return btn;
  }
```

- [ ] **Step 4: Restore the button's CSS**

In `src/hud/hud.css`, add this block right after the "Utility Buttons — Filter, Gallery" section (after the closing `}` of the `.hud-btn--gallery, .hud-btn--settings { ... }` rule, before the "Tooltips" section comment):

```css
/* ============================================
   Protest Button — Gradient CTA
   (same gradient/shadow language as .menu-share-btn in menuPanel.css)
   ============================================ */
.hud-attack {
  position: relative;
  height: var(--hud-btn-size);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #de7666 0%, #e9975d 100%);
  border: 1px solid #a74333;
  border-radius: 12px;
  box-shadow: 0px 4px 0px #b75040;
  color: white;
  font-family: "Bungee", cursive;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.15s var(--hud-ease-smooth), box-shadow 0.15s var(--hud-ease-smooth);
  outline: none;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
  animation: hud-btn-pop 0.6s var(--hud-ease-spring) forwards;
  opacity: 0;
  animation-delay: 0.45s;
}

.hud-attack:hover {
  transform: translateY(-2px);
  box-shadow: 0px 6px 0px #b75040, 0px 8px 20px rgba(183, 80, 64, 0.4);
}

.hud-attack:active {
  transform: translateY(2px);
  box-shadow: 0px 2px 0px #b75040;
}

.hud-attack:focus-visible {
  box-shadow: 0px 4px 0px #b75040, 0 0 0 3px rgba(222, 118, 102, 0.4);
}

.hud-attack span {
  position: relative;
  z-index: 1;
}
```

Then update the two existing `.hud--dragging` rules so the pill button freezes correctly mid-HUD-drag, same as every other button. Change:

```css
.premium-hud.hud--dragging .hud-btn,
.premium-hud.hud--dragging .hud-divider {
  animation: none;
  opacity: 1;
}

.premium-hud.hud--dragging .hud-btn:hover,
.premium-hud.hud--dragging .hud-btn:active {
  transform: none;
  transition: none;
}
```

to:

```css
.premium-hud.hud--dragging .hud-btn,
.premium-hud.hud--dragging .hud-attack,
.premium-hud.hud--dragging .hud-divider {
  animation: none;
  opacity: 1;
}

.premium-hud.hud--dragging .hud-btn:hover,
.premium-hud.hud--dragging .hud-btn:active,
.premium-hud.hud--dragging .hud-attack:hover,
.premium-hud.hud--dragging .hud-attack:active {
  transform: none;
  transition: none;
}
```

Finally, extend the reduced-motion block. Change:

```css
@media (prefers-reduced-motion: reduce) {
  .premium-hud,
  .hud-drag-handle,
  .hud-btn {
    animation: none;
    opacity: 1;
  }

  .premium-hud:hover,
  .hud-btn:hover,
  .hud-btn:active {
    transition: none;
  }
```

to:

```css
@media (prefers-reduced-motion: reduce) {
  .premium-hud,
  .hud-drag-handle,
  .hud-btn,
  .hud-attack {
    animation: none;
    opacity: 1;
  }

  .premium-hud:hover,
  .hud-btn:hover,
  .hud-btn:active,
  .hud-attack:hover,
  .hud-attack:active {
    transition: none;
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- hud.test`
Expected: PASS, all tests in the file green.

- [ ] **Step 6: Commit**

```bash
git add src/hud/Hud.ts src/hud/hud.css tests/unit/hud.test.ts
git commit -m "feat: restore Protest button, repurposed to trigger raid recovery"
```

---

### Task 8: Wire it all together in `main.ts`

**Files:**
- Modify: `src/main.ts`

No new automated test for this task — it's glue code between already-tested units. Verified manually in Task 9.

- [ ] **Step 1: Import the new modules**

At the top of `src/main.ts`, add alongside the other `creatures` imports:

```typescript
import { RaidController } from "./creatures/RaidController";
```

- [ ] **Step 2: Create the `RaidController` after `grid` is initialized**

In `main()`, right after this existing block:

```typescript
  const grid = new CreatureGrid({
    container,
    mode: "cockroach",
    initialQuantity: ONBOARDING_CREATURE_QUANTITY,
  });
  await grid.init();
  grid.setRepulsor(vw / 2, vh / 2, ONBOARDING_CARD_REPULSOR_RADIUS);
```

add:

```typescript
  const raidController = new RaidController({
    container,
    grid,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
  });
```

This references `audioManager`, which today is declared further down in `main()` (in the "Sound bed" block). Move the "Sound bed" block up so it runs before this point: cut this whole block —

```typescript
  // --- Sound bed (isolated init: owns its own AudioManager + widget. No
  // other init block touches this one.) ---
  const audioManager = new AudioManager({ volume: 0.16 });
  const audioWidget = new AudioWidget(audioManager);
  audioWidget.attachTo(document.body);
  void audioWidget.attemptAutoplay();
  // Task 6's hover tones fire through the grid using this same shared
  // AudioContext, so eyes/finger/cockroach/placard hovers share one voice.
  grid.setAudioContext(audioManager.getAudioContext());
```

— and paste it immediately after the `grid.setRepulsor(...)` line and before the new `raidController` block above, so the order becomes: create `grid` → `grid.init()` → `grid.setRepulsor(...)` → Sound bed block → `raidController` creation → rest of `main()` unchanged.

- [ ] **Step 3: Pass `onCreatureTerminated` into the grid's config**

This requires the poof callback to exist before `grid`'s config is built, but `grid` is constructed before `audioManager`. Resolve this the same way `poofElement` already resolves the analogous ordering problem elsewhere in the file: define a small local helper above the `grid` construction that reads `audioManager` lazily via a `let` binding declared before `grid`.

Add this declaration right before the `const grid = new CreatureGrid({...})` block:

```typescript
  let audioManagerRef: AudioManager | null = null;
```

Change the `CreatureGrid` construction to:

```typescript
  const grid = new CreatureGrid({
    container,
    mode: "cockroach",
    initialQuantity: ONBOARDING_CREATURE_QUANTITY,
    onCreatureTerminated: (x, y, w, h) => {
      const audioContext = audioManagerRef?.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
  });
```

Then, in the (now-relocated) Sound bed block, set the ref right after `audioManager` is created:

```typescript
  const audioManager = new AudioManager({ volume: 0.16 });
  audioManagerRef = audioManager;
  const audioWidget = new AudioWidget(audioManager);
```

- [ ] **Step 4: Feed avatar drag-move events into the raid controller — stickers only, not text**

This feature is sticker-only: shaking the "type your own" `TextOverlay` must NOT trigger a raid. `onOverlayDragMove` is the one shared callback passed to both `StickerOverlay` (in `galleryPanel.onStickerSelect`) and `TextOverlay` (in `galleryPanel.onTextSelect`), so gate on `activeOverlay`'s runtime type.

Find the existing `onOverlayDragMove` definition:

```typescript
  const onOverlayDragMove = (): void => {
    dragScratchSound.onMove();
  };
```

Replace it with:

```typescript
  const onOverlayDragMove = (x: number, y: number): void => {
    dragScratchSound.onMove();
    if (activeOverlay instanceof StickerOverlay) {
      raidController.onAvatarMove(x, y);
    }
  };
```

`StickerOverlay` is already imported at the top of `main.ts`. `activeOverlay` is already declared above this point in `main()` (`let activeOverlay: StickerOverlay | TextOverlay | null = null;`), and is kept in sync with whichever overlay is currently being dragged, so this check is always accurate at drag-move time.

- [ ] **Step 5: Pass security units into the grid's per-frame update**

Find the engine tick:

```typescript
  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();
```

Replace the tick body with:

```typescript
  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    grid.update(center.x, center.y, raidController.getSecurityUnits(), raidController.getRaidFloor());
  });
  engine.start();
```

- [ ] **Step 6: Wire the Protest button**

Inside `mountPostOnboarding()`, find where the other HUD buttons get their click handlers (e.g. `hud.getSettingsButton().addEventListener(...)` and `hud.getGalleryButton().addEventListener(...)`), and add right after them:

```typescript
    hud.getProtestButton().addEventListener("click", () => {
      raidController.startRecovery();
    });
```

- [ ] **Step 7: Typecheck and run the full test suite**

Run: `npm run build`
Expected: typecheck + build succeed with no errors.

Run: `npm test`
Expected: PASS for every test file this plan touched or added (`creaturePhysics`, `creatureGrid`, `securityCreature`, `raidController`, `hud`). The 6 pre-existing failing test files from `onboardingCarousel.test.ts` and friends (17 failing tests, confirmed pre-existing on `main` before this branch started) are expected to remain failing — unrelated to this feature.

- [ ] **Step 8: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire raid controller (shake-to-raid, protest-to-recover) into main"
```

---

### Task 9: Manual browser verification

Per this project's CLAUDE.md: any task touching `physics/`, `creatures/`, or `hud/` must be verified in a running browser before being called done — unit tests don't catch feel/visual regressions.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Complete onboarding, then verify the raid**

Open the app, get through onboarding to the main scene. Grab the avatar sticker and whip it back and forth rapidly (several fast direction reversals within under a second). Confirm:
- 2-3 small police/RAF sprites (visibly smaller than the avatar) pop in near the avatar and start wandering independently.
- Nearby crowd creatures flee the security sprites the same way they flee the avatar.
- Creatures that get cornered by a security sprite disappear (caught) and the total on-screen crowd visibly thins over continued shaking.
- Continuing to shake past a dozen or so security sprites doesn't keep piling more on indefinitely (cap holds), and the crowd never fully empties (floor holds).

- [ ] **Step 3: Verify text overlay is exempt**

Switch to "type your own" text mode (gallery panel's text tab) and shake the text overlay the same way. Confirm no security sprites spawn — this feature is sticker-only.

- [ ] **Step 4: Verify Protest recovery**

Click the restored "Protest" gradient pill button in the HUD (after the gallery button). Confirm:
- Security sprites poof away one at a time, at a visible stagger, not all at once.
- The crowd count visibly climbs back up over the following seconds toward its maximum.
- Shaking the avatar again afterward starts a fresh raid cleanly (state returned to idle correctly).

- [ ] **Step 5: Report results**

If anything doesn't match, note what's off (e.g. "reversals threshold feels too twitchy — false-triggers on a normal fast drag" or "catch radius feels too generous — creatures vanish too easily") so the relevant constant in `RaidController.ts` can be tuned.

---

## Self-Review Notes

- **Spec coverage:** shake-drag reuse (Task 6/8), 2-3 units per pulse (Task 6), random police/raf mix (Task 4), grid disperse+repel via security (Task 3/6), permanent termination (Task 3), Protest button (Task 7), gradual security poof-out + crowd rise to max (Task 6/8), fixed small security size (Task 4) — all covered.
- **Task 7 deviates from the design spec's original "new small circular utility button" sketch** — mid-planning, the user pointed out a styled "Protest" button already existed in git history (removed in `2e918ef` as dead code) and asked to restore it instead of inventing a new one. Task 7 was rewritten to restore that gradient pill button (`hud-attack` class), repurposed from its original press/hold "attack" wiring to a plain click that triggers `raidController.startRecovery()` — the rest of the plan (Task 8's wiring) already assumed a `getProtestButton()` + click-listener shape, so no other task needed to change.
- **Type consistency checked:** `SecurityUnit` (position + radii, defined in `CreatureGrid.ts`) vs. `SecurityUnitState` (full DOM/anime state, defined in `SecurityCreature.ts`) are intentionally different types — `RaidController.getSecurityUnits()` is the mapping boundary between them. `onCreatureTerminated`/`onSecurityRemoved` both use the same `(x, y, w, h) => void` shape throughout.
- **Out of scope carried over from the design spec:** device-motion shake, and any change to the `eyes`/`pointedFinger`/`cockroach`/`placard` mode system.
