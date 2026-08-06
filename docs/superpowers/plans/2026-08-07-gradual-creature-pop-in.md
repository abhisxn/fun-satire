# Gradual Creature Pop-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make creatures in every mode (eyes, pointedFinger, cockroach, placard) pop in one by
one — scale + fade with a small overshoot "pop" — instead of appearing all at once, across every
path that adds creatures to the grid (initial load, mode switch, respawn, quantity increase).

**Architecture:** Each `Creature` gets a `spawnPopAtMs` timestamp and a `spawnDone` flag. When a
batch of creatures is created, each one is assigned a random pop time within an 1800ms wave
window. `CreatureGrid.update()` (already called every frame) computes a scale/opacity for each
creature from its pop time via a small pure `computeSpawnProgress()` function with an
`easeOutBack` curve, and composes that into the transform string it already builds.

**Tech Stack:** TypeScript, Vitest (`happy-dom` environment), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-07-gradual-creature-pop-in-design.md`

---

## Task 1: Extend `Creature` type and all four creature factories

**Files:**
- Modify: `src/creatures/creatureTypes.ts:1-12`
- Modify: `src/creatures/EyeCreature.ts:54-71`
- Modify: `src/creatures/FingerCreature.ts:30-42`
- Modify: `src/creatures/CockroachCreature.ts:30-42`
- Modify: `src/creatures/PlacardCreature.ts:94-106`
- Test: `tests/unit/creatureFactorySpawnFields.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/creatureFactorySpawnFields.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createEyeCreature } from '../../src/creatures/EyeCreature';
import { createFingerCreature } from '../../src/creatures/FingerCreature';
import { createCockroachCreature } from '../../src/creatures/CockroachCreature';
import { createPlacardCreature } from '../../src/creatures/PlacardCreature';

const TEST_SVG = `<svg viewBox="0 0 115 57"><circle cx="40.25" cy="28.75" r="10"/></svg>`;

