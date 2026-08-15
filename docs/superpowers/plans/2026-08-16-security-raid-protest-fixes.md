# Security Raid Protest Fixes & Power Mechanic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the security-raid-protest feature's bugs (shake feel, security repel-without-despawn, z-index, shadow, poof timing, tooltip copy), add a mixed/bursting spawn entrance, replace the instant Protest button with a press-and-hold power mechanic that can be lost by releasing early, match the button's Figma spacing, and fix a real double-DOM-write perf bug in the shared creature render path.

**Architecture:** No new modules. Targeted edits to the existing four files that already own this feature (`creaturePhysics.ts`, `CreatureGrid.ts`, `SecurityCreature.ts`, `RaidController.ts`), plus `StickerOverlay.ts`, `hud.css`, and `main.ts`. The security-unit animation state (`phase`/`phaseStartMs`) is modeled the same way `CreatureGrid` already models creature spawn/fade — pure functions of elapsed time — and both the instant-recovery path and the new charge-based path are unified onto one `RaidController.tick()` sweep instead of two separate timer mechanisms.

**Tech Stack:** TypeScript, Vite, vitest + happy-dom, `anime.js` (mocked in tests).

**Spec:** [docs/superpowers/specs/2026-08-16-security-raid-protest-fixes-design.md](../specs/2026-08-16-security-raid-protest-fixes-design.md)

---

## Task 1: Perf — stop double-writing the creature transform

**Files:**
- Modify: `src/creatures/creaturePhysics.ts:40-70`
- Test: `tests/unit/creaturePhysics.test.ts`

`updateCreature()` currently computes a "face away from avatar" rotation and writes the full `transform` to the DOM (lines 65-69) — but `CreatureGrid.update()` unconditionally overwrites that same element's `transform` again for every creature, every frame, in its per-mode render loop (`CreatureGrid.ts:479` for eyes, `:501` for finger/cockroach/placard), which is the only place rotation/scale/hover-boost is actually read from. `updateCreature`'s DOM write and its `angle` calculation are both fully dead code — nothing downstream ever reads them.

- [ ] **Step 1: Update the failing tests first**

Replace the two tests that depend on `updateCreature` touching the DOM, in `tests/unit/creaturePhysics.test.ts`:

```typescript
    it("does not touch the DOM transform (that is CreatureGrid's job)", () => {
      const avatar: AvatarPos = { x: 50, y: 100 };

      updateCreature(creature, avatar, DEFAULT_PARAMS);

      expect(creature.el.style.transform).toBe("");
    });
```

This replaces both the `"rotation faces away from avatar"` test and the `"updates DOM transform with position, scale, and rotation"` test (delete both — their assertions no longer apply since physics no longer renders).

Also update the `updateAllCreatures` test to assert the same non-mutation instead of the weak `toBeDefined()` check:

```typescript
  describe("updateAllCreatures", () => {
    it("updates multiple creatures' physics without touching their transforms", () => {
      const c1 = createCreature({ x: 100, y: 100 });
      const c2 = createCreature({ x: 200, y: 200, hx: 200, hy: 200 });
      const creatures = [c1, c2];
      const avatar: AvatarPos = { x: 120, y: 100 };

      updateAllCreatures(creatures, avatar, DEFAULT_PARAMS);

      expect(c1.x).not.toBe(100);
      expect(c2.x).not.toBe(200);
      expect(c1.el.style.transform).toBe("");
      expect(c2.el.style.transform).toBe("");
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- creaturePhysics`
Expected: FAIL — `creature.el.style.transform` is currently `"translate(...) rotate(...)"`, not `""`.

- [ ] **Step 3: Remove the dead rotation/DOM-write code from `updateCreature`**

Replace the body of `updateCreature` in `src/creatures/creaturePhysics.ts`:

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
}
```

(Removes the `angle` calculation and the `creature.el.style.transform = ...` line entirely — position/velocity integration is now this function's only job. `CreatureGrid` already computes its own per-mode rotation and writes the one authoritative `transform` per creature per frame.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- creaturePhysics`
Expected: PASS (all tests in the file, including the two rewritten ones)

- [ ] **Step 5: Run the full unit suite to confirm no regressions**

Run: `npm test`
Expected: PASS — `CreatureGrid.ts` never read `updateCreature`'s DOM write, so nothing else should break.

- [ ] **Step 6: Commit**

```bash
git add src/creatures/creaturePhysics.ts tests/unit/creaturePhysics.test.ts
git commit -m "perf: stop writing a dead transform in updateCreature

CreatureGrid.update() already overwrites every creature's transform
with the real rotation/scale/hover-boost every frame; updateCreature's
own rotation calc and DOM write were fully redundant, doubling the
per-frame style writes across the whole crowd."
```

---

## Task 2: Dedupe the per-mode creature factory in CreatureGrid

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:286-331` (spawn), `:338-402` (setQuantity)

`spawn()` and `setQuantity()` each contain an identical `switch (mode) { case 'eyes': ... }` block for constructing one creature. Extract it once as a private method so both call sites — and the upcoming entrance-animation work — share one place.

- [ ] **Step 1: Add the factory method to the `CreatureGrid` class**

Add this private method (place it just above `spawn()`):

```typescript
  private createCreatureForMode(mode: CreatureMode, hx: number, hy: number, scale: number, uid: string): Creature {
    switch (mode) {
      case 'eyes': {
        const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
        this.eyeCreatures.push(eye);
        return eye;
      }
      case 'pointedFinger':
        return createFingerCreature(hx, hy, scale);
      case 'cockroach':
        return createCockroachCreature(hx, hy, scale);
      case 'placard':
        return createPlacardCreature(hx, hy, scale);
    }
  }
```

- [ ] **Step 2: Replace the switch block inside `spawn()`**

In `spawn()`, replace:

```typescript
      let creature: Creature;
      switch (mode) {
        case 'eyes': {
          const eye = createEyeCreature(hx, hy, scale, this.svgMarkup, uid);
          this.eyeCreatures.push(eye);
          creature = eye;
          break;
        }
        case 'pointedFinger':
          creature = createFingerCreature(hx, hy, scale);
          break;
        case 'cockroach':
          creature = createCockroachCreature(hx, hy, scale);
          break;
        case 'placard':
          creature = createPlacardCreature(hx, hy, scale);
          break;
      }
```

with:

```typescript
      const creature = this.createCreatureForMode(mode, hx, hy, scale, uid);
```

- [ ] **Step 3: Replace the identical switch block inside `setQuantity()`**

Same replacement as Step 2, applied to the second occurrence inside `setQuantity()` (the one using `uid = \`extra_${i}\``).

