# Raid/Protest v2 Implementation Plan — Tasks 5-6

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues from Task 4.

## Task 5: Despawn source rework — security repel-only, time-based attrition

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:12-18,54-57,228,248,257-258,268,501-532`
- Modify: `src/creatures/RaidController.ts:80,182-194,159-180`
- Test: `tests/unit/creatureGrid.test.ts:357-475`
- Test: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Write the failing tests in creatureGrid.test.ts**

In `tests/unit/creatureGrid.test.ts`, replace the entire `describe('security units', ...)` block (lines 357-475) with:

```ts
  describe('security units', () => {
    it('never removes a creature, even when a security unit sits exactly on top of it', () => {
      const grid = new CreatureGrid({ ...config, initialQuantity: 20 });
      grid.spawn('cockroach');
      const before = grid.getCreatureCount();

      const target = (grid as unknown as { creatures: { x: number; y: number }[] }).creatures[0]!;
      const securityUnits = [{ x: target.x, y: target.y, repelRadius: 160 }];

      for (let i = 0; i < 10; i++) {
        grid.update(-1000, -1000, securityUnits, 0);
      }

      expect(grid.getCreatureCount()).toBe(before);
    });

    it('repels creatures away from a security unit like it does the avatar', () => {
      const grid = new CreatureGrid({ ...config, initialQuantity: 20 });
      grid.spawn('cockroach');

      const target = (grid as unknown as { creatures: { x: number; y: number; vx: number }[] }).creatures[0]!;
      const startVx = target.vx;
      const securityUnits = [{ x: target.x - 50, y: target.y, repelRadius: 160 }];

      // Avatar far away so only the security unit's repulsion is in play.
      grid.update(-5000, -5000, securityUnits, 20);

      expect(target.vx).not.toBe(startVx);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- creatureGrid -t "security units"`
Expected: The new "never removes a creature" test FAILs (the current catch-check block still removes the on-top creature). TypeScript also errors on the `SecurityUnit` object literals — they're missing `catchRadius`, which is still a required field on the interface at this point.

- [ ] **Step 3: Remove the catch mechanic from CreatureGrid**

In `src/creatures/CreatureGrid.ts`, remove `catchRadius` from the `SecurityUnit` interface (around line 60-65):

```ts
/** A wandering security sprite's current position and its two effect radii. */
export interface SecurityUnit {
  x: number;
  y: number;
  repelRadius: number;
  catchRadius: number;
}
```

becomes:

```ts
/** A security sprite's current position and the radius it repels the crowd within. */
export interface SecurityUnit {
  x: number;
  y: number;
  repelRadius: number;
}
```

Remove the now-unused constants (around lines 54-57):

```ts
/** How often the catch-radius check runs against security units (ms). */
export const CATCH_CHECK_INTERVAL_MS = 400;
/** Max creatures a single security unit can catch per check interval. */
export const CATCH_MAX_PER_UNIT_PER_TICK = 3;
```

Delete both lines entirely.

Remove `onCreatureTerminated` from the config interface (around line 224-229):

```ts
export interface CreatureGridConfig {
  container: HTMLElement;
  mode: CreatureMode;
  initialQuantity?: number;
  onCreatureTerminated?: (x: number, y: number, w: number, h: number) => void;
}
```

becomes:

```ts
export interface CreatureGridConfig {
  container: HTMLElement;
  mode: CreatureMode;
  initialQuantity?: number;
}
```

Remove the private field (around line 257) and its constructor assignment (around line 268):

```ts
  private onCreatureTerminated: ((x: number, y: number, w: number, h: number) => void) | null = null;
```

Delete this line. And in the constructor:

```ts
    this.onCreatureTerminated = config.onCreatureTerminated ?? null;
```

Delete this line.

Remove `private lastCatchPickMs: number = 0;` (around line 248) entirely.

Finally, delete the entire catch-check block inside `update()` (the block starting with the comment `// Security catch: throttled pass that permanently removes creatures` and ending just before the `// Demand-driven respawn:` comment, roughly lines 501-532):

```ts
    // Security catch: throttled pass that permanently removes creatures
    // caught within a security unit's tight catchRadius, down to raidFloor.
    // Kept separate from the fade/respawn cycle below — a catch is a
    // permanent removal, not a temporary despawn that repop can undo. Must
    // run before the demand-driven respawn block: repop can revive a
    // waitingRespawn creature within this same tick, and a creature must
    // not be catchable in the instant it reappears — this ordering
    // evaluates catch eligibility on each creature's state as it stood at
    // the start of the tick.
    if (securityUnits.length > 0 && this.shouldRunThrottled(this.lastCatchPickMs, CATCH_CHECK_INTERVAL_MS, now)) {
      this.lastCatchPickMs = now;
      for (const unit of securityUnits) {
        if (this.targetCount <= raidFloor) break;
        let caughtThisUnit = 0;
        for (let i = this.creatures.length - 1; i >= 0 && caughtThisUnit < CATCH_MAX_PER_UNIT_PER_TICK; i--) {
          if (this.targetCount <= raidFloor) break;
          const c = this.creatures[i]!;
          if (c.fadeStartMs !== 0 || c.waitingRespawn) continue;
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

Delete this entire block (the `raidFloor` parameter to `update()` stays — it's still used by `RaidController` for other purposes and removing it isn't in scope here).

- [ ] **Step 4: Update main.ts's grid construction (onCreatureTerminated no longer exists)**

In `src/main.ts`, remove the `onCreatureTerminated` callback from the `CreatureGrid` config (around lines 41-50):

```ts
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

becomes:

```ts
  const grid = new CreatureGrid({
    container,
    mode: "cockroach",
    initialQuantity: ONBOARDING_CREATURE_QUANTITY,
  });
```

- [ ] **Step 5: Run the creatureGrid tests to verify they pass**

Run: `npm test -- creatureGrid`
Expected: PASS

- [ ] **Step 6: Add the attrition drain to RaidController**

In `src/creatures/RaidController.ts`, remove the now-unused constant (around line 80):

```ts
/** Tight radius within which a security unit catches (permanently removes) a creature. */
export const SECURITY_CATCH_RADIUS = 50;
```

Delete this line. Add new constants near the other raid-timing constants (after `RAID_FLOOR_FRACTION`):

```ts
/** How often the raid drains the crowd toward the raid floor while unaddressed (ms). */
export const RAID_ATTRITION_INTERVAL_MS = 400;
/** How many creatures the crowd loses per attrition tick. */
export const RAID_ATTRITION_STEP = 1;
```

Add a new private field alongside the other `lastXAtMs` fields:

```ts
  private lastAttritionAtMs = 0;
```

In `getSecurityUnits()`, remove `catchRadius` from the mapped object:

```ts
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

becomes:

```ts
  getSecurityUnits(): SecurityUnit[] {
    const now = Date.now();
    return this.units.map((u) => ({
      x: u.x,
      y: u.y,
      repelRadius:
        u.phase === "shrinking"
          ? SECURITY_REPEL_RADIUS * computeSecurityShrinkFraction(u.phaseStartMs, now)
          : SECURITY_REPEL_RADIUS,
    }));
  }
```

In `spawnPulse()`, reset the attrition timer whenever a fresh raid starts (so a new raid doesn't inherit stale timing from a previous one):

```ts
  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
      this.grid.setAvatarRepelRadius(null);
    }
```

becomes:

```ts
  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
      this.lastAttritionAtMs = 0;
      this.grid.setAvatarRepelRadius(null);
    }
```

Finally, in `tick(nowMs)`, add the attrition drain right after the shrink-sweep loop and before the `if (this.state === "recovering")` check:

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
      this.lastAttritionAtMs = nowMs;
      const floor = this.getRaidFloor();
      const current = this.grid.getCreatureCount();
      if (current > floor) {
        this.grid.setQuantity(current - RAID_ATTRITION_STEP);
      }
    }

    if (this.state === "recovering") {
```

- [ ] **Step 7: Write failing tests for the attrition drain**

In `tests/unit/raidController.test.ts`, add this test inside `describe('RaidController', ...)`, after the `'getRaidFloor is QTY_MIN while idle...'` test:

```ts
  it('drains the crowd toward the raid floor over time while raiding, without a charge held', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const raidStartCrowd = grid.getCreatureCount();
    const floor = raid.getRaidFloor();

    for (let i = 0; i < 50; i++) {
      t += 400; // RAID_ATTRITION_INTERVAL_MS
      raid.tick(t);
    }

    expect(grid.getCreatureCount()).toBeLessThan(raidStartCrowd);
    expect(grid.getCreatureCount()).toBeGreaterThanOrEqual(floor);

    now.mockRestore();
  });

  it('attrition stops exactly at the raid floor and never removes below it', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }
    const floor = raid.getRaidFloor();

    for (let i = 0; i < 200; i++) {
      t += 400;
      raid.tick(t);
    }

    expect(grid.getCreatureCount()).toBe(floor);

    now.mockRestore();
  });
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS (all existing and new RaidController tests).

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS, no new failures beyond the pre-existing known-unrelated baseline (confirm by comparing failure count/names to `git log` — the same 17 pre-existing failures from the prior plan's final state should be the only ones).

- [ ] **Step 10: Commit**

```bash
git add src/creatures/CreatureGrid.ts src/creatures/RaidController.ts src/main.ts tests/unit/creatureGrid.test.ts tests/unit/raidController.test.ts
git commit -m "feat: security repels instead of catching; crowd drains via time-based raid attrition"
```

---

## Task 6: Throttle charge-driven crowd rebuild

**Files:**
- Modify: `src/creatures/RaidController.ts:206-218,290-314`
- Test: `tests/unit/raidController.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/raidController.test.ts`, add this test inside `describe('charge/release protest mechanic', ...)`, after the `'charges progressively while held...'` test:

```ts
    it('throttles the crowd-rebuild setQuantity calls during charge instead of calling every frame', () => {
      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaid(now, tRef);

      const setQuantitySpy = vi.spyOn(grid, 'setQuantity');
      raid.startCharging();
      setQuantitySpy.mockClear();

      // Simulate 10 frames within a single throttle window (well under
      // CHARGE_QUANTITY_THROTTLE_MS apart) — only the first should call
      // through to setQuantity.
      for (let i = 0; i < 10; i++) {
        tRef.t += 5;
        raid.tick(tRef.t);
      }

      expect(setQuantitySpy).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- raidController -t "throttles the crowd-rebuild"`
Expected: FAIL — `setQuantitySpy` is called 10 times (once per `tick()` call), since the current implementation calls `grid.setQuantity(rebuilt)` unconditionally every tick.

- [ ] **Step 3: Add the throttle**

In `src/creatures/RaidController.ts`, add a new constant after `CHARGE_DURATION_MS`:

```ts
/** How often the charge-driven crowd rebuild calls grid.setQuantity() (ms) — throttled
 * so CreatureGrid's own layout-reflow spring force has time to converge between calls,
 * instead of being replaced every single frame (see the clustering-bug writeup in the
 * v2 design spec). */
export const CHARGE_QUANTITY_THROTTLE_MS = 200;
```

Add a new private field alongside the other charge-related fields:

```ts
  private lastChargeQuantityAtMs = 0;
```

In `startCharging()`, reset it:

```ts
  startCharging(): void {
    if (this.state !== "raiding") return;
    this.state = "charging";
    this.chargeStartAtMs = Date.now();
    this.chargeBaselineUnitCount = this.units.length;
    this.chargeBaselineTargetCount = this.grid.getCreatureCount();
    this.chargeFraction = 0;
  }
```

becomes:

```ts
  startCharging(): void {
    if (this.state !== "raiding") return;
    this.state = "charging";
    this.chargeStartAtMs = Date.now();
    this.chargeBaselineUnitCount = this.units.length;
    this.chargeBaselineTargetCount = this.grid.getCreatureCount();
    this.chargeFraction = 0;
    this.lastChargeQuantityAtMs = 0;
  }
```

In `tick()`, wrap the `rebuilt`/`setQuantity` call in the throttle check:

```ts
    const rebuilt = Math.round(
      this.chargeBaselineTargetCount + (QTY_MAX - this.chargeBaselineTargetCount) * fraction,
    );
    this.grid.setQuantity(rebuilt);
```

becomes:

```ts
    if (nowMs - this.lastChargeQuantityAtMs >= CHARGE_QUANTITY_THROTTLE_MS) {
      this.lastChargeQuantityAtMs = nowMs;
      const rebuilt = Math.round(
        this.chargeBaselineTargetCount + (QTY_MAX - this.chargeBaselineTargetCount) * fraction,
      );
      this.grid.setQuantity(rebuilt);
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- raidController`
Expected: PASS — including the existing `'charges progressively while held...'` test, since its two `tick()` calls are spaced 900ms apart (well over the 200ms throttle) and still land the final `setQuantity(QTY_MAX)` call at completion.

- [ ] **Step 5: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "perf: throttle charge-driven crowd rebuild instead of calling setQuantity every frame"
```

---


---

Continued in [2026-08-16-raid-protest-v2-task-7.md](2026-08-16-raid-protest-v2-task-7.md).