describe('creature factories initialize spawn animation fields', () => {
  it('createEyeCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const eye = createEyeCreature(10, 20, 1, TEST_SVG, 'uid');
    expect(eye.spawnPopAtMs).toBe(0);
    expect(eye.spawnDone).toBe(false);
  });

  it('createFingerCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const finger = createFingerCreature(10, 20, 1);
    expect(finger.spawnPopAtMs).toBe(0);
    expect(finger.spawnDone).toBe(false);
  });

  it('createCockroachCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const cockroach = createCockroachCreature(10, 20, 1);
    expect(cockroach.spawnPopAtMs).toBe(0);
    expect(cockroach.spawnDone).toBe(false);
  });

  it('createPlacardCreature defaults spawnPopAtMs to 0 and spawnDone to false', () => {
    const placard = createPlacardCreature(10, 20, 1);
    expect(placard.spawnPopAtMs).toBe(0);
    expect(placard.spawnDone).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureFactorySpawnFields.test.ts`
Expected: FAIL — `expect(eye.spawnPopAtMs).toBe(0)` fails with "received undefined" (the field
doesn't exist yet on any of the four factories' return objects).

- [ ] **Step 3: Add the fields to the `Creature` interface**

In `src/creatures/creatureTypes.ts`, replace the `Creature` interface:

```ts
export interface Creature {
  el: HTMLElement;
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  w: number;
  h: number;
  spawnPopAtMs: number;
  spawnDone: boolean;
}
```

- [ ] **Step 4: Initialize the fields in each factory**

In `src/creatures/EyeCreature.ts`, in the object returned by `createEyeCreature` (currently ends
`...scale, w, h, nextBlink: ..., blinking: false, blinkStart: 0, rotFactor: ...`), add the two
new fields:

```ts
  return {
    el,
    pupil,
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    scale,
    w,
    h,
    spawnPopAtMs: 0,
    spawnDone: false,
    nextBlink: Date.now() + 2000 + Math.random() * 4000,
    blinking: false,
    blinkStart: 0,
    rotFactor: 0.06 + Math.random() * 0.14,
  };
```

In `src/creatures/FingerCreature.ts`, in the object returned by `createFingerCreature`:

```ts
  return {
    el,
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    scale,
    w,
    h,
    spawnPopAtMs: 0,
    spawnDone: false,
  };
```

In `src/creatures/CockroachCreature.ts`, in the object returned by `createCockroachCreature`
(identical shape to `FingerCreature`'s):

```ts
  return {
    el,
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    scale,
    w,
    h,
    spawnPopAtMs: 0,
    spawnDone: false,
  };
```

In `src/creatures/PlacardCreature.ts`, in the object returned by `createPlacardCreature`
(identical shape):

```ts
  return {
    el,
    hx,
    hy,
    x: hx,
    y: hy,
    vx: 0,
    vy: 0,
    scale,
    w,
    h,
    spawnPopAtMs: 0,
    spawnDone: false,
  };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureFactorySpawnFields.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this confirms the `Creature` interface change didn't break any other file
under `src/` that constructs a `Creature`-shaped object literal — the four factories are the only
ones, per the codebase's registry-style creature construction).

- [ ] **Step 7: Commit**

```bash
git add src/creatures/creatureTypes.ts src/creatures/EyeCreature.ts src/creatures/FingerCreature.ts src/creatures/CockroachCreature.ts src/creatures/PlacardCreature.ts tests/unit/creatureFactorySpawnFields.test.ts
git commit -m "feat: add spawn animation fields to Creature type and factories"
```

---

## Task 2: Add `computeSpawnProgress` pure function to `CreatureGrid.ts`

**Files:**
- Modify: `src/creatures/CreatureGrid.ts` (add near the top, after imports)
- Test: `tests/unit/computeSpawnProgress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/computeSpawnProgress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeSpawnProgress, SPAWN_POP_MS } from '../../src/creatures/CreatureGrid';

describe('computeSpawnProgress', () => {
  it('returns scale 0, opacity 0, done false strictly before pop time', () => {
    const result = computeSpawnProgress(1000, 500);
    expect(result).toEqual({ scale: 0, opacity: 0, done: false });
  });

  it('treats t=0 (now equals pop time) as not yet appeared', () => {
    const result = computeSpawnProgress(1000, 1000);
    expect(result).toEqual({ scale: 0, opacity: 0, done: false });
  });

  it('returns scale 1, opacity 1, done true once the pop duration has elapsed', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS);
    expect(result.scale).toBe(1);
    expect(result.opacity).toBe(1);
    expect(result.done).toBe(true);
  });

  it('returns scale 1, opacity 1, done true well after the pop duration', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS * 5);
    expect(result.scale).toBe(1);
    expect(result.opacity).toBe(1);
    expect(result.done).toBe(true);
  });

  it('returns an in-between, not-yet-done state mid-animation', () => {
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS / 2);
    expect(result.done).toBe(false);
    expect(result.opacity).toBeGreaterThan(0);
    expect(result.opacity).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.scale)).toBe(true);
  });

  it('opacity reaches 1 before scale settles (fades in faster than the overshoot settles)', () => {
    // At 70% of the pop duration, opacity's faster ramp (progress / 0.6) should
    // already be clamped to 1, while the eased scale is still resolving.
    const result = computeSpawnProgress(1000, 1000 + SPAWN_POP_MS * 0.7);
    expect(result.opacity).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/computeSpawnProgress.test.ts`
Expected: FAIL — `computeSpawnProgress` is not exported from `CreatureGrid.ts` yet (import error).

- [ ] **Step 3: Add the constants and function**

In `src/creatures/CreatureGrid.ts`, after the existing imports (after the line importing
`createPlacardCreature, getPlacardRotation`) and before the `ModeConfig` interface, add:

```ts
/** Whole batch of creatures finishes appearing within this window (ms). */
export const SPAWN_WAVE_MS = 1800;
/** Duration of one creature's own scale+fade pop animation (ms). */
export const SPAWN_POP_MS = 380;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface SpawnProgress {
  scale: number;
  opacity: number;
  done: boolean;
}

/**
 * Pure function: given when a creature is scheduled to start popping in
 * (spawnPopAtMs) and the current time, returns its visual scale/opacity and
 * whether its pop animation has finished.
 */
export function computeSpawnProgress(spawnPopAtMs: number, nowMs: number): SpawnProgress {
  const t = nowMs - spawnPopAtMs;
  if (t <= 0) {
    return { scale: 0, opacity: 0, done: false };
  }
  if (t >= SPAWN_POP_MS) {
    return { scale: 1, opacity: 1, done: true };
  }
  const progress = t / SPAWN_POP_MS;
  return {
    scale: easeOutBack(progress),
    opacity: Math.min(1, progress / 0.6),
    done: false,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/computeSpawnProgress.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/computeSpawnProgress.test.ts
git commit -m "feat: add computeSpawnProgress easing function to CreatureGrid"
```

---

## Task 3: Assign staggered spawn delays in `spawn()`

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:93-133` (the `spawn` method)
- Test: `tests/unit/creatureGrid.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/creatureGrid.test.ts`, add a new `describe` block (after the existing `describe('spawn', ...)` block, before `describe('switchMode', ...)`). First add `SPAWN_WAVE_MS` to the import line at the top of the file:

```ts
import { CreatureGrid, SPAWN_WAVE_MS } from '../../src/creatures/CreatureGrid';
```

Then add the new tests:

```ts
  describe('spawn — pop-in animation scheduling', () => {
    it('assigns every creature a spawnPopAtMs within the spawn wave window', () => {
      const grid = new CreatureGrid(config);
      const before = Date.now();
      grid.spawn('cockroach');
      const after = Date.now();

      const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      expect(creatures.length).toBeGreaterThan(0);
      for (const c of creatures) {
        expect(c.spawnPopAtMs).toBeGreaterThanOrEqual(before);
        expect(c.spawnPopAtMs).toBeLessThanOrEqual(after + SPAWN_WAVE_MS);
        expect(c.spawnDone).toBe(false);
      }
    });

    it('assigns randomized (non-identical) spawnPopAtMs across creatures', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number }> }).creatures;
      const uniqueTimes = new Set(creatures.map((c) => c.spawnPopAtMs));
      expect(uniqueTimes.size).toBeGreaterThan(1);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureGrid.test.ts`
Expected: FAIL — `spawnPopAtMs` is `0` for every creature (all created via factories with the
default), so `spawnPopAtMs >= before` fails and the uniqueness check fails.

- [ ] **Step 3: Wire delay assignment into `spawn()`**

In `src/creatures/CreatureGrid.ts`, modify the `spawn` method. Current code:

```ts
  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;
    const modeConfig = MODE_CONFIGS[mode];
    const { cols, rows } = this.gridDimsFor(mode, this.targetCount);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;

    for (let i = 0; i < this.targetCount; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const hx = (c + 0.5) * cellW;
      const hy = (r + 0.5) * cellH;
      const scale = modeConfig.scaleFn(hx, hy, vw, vh);
      const uid = `${c}_${r}`;

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
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }
  }
```

Replace with:

```ts
  spawn(mode: CreatureMode): void {
    this.clear();
    this.mode = mode;
    const modeConfig = MODE_CONFIGS[mode];
    const { cols, rows } = this.gridDimsFor(mode, this.targetCount);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;
    const batchStartMs = Date.now();

    for (let i = 0; i < this.targetCount; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const hx = (c + 0.5) * cellW;
      const hy = (r + 0.5) * cellH;
      const scale = modeConfig.scaleFn(hx, hy, vw, vh);
      const uid = `${c}_${r}`;

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
      creature.spawnPopAtMs = batchStartMs + Math.random() * Math.max(0, SPAWN_WAVE_MS - SPAWN_POP_MS);
      creature.spawnDone = false;
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureGrid.test.ts`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGrid.test.ts
git commit -m "feat: stagger creature spawn timing in CreatureGrid.spawn()"
```

---

## Task 4: Assign spawn delays to newly-added creatures in `setQuantity()`

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:140-200` (the `setQuantity` method)
- Test: `tests/unit/creatureGrid.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/creatureGrid.test.ts`, add to the `describe('setQuantity', ...)` block:

```ts
    it('gives newly added creatures a fresh spawn animation without resetting existing ones', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');

      const creatures = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      // Simulate the existing creatures having already finished popping in.
      for (const c of creatures) {
        c.spawnDone = true;
        c.spawnPopAtMs = 1;
      }
      const existingCount = creatures.length;

      const before = Date.now();
      grid.setQuantity(existingCount + 10);
      const after = Date.now();

      const updated = (grid as unknown as { creatures: Array<{ spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      for (let i = 0; i < existingCount; i++) {
        expect(updated[i].spawnDone).toBe(true);
        expect(updated[i].spawnPopAtMs).toBe(1);
      }
      for (let i = existingCount; i < updated.length; i++) {
        expect(updated[i].spawnDone).toBe(false);
        expect(updated[i].spawnPopAtMs).toBeGreaterThanOrEqual(before);
        expect(updated[i].spawnPopAtMs).toBeLessThanOrEqual(after + SPAWN_WAVE_MS);
      }
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureGrid.test.ts`
Expected: FAIL — newly added creatures still have `spawnPopAtMs: 0` / `spawnDone: false` from
the factory default, but the assertion `spawnPopAtMs >= before` fails since `0 < before`.

- [ ] **Step 3: Wire delay assignment into `setQuantity()`'s new-creature branch**

In `src/creatures/CreatureGrid.ts`, in the `setQuantity` method, current code:

```ts
  setQuantity(targetCount: number): void {
    const current = this.creatures.length;
    this.targetCount = targetCount;
    if (targetCount === current) return;

    const modeConfig = MODE_CONFIGS[this.mode];
    const { cols, rows } = this.gridDimsFor(this.mode, targetCount);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;

    if (targetCount < current) {
      const removed = this.creatures.splice(targetCount);
      for (const c of removed) {
        c.el.remove();
        const eyeIdx = this.eyeCreatures.indexOf(c as EyeCreature);
        if (eyeIdx >= 0) this.eyeCreatures.splice(eyeIdx, 1);
      }
    }

    // Reflow every surviving/new creature onto the recomputed grid so the
    // whole layout stays evenly spaced instead of thinning from one edge.
    for (let i = 0; i < targetCount; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const hx = (c + 0.5) * cellW;
      const hy = (r + 0.5) * cellH;

      if (i < this.creatures.length) {
        this.creatures[i].hx = hx;
        this.creatures[i].hy = hy;
        continue;
      }

      const scale = modeConfig.scaleFn(hx, hy, vw, vh);
      const uid = `extra_${i}`;

      let creature: Creature;
      switch (this.mode) {
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
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }
  }
```

Replace the two spots marked below (the `const cellH = vh / rows;` line gets a new line after
it, and the final `this.creatures.push(creature);` block gets two new lines before it):

```ts
  setQuantity(targetCount: number): void {
    const current = this.creatures.length;
    this.targetCount = targetCount;
    if (targetCount === current) return;

    const modeConfig = MODE_CONFIGS[this.mode];
    const { cols, rows } = this.gridDimsFor(this.mode, targetCount);

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const cellW = vw / cols;
    const cellH = vh / rows;
    const batchStartMs = Date.now();

    if (targetCount < current) {
      const removed = this.creatures.splice(targetCount);
      for (const c of removed) {
        c.el.remove();
        const eyeIdx = this.eyeCreatures.indexOf(c as EyeCreature);
        if (eyeIdx >= 0) this.eyeCreatures.splice(eyeIdx, 1);
      }
    }

    // Reflow every surviving/new creature onto the recomputed grid so the
    // whole layout stays evenly spaced instead of thinning from one edge.
    for (let i = 0; i < targetCount; i++) {
      const c = Math.floor(i / rows);
      const r = i % rows;
      const hx = (c + 0.5) * cellW;
      const hy = (r + 0.5) * cellH;

      if (i < this.creatures.length) {
        this.creatures[i].hx = hx;
        this.creatures[i].hy = hy;
        continue;
      }

      const scale = modeConfig.scaleFn(hx, hy, vw, vh);
      const uid = `extra_${i}`;

      let creature: Creature;
      switch (this.mode) {
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
      creature.spawnPopAtMs = batchStartMs + Math.random() * Math.max(0, SPAWN_WAVE_MS - SPAWN_POP_MS);
      creature.spawnDone = false;
      this.creatures.push(creature);
      this.container.appendChild(creature.el);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureGrid.test.ts`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGrid.test.ts
git commit -m "feat: stagger spawn timing for creatures added via setQuantity()"
```

---

## Task 5: Apply pop-in scale/opacity in `update()`

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:202-245` (the `update` method)
- Test: `tests/unit/creatureGrid.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/creatureGrid.test.ts`, add a new `describe` block after the existing
`describe('update', ...)` block:

```ts
  describe('update — pop-in visuals', () => {
    it('renders a not-yet-appeared creature as invisible and unscaled', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      const creature = creatures[0];
      creature.spawnPopAtMs = Date.now() + 5000;
      creature.spawnDone = false;

      grid.update(creature.hx, creature.hy);

      expect(creature.el.style.opacity).toBe('0');
      expect(creature.el.style.transform).toContain('scale(0)');
    });

    it('renders a fully-appeared creature at full scale and opacity, and marks it done', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      const creature = creatures[0];
      creature.spawnPopAtMs = Date.now() - 10000;
      creature.spawnDone = false;

      grid.update(creature.hx, creature.hy);

      expect(creature.el.style.opacity).toBe('1');
      expect(creature.el.style.transform).toContain('scale(1)');
      expect(creature.spawnDone).toBe(true);
    });

    it('does not recompute the animation once a creature is marked done', () => {
      const grid = new CreatureGrid(config);
      grid.spawn('cockroach');
      const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      const creature = creatures[0];
      creature.spawnPopAtMs = Date.now() - 10000;
      grid.update(creature.hx, creature.hy);
      expect(creature.spawnDone).toBe(true);

      // If update() re-ran the animation instead of respecting spawnDone,
      // this "future" pop time would make the creature invisible again.
      creature.spawnPopAtMs = Date.now() + 10000;
      grid.update(creature.hx, creature.hy);

      expect(creature.el.style.opacity).toBe('1');
    });

    it('composes pop-in scale with blink scaleY for eyes mode', () => {
      const grid = new CreatureGrid({ ...config, mode: 'eyes' });
      grid.spawn('eyes');
      const creatures = (grid as unknown as { creatures: Array<{ el: HTMLElement; hx: number; hy: number; spawnPopAtMs: number; spawnDone: boolean }> }).creatures;
      const creature = creatures[0];
      creature.spawnPopAtMs = Date.now() - 10000;
      creature.spawnDone = false;

      grid.update(creature.hx, creature.hy);

      expect(creature.el.style.transform).toMatch(/scale\(1\).*scaleY\(/);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureGrid.test.ts`
Expected: FAIL — `update()` doesn't touch `el.style.opacity` yet (stays `''`, not `'0'`/`'1'`),
and the transform strings don't contain a `scale(...)` term for non-eye creatures, or a
`scale(1) ... scaleY(...)` composition for eyes.

- [ ] **Step 3: Wire spawn animation into `update()`**

In `src/creatures/CreatureGrid.ts`, first add the import for `computeSpawnProgress` — it's
defined in this same file (Task 2), so no new import is needed.

Current `update` method:

```ts
  update(avatarX: number, avatarY: number): void {
    const avatar = { x: avatarX, y: avatarY };

    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams);
    }

    if (this.mode === 'eyes') {
      const vw = this.container.clientWidth || window.innerWidth;
      for (const eye of this.eyeCreatures) {
        updateEyePupil(eye, avatarX, avatarY);
        const scaleY = updateEyeBlink(eye);
        const dx = avatarX - eye.x;
        const dy = avatarY - eye.y;
        // Base the angle on the right-half quadrant's large-magnitude form
        // (dx pinned negative) so both left and right get the same tilt
        // range, then mirror the sign for the left half so it fans out
        // symmetrically instead of going flat.
        const halfSign = eye.x < vw / 2 ? -1 : 1;
        const angleRad = Math.atan2(dy, -Math.abs(dx));
        const fullAngle = angleRad * (180 / Math.PI);
        const rotation = fullAngle * eye.rotFactor * halfSign;
        eye.el.style.transform = `translate(${eye.x - eye.w / 2}px,${eye.y - eye.h / 2}px) rotate(${rotation}deg) scaleY(${scaleY})`;
      }
    } else {
      for (const c of this.creatures) {
        let angle: number;
        switch (this.mode) {
          case 'pointedFinger':
            angle = getFingerRotation(c, avatarX, avatarY);
            break;
          case 'cockroach':
            angle = getCockroachRotation(c, avatarX, avatarY);
            break;
          case 'placard':
            angle = getPlacardRotation(c, avatarX, avatarY);
            break;
          default:
            angle = 0;
        }
        c.el.style.transform = `translate(${c.x - c.w * 0.5}px,${c.y - c.h * 0.5}px) rotate(${angle}deg)`;
      }
    }
  }
```

Replace with:

```ts
  update(avatarX: number, avatarY: number): void {
    const avatar = { x: avatarX, y: avatarY };
    const now = Date.now();

    for (const c of this.creatures) {
      updateCreature(c, avatar, this.physicsParams);
    }

    if (this.mode === 'eyes') {
      const vw = this.container.clientWidth || window.innerWidth;
      for (const eye of this.eyeCreatures) {
        updateEyePupil(eye, avatarX, avatarY);
        const scaleY = updateEyeBlink(eye);
        const dx = avatarX - eye.x;
        const dy = avatarY - eye.y;
        // Base the angle on the right-half quadrant's large-magnitude form
        // (dx pinned negative) so both left and right get the same tilt
        // range, then mirror the sign for the left half so it fans out
        // symmetrically instead of going flat.
        const halfSign = eye.x < vw / 2 ? -1 : 1;
        const angleRad = Math.atan2(dy, -Math.abs(dx));
        const fullAngle = angleRad * (180 / Math.PI);
        const rotation = fullAngle * eye.rotFactor * halfSign;

        let popScale = 1;
        let opacity = 1;
        if (!eye.spawnDone) {
          const spawnState = computeSpawnProgress(eye.spawnPopAtMs, now);
          popScale = spawnState.scale;
          opacity = spawnState.opacity;
          eye.spawnDone = spawnState.done;
        }

        eye.el.style.opacity = String(opacity);
        eye.el.style.transform = `translate(${eye.x - eye.w / 2}px,${eye.y - eye.h / 2}px) rotate(${rotation}deg) scale(${popScale}) scaleY(${scaleY})`;
      }
    } else {
      for (const c of this.creatures) {
        let angle: number;
        switch (this.mode) {
          case 'pointedFinger':
            angle = getFingerRotation(c, avatarX, avatarY);
            break;
          case 'cockroach':
            angle = getCockroachRotation(c, avatarX, avatarY);
            break;
          case 'placard':
            angle = getPlacardRotation(c, avatarX, avatarY);
            break;
          default:
            angle = 0;
        }

        let popScale = 1;
        let opacity = 1;
        if (!c.spawnDone) {
          const spawnState = computeSpawnProgress(c.spawnPopAtMs, now);
          popScale = spawnState.scale;
          opacity = spawnState.opacity;
          c.spawnDone = spawnState.done;
        }

        c.el.style.opacity = String(opacity);
        c.el.style.transform = `translate(${c.x - c.w * 0.5}px,${c.y - c.h * 0.5}px) rotate(${angle}deg) scale(${popScale})`;
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureGrid.test.ts`
Expected: PASS (all tests, including the four new ones)

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: all tests pass (no regressions in other files, e.g. `eyeCreature.test.ts`,
`creaturePhysics.test.ts`, `hud.test.ts`).

- [ ] **Step 6: Typecheck and build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/creatures/CreatureGrid.ts tests/unit/creatureGrid.test.ts
git commit -m "feat: animate creature pop-in scale and opacity in CreatureGrid.update()"
```

---

## Task 6: Manual verification in the browser

Per this project's CLAUDE.md, changes touching rendering must be checked in a real browser
before being considered complete — unit tests don't catch visual/feel regressions.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify initial load**

Open the app in a browser. Confirm creatures pop in one by one (scale+fade with a slight
overshoot) rather than all appearing simultaneously, and that the full crowd is on screen within
roughly 2 seconds.

- [ ] **Step 3: Verify mode switch**

Switch between all four creature modes (eyes, pointed finger, cockroach, placard) via the HUD.
Confirm each switch clears the old crowd and pops in the new one — no instant full-crowd
appearance, no stuck half-scale/half-opacity creatures left over from the previous mode.

- [ ] **Step 4: Verify quantity slider increase**

Increase the quantity slider. Confirm the newly added creatures pop in individually, while the
existing crowd stays fully visible and undisturbed (no flicker/reset of already-visible
creatures).

- [ ] **Step 5: Verify rapid interaction (interrupt behavior)**

Quickly switch modes multiple times in succession while pop-in waves are still in progress.
Confirm there's no visual glitch (e.g. permanently invisible or stuck-mid-scale creatures) — each
switch should cleanly restart the wave for the new mode.

- [ ] **Step 6: Verify quantity decrease still instant**

Decrease the quantity slider. Confirm removal is still instant (no animation expected here, per
spec's "out of scope" section).

- [ ] **Step 7: Report result**

If all checks pass, the feature is complete. If anything looks off, note the specific mode/action
and what was observed before moving on.

---

## Task 7: CSS hygiene — move static wrapper styles to global CSS

Moves the static presentational styles the four creature factories currently set inline
(`position: absolute`, `pointer-events: none`, `will-change: transform`) into the existing
global `#stage > .wrap` rule in `index.html`. Per-frame dynamic values stay inline — they are
computed per creature per frame and cannot live in static CSS:
- `width` / `height`: derived from each creature's randomized scale.
- `opacity` / `transform`: written every frame by the pop-in animation in `update()`.

**Files:**
- Modify: `index.html` (`#stage > .wrap` rule)
- Modify: `src/creatures/EyeCreature.ts`, `src/creatures/FingerCreature.ts`,
  `src/creatures/CockroachCreature.ts`, `src/creatures/PlacardCreature.ts`
- Test: `tests/unit/creatureCssHygiene.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/creatureCssHygiene.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createEyeCreature } from '../../src/creatures/EyeCreature';
import { createFingerCreature } from '../../src/creatures/FingerCreature';
import { createCockroachCreature } from '../../src/creatures/CockroachCreature';
import { createPlacardCreature } from '../../src/creatures/PlacardCreature';

const TEST_SVG = `<svg viewBox="0 0 115 57"><circle cx="40.25" cy="28.75" r="10"/></svg>`;

describe('creature factories keep static styles in global CSS', () => {
  it('uses the shared wrap class instead of inlining static presentational styles', () => {
    const creatures = [
      createEyeCreature(10, 20, 1, TEST_SVG, 'uid'),
      createFingerCreature(10, 20, 1),
      createCockroachCreature(10, 20, 1),
      createPlacardCreature(10, 20, 1),
    ];
    for (const c of creatures) {
      expect(c.el.className).toBe('wrap');
      expect(c.el.style.position).toBe('');
      expect(c.el.style.pointerEvents).toBe('');
      expect(c.el.style.willChange).toBe('');
      expect(c.el.style.width).not.toBe('');
      expect(c.el.style.height).not.toBe('');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/creatureCssHygiene.test.ts`
Expected: FAIL — factories still inline `position` / `pointerEvents` / `willChange`.

- [ ] **Step 3: Implement**

In `index.html`, replace:

```css
      #stage > .wrap {
        z-index: 300;
      }
```

with:

```css
      #stage > .wrap {
        position: absolute;
        pointer-events: none;
        will-change: transform;
        z-index: 300;
      }
```

In each of the four factories, delete the three static style lines
(`el.style.position = 'absolute';`, `el.style.pointerEvents = 'none';`,
`el.style.willChange = 'transform';`). Keep `width`/`height` (per-creature) and the inner
`img`/`svg` sizing inline.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/creatureCssHygiene.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and full suite**

Run: `npx tsc --noEmit`, then `npm test`
Expected: no new failures (the known 7 pre-existing failures in draggableAvatar/filterPanel may remain).

- [ ] **Step 6: Commit**

```bash
git add index.html src/creatures/EyeCreature.ts src/creatures/FingerCreature.ts src/creatures/CockroachCreature.ts src/creatures/PlacardCreature.ts tests/unit/creatureCssHygiene.test.ts
git commit -m "refactor: move static creature wrapper styles to global CSS"
```

---

## Post-implementation

All tasks above produce working, independently-testable increments. Once Task 6's manual
verification passes, the feature is done — no further cleanup tasks are needed.