- [ ] **Step 4: Run the full CreatureGrid test suite**

Run: `npm test -- creatureGrid`
Expected: PASS — this is a pure refactor, all existing spawn/setQuantity/mode-switching tests must pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/creatures/CreatureGrid.ts
git commit -m "refactor: extract createCreatureForMode to dedupe spawn/setQuantity"
```

---

## Task 3: Extract a throttle-check helper for the three timer-gated passes

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:404-575` (`update()`)

`update()` repeats the same `if (now - lastXMs >= intervalMs) { lastXMs = now; ... }` shape three times (fade-pick, repop-pick, catch-check), contributing to a ~170-line method with several concerns interleaved.

- [ ] **Step 1: Add a small private helper**

Add this private method to the `CreatureGrid` class (near the other private helpers):

```typescript
  /** True once `intervalMs` has elapsed since `lastMs`. Callers own updating their own `lastMs` field on a true result — this only answers "should I run now?". */
  private shouldRunThrottled(lastMs: number, intervalMs: number, now: number): boolean {
    return now - lastMs >= intervalMs;
  }
```

- [ ] **Step 2: Use it in the fade-pick block**

Replace:

```typescript
    if (now - this.lastFadePickMs >= FADE_PICK_INTERVAL_MS) {
      const candidates = this.creatures.filter((c) => c.spawnDone && c.fadeStartMs === 0);
```

with:

```typescript
    if (this.shouldRunThrottled(this.lastFadePickMs, FADE_PICK_INTERVAL_MS, now)) {
      const candidates = this.creatures.filter((c) => c.spawnDone && c.fadeStartMs === 0);
```

(the `this.lastFadePickMs = now;` line inside the block that follows stays as-is — the helper only answers the "should I run" question, the caller still owns updating its own timestamp field on that branch)

- [ ] **Step 3: Use it in the repop-pick block**

Replace:

```typescript
    if (now - this.lastRepopPickMs >= REPOP_INTERVAL_MS) {
      this.lastRepopPickMs = now;
```

with:

```typescript
    if (this.shouldRunThrottled(this.lastRepopPickMs, REPOP_INTERVAL_MS, now)) {
      this.lastRepopPickMs = now;
```

- [ ] **Step 4: Use it in the catch-check block**

Replace:

```typescript
    if (securityUnits.length > 0 && now - this.lastCatchPickMs >= CATCH_CHECK_INTERVAL_MS) {
      this.lastCatchPickMs = now;
```

with:

```typescript
    if (securityUnits.length > 0 && this.shouldRunThrottled(this.lastCatchPickMs, CATCH_CHECK_INTERVAL_MS, now)) {
      this.lastCatchPickMs = now;
```

- [ ] **Step 5: Run the full CreatureGrid test suite**

Run: `npm test -- creatureGrid`
Expected: PASS — pure refactor, no behavior change.

- [ ] **Step 6: Commit**

```bash
git add src/creatures/CreatureGrid.ts
git commit -m "refactor: extract shouldRunThrottled to dedupe CreatureGrid's timer-gated passes"
```

---

