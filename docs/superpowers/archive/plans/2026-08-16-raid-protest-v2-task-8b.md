# Raid/Protest v2 Implementation Plan — Task 8 (continued)

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues Task 8 from [2026-08-16-raid-protest-v2-task-8.md](2026-08-16-raid-protest-v2-task-8.md) (SecurityCreature.ts's escort/collision support is done — this half wires it into RaidController).


- [ ] **Step 5: Wire escort + collisions into RaidController**

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
  assignEscortFormation,
  applyEscortStep,
  applySecurityCollisions,
  SECURITY_SHRINK_MS,
} from "./SecurityCreature";
```

In `spawnPulse()`, replace the wander call and add formation re-assignment:

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
    assignEscortFormation(this.units);
  }
```

In `releaseCharge()`, same rename plus formation re-assignment:

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
      assignEscortFormation(this.units);
    }
```

In `tick(nowMs)`, add the per-frame escort step and collision pass right after the shrink-sweep loop (before the attrition block added in Task 5):

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
      applyEscortStep(unit, this.lastAvatarX, this.lastAvatarY, nowMs);
    }
    applySecurityCollisions(this.units);

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

    expect(units[0]!.x).toBeGreaterThan(startX);

    now.mockRestore();
  });

  it('keeps escorting security units apart from each other (no overlap)', () => {
    const now = vi.spyOn(Date, 'now');
    let t = 0;
    now.mockImplementation(() => t);

    const xs = [0, 60, 0, 60, 0, 60, 0];
    for (const x of xs) {
      raid.onAvatarMove(x, 0);
      t += 20;
    }

    const units = (raid as unknown as { units: { phase: string; x: number; y: number }[] }).units;
    // Force them all onto the exact same point, past their entrance burst —
    // an adversarial worst case for the collision pass.
    for (const unit of units) {
      unit.phase = 'wandering';
      unit.x = 500;
      unit.y = 500;
    }

    for (let i = 0; i < 30; i++) {
      t += 16;
      raid.tick(t);
    }

    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const dist = Math.hypot(units[j]!.x - units[i]!.x, units[j]!.y - units[i]!.y);
        expect(dist).toBeGreaterThan(0);
      }
    }

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
git commit -m "feat: security escorts the avatar with natural wobble and mutual collision avoidance"
```

- [ ] **Step 10: Manual verification (human testing)**

Run `npm run dev`, trigger a raid, and drag the avatar around. Confirm: security units ring the avatar and follow it as it moves; the formation has a loose, slightly irregular, gently wobbling feel rather than looking like a rigid frozen ring or a perfect circular orbit; and units visibly push apart from each other and never overlap or pass through one another (or the avatar) as they jostle for position.

---

Continued in [2026-08-16-raid-protest-v2-task-9.md](2026-08-16-raid-protest-v2-task-9.md).