## Task 4: Fix — security repels but never despawns creatures

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:552-574` (catch-check block)
- Test: `tests/unit/creatureGrid.test.ts`

Root cause: the catch-check skips any creature where `!c.spawnDone`. Since a creature's spawn-pop can be scheduled anywhere across a 20s wave (`SPAWN_WAVE_MS`), most of the crowd is ineligible to be caught for a long stretch after every spawn/respawn — security only ever pushes the (already-popped) minority around, and never catches the rest.

- [ ] **Step 1: Write the failing test**

Add to the `describe('security units', ...)` block in `tests/unit/creatureGrid.test.ts`:

```typescript
    it('removes a creature that is still mid-spawn-pop (not spawnDone) as long as it is not fading or waiting to respawn', () => {
      const terminated: Array<{ x: number; y: number; w: number; h: number }> = [];
      const grid = new CreatureGrid({
        ...config,
        initialQuantity: 20,
        onCreatureTerminated: (x, y, w, h) => terminated.push({ x, y, w, h }),
      });
      grid.spawn('cockroach');
      const before = grid.getCreatureCount();

      const target = (
        grid as unknown as {
          creatures: { x: number; y: number; spawnPopAtMs: number; spawnDone: boolean; fadeStartMs: number; waitingRespawn: boolean }[];
        }
      ).creatures[0]!;
      // Still mid pop-in (not spawnDone), but present, not fading, not waiting to respawn.
      target.spawnDone = false;
      target.fadeStartMs = 0;
      target.waitingRespawn = false;

      const securityUnits = [{ x: target.x, y: target.y, repelRadius: 160, catchRadius: 50 }];

      grid.update(-1000, -1000, securityUnits, 0);

      expect(grid.getCreatureCount()).toBeLessThan(before);
      expect(terminated.length).toBeGreaterThan(0);
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- creatureGrid -t "mid-spawn-pop"`
Expected: FAIL — the current `!c.spawnDone` condition skips this creature, so `grid.getCreatureCount()` stays equal to `before`.

- [ ] **Step 3: Drop the `spawnDone` requirement from the catch condition**

In `CreatureGrid.ts`'s catch-check loop, change:

```typescript
          if (!c.spawnDone || c.fadeStartMs !== 0 || c.waitingRespawn) continue;
```

to:

```typescript
          if (c.fadeStartMs !== 0 || c.waitingRespawn) continue;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- creatureGrid -t "mid-spawn-pop"`
Expected: PASS

- [ ] **Step 5: Run the full CreatureGrid suite to confirm the existing catch tests still pass**

Run: `npm test -- creatureGrid`
Expected: PASS — the existing `'does not remove a creature that is invisible (waitingRespawn) or mid-fade'` test still passes since it relies on `waitingRespawn`/`fadeStartMs`, not `spawnDone`.

- [ ] **Step 6: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGrid.test.ts
git commit -m "fix: security catches creatures mid-spawn-pop, not just fully-settled ones

The catch-check required spawnDone, but a creature's pop-in can be
scheduled up to 20s out — most of the crowd was uncatchable for long
stretches, so security only ever repelled instead of despawning."
```

---

## Task 5: Shake responsiveness tuning

**Files:**
- Modify: `src/creatures/RaidController.ts:14-20`
- Test: `tests/unit/raidController.test.ts`

Tighten the three constants that make a shake hard to trigger. `SHAKE_PULSE_COOLDOWN_MS` stays at 500ms — it's what keeps a sustained shake reading as a wave of arrivals rather than a machine-gun spawn, independent of how easy one pulse is to trigger.

- [ ] **Step 1: Update the constants**

In `src/creatures/RaidController.ts`, change:

```typescript
export const SHAKE_WINDOW_MS = 900;
export const SHAKE_REVERSAL_THRESHOLD = 4;
export const SHAKE_MIN_SPEED_PX_MS = 1.2;
```

to:

```typescript
export const SHAKE_WINDOW_MS = 600;
export const SHAKE_REVERSAL_THRESHOLD = 3;
export const SHAKE_MIN_SPEED_PX_MS = 0.9;
```

- [ ] **Step 2: Update the two threshold-boundary tests in `detectShake`**

In `tests/unit/raidController.test.ts`, replace:

```typescript
  it('returns false at 3 reversals, just below the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
    ];
    expect(detectShake(samples)).toBe(false);
  });

  it('returns true at exactly 4 reversals, the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
      sample(60, 0, 100),
    ];
    expect(detectShake(samples)).toBe(true);
  });
```

with:

```typescript
  it('returns false at 2 reversals, just below the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
    ];
    expect(detectShake(samples)).toBe(false);
  });

  it('returns true at exactly 3 reversals, the threshold', () => {
    const samples: MoveSample[] = [
      sample(0, 0, 0),
      sample(60, 0, 20),
      sample(0, 0, 40),
      sample(60, 0, 60),
      sample(0, 0, 80),
    ];
    expect(detectShake(samples)).toBe(true);
  });
```

(The remaining `detectShake` tests — smooth drag, slow back-and-forth, the 7-sample rapid-reversal case, the outside-window case, and the mixed-axis case — all still pass unchanged: their reversal counts and speeds clear the new, lower bars just as easily as the old ones.)

- [ ] **Step 3: Run the detectShake tests**

Run: `npm test -- raidController -t "detectShake"`
Expected: PASS (all `detectShake` tests)

- [ ] **Step 4: Run the full RaidController suite**

Run: `npm test -- raidController`
Expected: PASS — the pulse-spawning tests use a 7-sample shake pattern that clears both the old and new thresholds, so they're unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "fix: make shake detection more responsive

Fewer, faster reversals now register a shake pulse (3 reversals in a
600ms window at >=0.9px/ms, down from 4/900ms/1.2px/ms) — a swift
shake reads as a shake instead of needing a long deliberate one."
```

---

## Task 6: SecurityCreature.ts — z-index, shadow, and entrance/shrink phase model

**Files:**
- Modify: `src/creatures/SecurityCreature.ts` (whole file — see full replacement below)
- Test: `tests/unit/securityCreature.test.ts`

Bundles three related fixes into one file pass: security must render below the avatar (z-index), its shadow must read as flat/grounded, and it needs a `phase`/`phaseStartMs` model (mirroring `CreatureGrid`'s own `computeSpawnProgress` pattern) so the entrance pop-in (Task 7) and despawn shrink (Task 8) both derive scale/opacity/repel-radius from pure functions of elapsed time instead of separate ad-hoc animation state.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/securityCreature.test.ts` (add these imports alongside the existing ones, and this content):

```typescript
import {
  SECURITY_WIDTH,
  SECURITY_Z_INDEX,
  SECURITY_ENTER_MS,
  SECURITY_SHRINK_MS,
  securityHeightFor,
  pickSecurityKind,
  createSecurityUnit,
  removeSecurityUnit,
  computeSecurityEnterProgress,
  computeSecurityShrinkFraction,
  burstWaypoint,
} from '../../src/creatures/SecurityCreature';
```

Add these new `describe` blocks:

```typescript
  describe('createSecurityUnit — z-index, shadow, entrance', () => {
    it('renders below the avatar/sticker z-index (100)', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.zIndex).toBe(String(SECURITY_Z_INDEX));
      expect(SECURITY_Z_INDEX).toBeLessThan(100);
    });

    it('uses a flat, subtle drop-shadow', () => {
      const unit = createSecurityUnit(container, 0, 0, 'police');
      expect(unit.el.style.filter).toContain('rgba(0,0,0,0.12)');
    });

    it('spawns at scale 0 / opacity 0, mid-entrance', () => {
      const unit = createSecurityUnit(container, 100, 200, 'police');
      expect(unit.phase).toBe('entering');
      expect(unit.el.style.opacity).toBe('0');
      expect(unit.el.style.transform).toContain('scale(0.000)');
    });
  });

  describe('computeSecurityEnterProgress', () => {
    it('is fully hidden at the start of the phase', () => {
      expect(computeSecurityEnterProgress(1000, 1000)).toEqual({ scale: 0, opacity: 0, done: false });
    });

    it('is partway through at the midpoint', () => {
      const result = computeSecurityEnterProgress(1000, 1000 + SECURITY_ENTER_MS / 2);
      expect(result.scale).toBeCloseTo(0.5, 5);
      expect(result.opacity).toBeCloseTo(0.5, 5);
      expect(result.done).toBe(false);
    });

    it('is fully shown once the duration elapses', () => {
      expect(computeSecurityEnterProgress(1000, 1000 + SECURITY_ENTER_MS)).toEqual({ scale: 1, opacity: 1, done: true });
    });
  });

  describe('computeSecurityShrinkFraction', () => {
    it('is full strength (1) right as the shrink phase starts', () => {
      expect(computeSecurityShrinkFraction(1000, 1000)).toBe(1);
    });

    it('is half strength at the midpoint', () => {
      expect(computeSecurityShrinkFraction(1000, 1000 + SECURITY_SHRINK_MS / 2)).toBeCloseTo(0.5, 5);
    });

    it('is zero once the shrink duration elapses', () => {
      expect(computeSecurityShrinkFraction(1000, 1000 + SECURITY_SHRINK_MS)).toBe(0);
    });

    it('clamps to full strength (1) for a phaseStartMs still in the future', () => {
      expect(computeSecurityShrinkFraction(2000, 1000)).toBe(1);
    });
  });

  describe('burstWaypoint', () => {
    it('produces a point at a random angle 150-300px away, clamped to the viewport margins', () => {
      const state = { x: 400, y: 300 };
      const values = [0, 0]; // angle = 0 * 2π = 0 rad, dist = 150 + 0 * 150 = 150
      let i = 0;
      const fixedRand = () => values[i++]!;

      const p = burstWaypoint(state, 800, 600, fixedRand);

      expect(p.x).toBeCloseTo(550, 5); // 400 + cos(0) * 150
      expect(p.y).toBeCloseTo(300, 5); // 300 + sin(0) * 150
    });

    it('clamps the result to stay within the viewport margins', () => {
      const state = { x: 10, y: 10 };
      const values = [0.125, 1]; // angle = 45deg, dist = 300 (max)
      let i = 0;
      const fixedRand = () => values[i++]!;

      const p = burstWaypoint(state, 800, 600, fixedRand);

      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.y).toBeGreaterThanOrEqual(40);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- securityCreature`
Expected: FAIL — `SECURITY_Z_INDEX`, `SECURITY_ENTER_MS`, `SECURITY_SHRINK_MS`, `computeSecurityEnterProgress`, `computeSecurityShrinkFraction`, and `burstWaypoint` don't exist yet; `unit.phase` is undefined.

- [ ] **Step 3: Replace `src/creatures/SecurityCreature.ts` in full**

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- securityCreature`
Expected: PASS (all tests in the file, including the existing `createSecurityUnit`/`removeSecurityUnit`/`pickSecurityKind`/`securityHeightFor` tests, which are unaffected)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/SecurityCreature.ts tests/unit/securityCreature.test.ts
git commit -m "fix: security z-index/shadow, add entrance/shrink phase model

Security now renders strictly below the avatar (z-index 90 vs 100),
uses a flat grounded shadow instead of a floating one, and spawns
easing in from scale 0/opacity 0 — all driven by pure functions of
elapsed time (phase + phaseStartMs), matching CreatureGrid's own
spawn-progress pattern instead of ad-hoc animation flags."
```

---

## Task 7: RaidController — mixed-kind, bursting spawn pulses

**Files:**
- Modify: `src/creatures/RaidController.ts` (constants + `spawnPulse`)
- Test: `tests/unit/raidController.test.ts`

Currently a pulse's kind is an independent 50/50 coin-flip per unit, so a pulse can end up all-police or all-raf by chance, and every unit spawns via the plain (small-step) wander instead of bursting outward.

- [ ] **Step 1: Write the failing test for the new `pickPulseKinds` helper**

Add near the top of `tests/unit/raidController.test.ts` (after the existing imports, before `describe('detectShake', ...)`):

```typescript
import { pickPulseKinds } from '../../src/creatures/RaidController';
```

Add a new top-level `describe`:

```typescript
describe('pickPulseKinds', () => {
  it('returns a single kind picked by rand() for n < 2', () => {
    expect(pickPulseKinds(1, () => 0.1)).toEqual(['police']);
    expect(pickPulseKinds(1, () => 0.9)).toEqual(['raf']);
  });

  it('guarantees at least one of each kind once n >= 2', () => {
    const kinds = pickPulseKinds(2, () => 0.5);
    expect(kinds).toHaveLength(2);
    expect(kinds).toContain('police');
    expect(kinds).toContain('raf');
  });

  it('fills slots beyond the guaranteed pair using the provided rand, keeping both kinds present', () => {
    const kinds = pickPulseKinds(3, () => 0.1);
    expect(kinds).toHaveLength(3);
    expect(kinds.filter((k) => k === 'police').length).toBeGreaterThanOrEqual(1);
    expect(kinds.filter((k) => k === 'raf').length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- raidController -t "pickPulseKinds"`
Expected: FAIL — `pickPulseKinds` is not exported yet.

- [ ] **Step 3: Add `pickPulseKinds` and wire it + the burst flag into `spawnPulse`**

In `src/creatures/RaidController.ts`, update the imports:

```typescript
import { CreatureGrid } from "./CreatureGrid";
import type { SecurityUnit } from "./CreatureGrid";
import { createSecurityUnit, removeSecurityUnit, startSecurityWander, pickSecurityKind } from "./SecurityCreature";
import type { SecurityUnitState, SecurityKind } from "./SecurityCreature";
import { QTY_MAX, QTY_MIN } from "../config/tokens";
```

Add this exported function near the other module-level helpers (after `rand`):

```typescript
/** Kinds for one spawn pulse: guarantees at least one of each kind once 2+ units
 * spawn (so a pulse never reads as all-one-kind by chance), randomizing the rest
 * and the order. */
export function pickPulseKinds(n: number, rand: () => number = Math.random): SecurityKind[] {
  if (n < 2) return [pickSecurityKind(rand)];
  const kinds: SecurityKind[] = ["police", "raf"];
  for (let i = 2; i < n; i++) kinds.push(pickSecurityKind(rand));
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j]!, kinds[i]!];
  }
  return kinds;
}
```

Update `spawnPulse`'s loop:

```typescript
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
    const kinds = pickPulseKinds(n);

    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.container, x, y, kinds[i]);
      startSecurityWander(unit, vw, vh, true);
      this.units.push(unit);
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- raidController -t "pickPulseKinds"`
Expected: PASS

- [ ] **Step 5: Run the full RaidController suite**

Run: `npm test -- raidController`
Expected: PASS — the existing pulse-spawn tests only assert unit *count*, not kind distribution or wander behavior, so they're unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "feat: guarantee a police/raf mix and a bursting entrance per spawn pulse

Each pulse now guarantees at least one of each kind once 2+ units
spawn, and every unit's first wander leg is a 150-300px burst outward
from the avatar instead of a small step, so a pulse visibly scatters
like a disturbed swarm."
```

---

## Task 8: Unify security despawn onto one tick()-driven shrink sweep

**Files:**
- Modify: `src/creatures/RaidController.ts` (`getSecurityUnits`, `startRecovery`, `destroy`, remove `popNextUnit`/`recoveryTimer`, add `tick`)
- Test: `tests/unit/raidController.test.ts` (rewrite the recovery-related tests)

Currently `popNextUnit()` calls `removeSecurityUnit()` (instant DOM removal) in the same tick that `onSecurityRemoved` fires `spawnPoof()`, so the sprite is gone before the poof cloud has visibly grown to cover it — and the whole thing runs on its own `setTimeout` chain (`recoveryTimer`). This task replaces that chain with a single `tick(nowMs)` method (to be called every engine frame, wired in Task 11) that sweeps out any unit whose `phase === 'shrinking'` once its `SECURITY_SHRINK_MS` window has elapsed — reusing the phase model from Task 6 instead of adding a second timer mechanism.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/raidController.test.ts`, add this import:

```typescript
import { SECURITY_SHRINK_MS } from '../../src/creatures/SecurityCreature';
```

Replace the four existing recovery-related tests (`'startRecovery poofs units out one by one and ramps the crowd to QTY_MAX'`, `'startRecovery is a no-op when already recovering (re-entry safe)'`, and `'destroy() mid-recovery cancels the pending poof and does not fire further state changes'`) with:

```typescript
  it('startRecovery marks every unit shrinking immediately but removes none synchronously', () => {
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
    expect(raid.getSecurityUnits().length).toBe(spawned);
    expect(grid.getCreatureCount()).toBe(900); // QTY_MAX, applied immediately

    now.mockRestore();
  });

  it('tick() sweeps units out one at a time on their staggered shrink schedule, then goes idle', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;

    raid.startRecovery();

    for (let i = 0; i < spawned; i++) {
      t += SECURITY_SHRINK_MS;
      raid.tick(t);
      expect(raid.getSecurityUnits().length).toBe(spawned - (i + 1));
    }

    expect(raid.getSecurityUnits().length).toBe(0);
    expect(raid.getState()).toBe('idle');

    now.mockRestore();
  });

  it('startRecovery is a no-op when already recovering (re-entry safe)', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;

    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');

    // Second call while already recovering must not disturb the shrink schedule.
    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');
    expect(raid.getSecurityUnits().length).toBe(spawned);

    for (let i = 0; i < spawned; i++) {
      t += SECURITY_SHRINK_MS;
      raid.tick(t);
    }

    expect(raid.getSecurityUnits().length).toBe(0);
    expect(raid.getState()).toBe('idle');

    now.mockRestore();
  });

  it('destroy() mid-recovery removes all units immediately and further ticks do nothing', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const spawned = raid.getSecurityUnits().length;

    raid.startRecovery();
    expect(raid.getState()).toBe('recovering');

    raid.destroy();
    expect(raid.getState()).toBe('idle');
    expect(raid.getSecurityUnits()).toEqual([]);

    t += SECURITY_SHRINK_MS * spawned;
    raid.tick(t);
    expect(raid.getState()).toBe('idle');
    expect(raid.getSecurityUnits()).toEqual([]);

    now.mockRestore();
  });
```

Remove the `afterEach(() => { vi.useRealTimers(); })` body's relevance is unaffected (leave `afterEach` as-is — it's harmless even though these specific tests no longer use fake timers).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- raidController -t "recovering"`
Expected: FAIL — `raid.tick` doesn't exist yet, and `startRecovery` still removes a unit synchronously.

- [ ] **Step 3: Replace `getSecurityUnits`, `startRecovery`, `destroy`, and `popNextUnit`/`recoveryTimer` in `RaidController.ts`**

Add `"charging"` to the `RaidState` union now, even though the charging behavior itself isn't implemented until Task 11 — `startRecovery()` below needs to guard against it, and adding the value up front avoids a TypeScript error comparing `this.state` to a string not yet in the union:

```typescript
export type RaidState = "idle" | "raiding" | "recovering" | "charging";
```

Remove the `recoveryTimer` field entirely:

```typescript
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
```

Remove the `RECOVERY_POOF_INTERVAL_MS` constant (its job is now `SECURITY_SHRINK_MS`, owned by `SecurityCreature.ts`):

```typescript
/** Stagger between each security unit poofing away during recovery (ms). */
export const RECOVERY_POOF_INTERVAL_MS = 350;
```

Replace `getSecurityUnits()`:

```typescript
  /** Current security units, in the shape CreatureGrid.update() expects for repulsion/catching. */
  getSecurityUnits(): SecurityUnit[] {
    const now = Date.now();
    return this.units.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius:
        u.phase === "shrinking"
          ? SECURITY_REPEL_RADIUS * computeSecurityShrinkFraction(u.phaseStartMs, now)
          : SECURITY_REPEL_RADIUS,
      catchRadius: SECURITY_CATCH_RADIUS,
    }));
  }
```

Replace `startRecovery()` and delete `popNextUnit()` entirely:

```typescript
  /** Instantly triggers full recovery without a hold — a direct entry point kept for
   * callers that don't go through the charge mechanic (see Task 11). Marks every unit
   * shrinking on a staggered schedule (SECURITY_SHRINK_MS apart) so they pop out one
   * after another as tick() sweeps them, rather than all vanishing at once. */
  startRecovery(): void {
    if (this.state === "recovering" || this.state === "charging") return;

    this.grid.setQuantity(QTY_MAX);

    if (this.units.length === 0) {
      this.state = "idle";
      return;
    }

    this.state = "recovering";
    const now = Date.now();
    this.units.forEach((unit, i) => {
      unit.phase = "shrinking";
      unit.phaseStartMs = now + i * SECURITY_SHRINK_MS;
    });
  }

  /** Call every engine frame (see main.ts). Sweeps out any unit whose shrink window has
   * elapsed, firing the despawn poof and removing it from the DOM. Transitions
   * 'recovering' -> 'idle' once every unit has been swept. */
  tick(nowMs: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]!;
      if (unit.phase === "shrinking" && nowMs - unit.phaseStartMs >= SECURITY_SHRINK_MS) {
        this.units.splice(i, 1);
        this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
        removeSecurityUnit(unit);
      }
    }

    if (this.state === "recovering") {
      if (this.units.length === 0) this.state = "idle";
      return;
    }
  }
```

Replace `destroy()`:

```typescript
  /** Full teardown — call when tearing this controller down: removes all remaining
   * security units from the DOM and resets to idle. */
  destroy(): void {
    for (const unit of this.units) {
      removeSecurityUnit(unit);
    }
    this.units = [];
    this.state = "idle";
  }
```

Update the import line to bring in `computeSecurityShrinkFraction` and `SECURITY_SHRINK_MS`:

```typescript
import {
  createSecurityUnit,
  removeSecurityUnit,
  startSecurityWander,
  pickSecurityKind,
  computeSecurityShrinkFraction,
  SECURITY_SHRINK_MS,
} from "./SecurityCreature";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS (all tests, including the new recovery ones — `pickPulseKinds` and `detectShake` tests from earlier tasks are unaffected)

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "fix: security shrinks before despawning, unified onto one tick() sweep

Replaces the old instant-remove-then-350ms-setTimeout chain with a
phase-based shrink (repel radius eases to 0 over SECURITY_SHRINK_MS,
then the unit pops and is removed) driven by a single tick() sweep
called every engine frame, instead of a second parallel timer
mechanism. startRecovery() now just stamps a staggered shrink schedule
instead of owning its own setTimeout recursion."
```

---

## Task 9: Tooltip copy — "Drag or Shake Me"

**Files:**
- Modify: `src/creatures/StickerOverlay.ts:141`
- Test: `tests/unit/stickerOverlay.test.ts`

The avatar/sticker drag-hint says "Drag me" — it's the only overlay wired to `raidController.onAvatarMove` (the text overlay intentionally isn't), so the hint should say what both gestures do.

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/stickerOverlay.test.ts`:

```typescript
  it('shows a drag-hint tooltip that mentions both drag and shake', () => {
    const sticker = new StickerOverlay(
      '/some.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      true, // showDragHint
    );
    document.body.appendChild(sticker.el);

    const hint = sticker.el.querySelector('.sticker-overlay-drag-hint');
    expect(hint?.textContent).toBe('Drag or Shake Me');
  });
```

(Check the top of the test file for the existing `import { StickerOverlay } from ...` and any shared `beforeEach`/`afterEach` container setup, and place this inside the existing top-level `describe` block, following the file's established pattern.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- stickerOverlay -t "drag-hint"`
Expected: FAIL — current text is `"Drag me"`.

- [ ] **Step 3: Update the copy**

In `src/creatures/StickerOverlay.ts`, change:

```typescript
    hint.textContent = "Drag me";
```

to:

```typescript
    hint.textContent = "Drag or Shake Me";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- stickerOverlay -t "drag-hint"`
Expected: PASS

- [ ] **Step 5: Run the full StickerOverlay suite**

Run: `npm test -- stickerOverlay`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/creatures/StickerOverlay.ts tests/unit/stickerOverlay.test.ts
git commit -m "fix: avatar drag-hint copy now mentions shake, not just drag"
```

---

## Task 10: Protest button — Figma padding fix

**Files:**
- Modify: `src/hud/hud.css:271-295` (`.hud-attack`)

Figma (node `189:4623`) specs the Protest CTA pill as its own fixed box: `height:39px`, `padding:12px` on all sides, `border-radius:12px` — sized independently from the other HUD icon buttons. Current CSS inherits the icon buttons' responsive sizing token instead, making it taller and only side-padded.

- [ ] **Step 1: Update `.hud-attack`'s sizing**

In `src/hud/hud.css`, change:

```css
.hud-attack {
  position: relative;
  height: var(--hud-btn-size);
  padding: 0 16px;
```

to:

```css
.hud-attack {
  position: relative;
  box-sizing: border-box;
  height: 39px;
  padding: 12px;
```

(Leave the rest of the rule — background, border, border-radius, box-shadow, color, font, transitions, animation — untouched; it already matches the Figma spec.)

- [ ] **Step 2: Manually verify against the Figma screenshot**

Run: `npm run dev`

Open the app, compare the Protest button's proportions against the Figma reference (node `189:4623` — a 39px-tall pill with even 12px padding around the "PROTEST" label) at both a narrow and wide viewport width (the surrounding HUD is responsive via `--hud-density`; confirm the Protest button now stays a fixed size while the icon buttons around it still scale).

- [ ] **Step 3: Commit**

```bash
git add src/hud/hud.css
git commit -m "fix: Protest button padding/height now matches Figma (39px, 12px padding)

Was inheriting the icon buttons' responsive --hud-btn-size (44-52px)
and 0/16px padding; Figma specs it as its own fixed 39px pill with
even 12px padding, independent of the other HUD buttons' sizing."
```

---

## Task 11: Protest button — press-and-hold power mechanic

**Files:**
- Modify: `src/creatures/RaidController.ts` (charge state + `startCharging`/`releaseCharge`/`tick`)
- Modify: `src/main.ts` (wire pointerdown/up/leave/cancel, tick the controller, sync the crowd slider on completion)
- Modify: `src/hud/hud.css` (charge-fill visual)
- Test: `tests/unit/raidController.test.ts`

Replaces the instant-recovery click with: hold to charge (1.8s to fully clear the raid), release early and the raid surges back to its pre-hold strength.

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/raidController.test.ts`, inside the `describe('RaidController', ...)` block:

```typescript
  describe('charge/release protest mechanic', () => {
    function triggerRaid(now: { mockImplementation: (fn: () => number) => void }, tRef: { t: number }): void {
      now.mockImplementation(() => tRef.t);
      const xs = [0, 60, 0, 60, 0, 60, 0];
      for (const x of xs) {
        raid.onAvatarMove(x, 0);
        tRef.t += 20;
      }
    }

    it('startCharging is a no-op while idle (nothing to recover)', () => {
      raid.startCharging();
      expect(raid.getState()).toBe('idle');
      expect(raid.getChargeFraction()).toBe(0);
    });

    it('charges progressively while held, rebuilding the crowd, and completes at full charge', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const raidStartCrowd = grid.getCreatureCount();

      raid.startCharging();
      expect(raid.getState()).toBe('charging');
      expect(raid.getChargeFraction()).toBe(0);

      tRef.t += 900; // half of CHARGE_DURATION_MS (1800)
      raid.tick(tRef.t);
      expect(raid.getChargeFraction()).toBeCloseTo(0.5, 1);
      expect(grid.getCreatureCount()).toBeGreaterThan(raidStartCrowd);
      expect(grid.getCreatureCount()).toBeLessThan(900);

      tRef.t += 900; // reach full charge
      raid.tick(tRef.t);
      tRef.t += SECURITY_SHRINK_MS; // let any just-marked units finish shrinking
      raid.tick(tRef.t);

      expect(raid.getChargeFraction()).toBe(1);
      expect(raid.getState()).toBe('idle');
      expect(raid.getSecurityUnits().length).toBe(0);
      expect(grid.getCreatureCount()).toBe(900);

      now.mockRestore();
    });

    it('releaseCharge before full charge reverts crowd/security to the pre-charge baseline', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;
      const raidStartCrowd = grid.getCreatureCount();

      raid.startCharging();
      tRef.t += 900;
      raid.tick(tRef.t);
      expect(grid.getCreatureCount()).toBeGreaterThan(raidStartCrowd);

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getChargeFraction()).toBe(0);
      expect(raid.getSecurityUnits().length).toBe(spawned);
      expect(grid.getCreatureCount()).toBe(raidStartCrowd);

      now.mockRestore();
    });

    it('releaseCharge respawns units that had already fully shrunk away before release', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.startCharging();
      tRef.t += 900;
      raid.tick(tRef.t); // marks some units shrinking
      tRef.t += SECURITY_SHRINK_MS;
      raid.tick(tRef.t); // sweeps them away for real

      expect(raid.getSecurityUnits().length).toBeLessThan(spawned);

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getSecurityUnits().length).toBe(spawned);

      now.mockRestore();
    });

    it('releaseCharge is a no-op when not charging', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);
      const spawned = raid.getSecurityUnits().length;

      raid.releaseCharge();

      expect(raid.getState()).toBe('raiding');
      expect(raid.getSecurityUnits().length).toBe(spawned);

      now.mockRestore();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- raidController -t "charge"`
Expected: FAIL — `startCharging`, `releaseCharge`, `getChargeFraction` don't exist yet.

- [ ] **Step 3: Add charge state and methods to `RaidController`**

(`"charging"` was already added to the `RaidState` union back in Task 8, since `startRecovery()`'s guard needed it then.)

Add this constant near the other exported constants:

```typescript
/** How long a full press-and-hold must be sustained to fully clear a raid (ms). */
export const CHARGE_DURATION_MS = 1800;
```

Add these private fields to the class (alongside the existing `raidStartCount` etc.):

```typescript
  private lastAvatarX = 0;
  private lastAvatarY = 0;
  private chargeStartAtMs = 0;
  private chargeBaselineUnitCount = 0;
  private chargeBaselineTargetCount = 0;
  private chargeFraction = 0;
```

Update `onAvatarMove` to always track the last position, and to also bail out while charging:

```typescript
  onAvatarMove(x: number, y: number): void {
    this.lastAvatarX = x;
    this.lastAvatarY = y;
    if (this.state === "recovering" || this.state === "charging") return;

    const now = Date.now();
    this.moveBuffer.push({ x, y, t: now });
    const cutoff = now - SHAKE_WINDOW_MS;
    this.moveBuffer = this.moveBuffer.filter((s) => s.t >= cutoff);

    if (now - this.lastPulseAtMs < SHAKE_PULSE_COOLDOWN_MS) return;
    if (!detectShake(this.moveBuffer)) return;

    this.lastPulseAtMs = now;
    this.spawnPulse(x, y);
  }
```

Add these public methods (near `getRaidFloor`/`getState`):

```typescript
  getChargeFraction(): number {
    return this.chargeFraction;
  }

  /** Wired to the Protest button's pointerdown. No-op unless a raid is in progress. */
  startCharging(): void {
    if (this.state !== "raiding") return;
    this.state = "charging";
    this.chargeStartAtMs = Date.now();
    this.chargeBaselineUnitCount = this.units.length;
    this.chargeBaselineTargetCount = this.grid.getCreatureCount();
    this.chargeFraction = 0;
  }

  /** Wired to the Protest button's pointerup/pointerleave/pointercancel: released
   * before full charge — the raid surges back to its exact pre-charge strength.
   * Partial progress is lost, not kept, matching the "commit and hold, or lose
   * ground" framing. */
  releaseCharge(): void {
    if (this.state !== "charging") return;

    for (const unit of this.units) {
      if (unit.phase === "shrinking") unit.phase = "wandering";
    }

    const missing = this.chargeBaselineUnitCount - this.units.length;
    if (missing > 0) {
      const vw = this.container.clientWidth || window.innerWidth;
      const vh = this.container.clientHeight || window.innerHeight;
      const kinds = pickPulseKinds(missing);
      for (let i = 0; i < missing; i++) {
        const unit = createSecurityUnit(this.container, this.lastAvatarX, this.lastAvatarY, kinds[i]);
        startSecurityWander(unit, vw, vh, true);
        this.units.push(unit);
      }
    }

    this.grid.setQuantity(this.chargeBaselineTargetCount);
    this.chargeFraction = 0;
    this.state = "raiding";
  }
```

Extend `tick()` to advance charge progress after the sweep (replace the whole method again):

```typescript
  /** Call every engine frame (see main.ts). Sweeps out any unit whose shrink window has
   * elapsed, firing the despawn poof and removing it from the DOM. Transitions
   * 'recovering' -> 'idle' once every unit has been swept, and while 'charging',
   * advances charge progress: proportionally shrinks security and rebuilds the crowd
   * toward QTY_MAX, completing (-> 'idle') once the full CHARGE_DURATION_MS has held. */
  tick(nowMs: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i]!;
      if (unit.phase === "shrinking" && nowMs - unit.phaseStartMs >= SECURITY_SHRINK_MS) {
        this.units.splice(i, 1);
        this.onSecurityRemoved?.(unit.x, unit.y, unit.w, unit.h);
        removeSecurityUnit(unit);
      }
    }

    if (this.state === "recovering") {
      if (this.units.length === 0) this.state = "idle";
      return;
    }

    if (this.state !== "charging") return;

    const fraction = Math.min(1, (nowMs - this.chargeStartAtMs) / CHARGE_DURATION_MS);
    this.chargeFraction = fraction;

    const keepCount = Math.round(this.chargeBaselineUnitCount * (1 - fraction));
    let excess = this.units.filter((u) => u.phase !== "shrinking").length - keepCount;
    for (const unit of this.units) {
      if (excess <= 0) break;
      if (unit.phase === "shrinking") continue;
      unit.phase = "shrinking";
      unit.phaseStartMs = nowMs;
      excess--;
    }

    const rebuilt = Math.round(
      this.chargeBaselineTargetCount + (QTY_MAX - this.chargeBaselineTargetCount) * fraction,
    );
    this.grid.setQuantity(rebuilt);

    if (fraction >= 1 && this.units.length === 0) {
      this.state = "idle";
    }
  }
```

Also update `startRecovery()`'s guard to bail out while charging too (it already bails on `"recovering"`):

```typescript
  startRecovery(): void {
    if (this.state === "recovering" || this.state === "charging") return;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS (full file — charge tests plus everything from Tasks 5, 7, 8)

- [ ] **Step 5: Wire the button in `main.ts`**

In `src/main.ts`, update the top-level `engine.onTick` (around line 97) to also tick the raid controller:

```typescript
  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    raidController.tick(Date.now());
    grid.update(center.x, center.y, raidController.getSecurityUnits(), raidController.getRaidFloor());
  });
  engine.start();
```

Inside `mountPostOnboarding()`, replace the existing click listener:

```typescript
    hud.getProtestButton().addEventListener("click", () => {
      raidController.startRecovery();
      filterPanel.setQuantity(QTY_MAX);
    });
```

with:

```typescript
    const protestBtn = hud.getProtestButton();
    protestBtn.addEventListener("pointerdown", () => {
      raidController.startCharging();
    });
    const releaseProtestCharge = (): void => {
      raidController.releaseCharge();
    };
    protestBtn.addEventListener("pointerup", releaseProtestCharge);
    protestBtn.addEventListener("pointerleave", releaseProtestCharge);
    protestBtn.addEventListener("pointercancel", releaseProtestCharge);

    let prevRaidState = raidController.getState();
    engine.onTick(() => {
      protestBtn.style.setProperty("--charge", String(raidController.getChargeFraction()));
      const raidState = raidController.getState();
      if (raidState === "idle" && prevRaidState !== "idle") {
        filterPanel.setQuantity(grid.getCreatureCount());
      }
      prevRaidState = raidState;
    });
```

(`engine.onTick` supports multiple registered listeners — see `Engine.ts`'s `tickListeners` `Set` — so this doesn't replace the top-level one; it adds a second listener scoped to the HUD, which only exists once `mountPostOnboarding()` runs.)

Update the import at the top of `main.ts` — `QTY_MAX` is no longer referenced now that the click handler is gone:

```typescript
import { DEFAULT_CREATURE_QUANTITY } from "./config/tokens";
```

- [ ] **Step 6: Add the charge-fill visual to `hud.css`**

In `src/hud/hud.css`, update `.hud-attack` to clip an inset fill and declare the `--charge` custom property:

```css
.hud-attack {
  position: relative;
  box-sizing: border-box;
  height: 39px;
  padding: 12px;
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
  overflow: hidden;
  --charge: 0;
}

.hud-attack::before {
  content: "";
  position: absolute;
  inset: 0;
  width: calc(100% * var(--charge));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.15));
  z-index: 0;
  pointer-events: none;
}
```

(`.hud-attack span { position: relative; z-index: 1; }` already exists further down the file, so the "PROTEST" label stays above this fill.)

- [ ] **Step 7: Manually verify the full hold/release loop**

Run: `npm run dev`

- Shake the avatar to trigger a raid (security units appear).
- Press and hold the Protest button: confirm the fill sweeps left-to-right across the button, the crowd visibly rebuilds, and security units shrink/poof away progressively.
- Release before ~1.8s: confirm the fill retreats, the crowd shrinks back, and a proportional batch of security re-spawns (bursting outward from the avatar).
- Hold for the full ~1.8s: confirm the raid fully clears (all security poofed, crowd at max) and the button's fill resets.

- [ ] **Step 8: Commit**

```bash
git add src/creatures/RaidController.ts src/main.ts src/hud/hud.css tests/unit/raidController.test.ts
git commit -m "feat: Protest button becomes a press-and-hold power mechanic

Holding the button charges recovery progressively over 1.8s (crowd
rebuilds, security shrinks/poofs proportionally); releasing early
surges security back to its exact pre-hold strength instead of
keeping partial progress. Visualized with a fill sweep across the
button tracking RaidController.getChargeFraction()."
```

---

## Task 12: Long-session GPU/CPU profiling pass

**Files:**
- None (investigation task) — findings get appended to the spec if they surface further work.

Task 1 already fixed the highest-leverage issue found during design review (the double transform write, which scaled with the full crowd × 60fps). This task verifies that fix under load and checks the other suspects named in the spec's section D before considering the perf ask closed.

- [ ] **Step 1: Baseline a long session in Chrome DevTools**

Run: `npm run dev`, open the app in Chrome, open DevTools → Performance panel.

- Set the crowd quantity slider to its maximum.
- Start a Performance recording.
- Over ~60 seconds: drag the avatar continuously (varying speed), shake it repeatedly to spawn multiple raid pulses (up to the 24-unit cap), and hold/release the Protest button several times.
- Stop the recording.

- [ ] **Step 2: Inspect the results against the specific suspects from the spec**

In the recorded flame chart / summary:
- Confirm `updateCreature`/`CreatureGrid.update` no longer shows two `Recalculate Style`/`Layout` passes per frame per creature (Task 1's fix).
- Check the `anime.js`-driven `startSecurityWander` calls: with up to 24 units wandering continuously, confirm the number of live animation instances stays bounded (it should — a unit only ever has one `posAnim` active at a time, replaced on each leg's `complete`).
- Check `removeSecurityUnit`'s `posAnim.pause()` is actually being hit for every removed unit (no orphaned running animations after a unit is swept by `tick()`).
- Look for any single frame exceeding 16ms consistently once the crowd is large — note which function dominates it, if any.

- [ ] **Step 3: Record findings**

If the recording shows no remaining hot path beyond ordinary crowd-size scaling (expected, and not itself a bug — a bigger crowd doing more physics work is inherent to the feature), add a short note to the end of `docs/superpowers/specs/2026-08-16-security-raid-protest-fixes-design.md`'s section D confirming this, e.g.:

```markdown
**Investigation result (post-Task-1):** profiled a 60s session at max crowd
quantity with repeated raids and charge/release cycles. No remaining hot path
beyond ordinary per-creature physics/render cost; anime.js instance count
stays bounded (one posAnim per live security unit); no orphaned animations
after despawn. The double-transform-write fix (Task 1) was the actionable
finding — no further changes needed here.
```

If the recording instead surfaces a genuine new hot path (e.g., a specific function dominating frame time that isn't accounted for above), write the finding in the same place instead, describing exactly what was observed and where, so it can be scoped as a follow-up task rather than guessed at now.

- [ ] **Step 4: Commit the findings note**

```bash
git add docs/superpowers/specs/2026-08-16-security-raid-protest-fixes-design.md
git commit -m "docs: record long-session profiling findings for the raid perf pass"
```

---

## Task 13: Full manual QA pass

**Files:** None — verification only, per this project's convention that unit tests don't catch visual/feel regressions.

- [ ] **Step 1: Run the full automated suite one more time**

Run: `npm test`
Expected: PASS (all files)

Run: `npm run build`
Expected: typecheck + production build succeed with no errors.

- [ ] **Step 2: Walk the checklist from the spec's Testing section in the browser**

Run: `npm run dev` and verify, in order:

- **Shake feel**: shake the avatar — a shake now registers noticeably faster/easier than before.
- **Catch behavior**: let a raid run for a while (don't just watch the first few seconds) — confirm security actually despawns creatures over time, not just repelling them.
- **Z-index**: drag the avatar/sticker so it visually overlaps a security unit — the avatar must stay on top.
- **Shadow**: security sprites read as sitting flat on the surface, not floating.
- **Tooltip**: the avatar's drag-hint reads "Drag or Shake Me".
- **Spawn entrance/mix/disperse**: trigger a fresh pulse — units pop in from scale 0 at the avatar's position, in a mix of police/raf, and burst outward before settling into wander.
- **Poof timing**: trigger recovery (via full charge) — each unit visibly shrinks briefly before its poof cloud appears, not vanishing instantly under the cloud.
- **Hold-to-charge/release**: covered in Task 11 Step 7 — re-verify once more after all other changes land, since later tasks touch the same button.
- **Button padding**: Protest button's proportions match the Figma reference (node `189:4623`).

- [ ] **Step 3: Report completion**

No commit for this task — it's a verification pass. If any check fails, return to the relevant task above, fix, and re-run this checklist before considering the plan complete.
