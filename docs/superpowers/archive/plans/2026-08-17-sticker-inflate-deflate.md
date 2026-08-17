# Sticker Inflate/Deflate: Continuous Crowd-Pressure Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: superpowers:using-git-worktrees (create the lane worktrees), superpowers:dispatching-parallel-agents (launch Phase 1's two lanes concurrently), superpowers:subagent-driven-development (fresh subagent + two-stage review per task, within each lane and for Phase 2). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sticker's two discrete scale-update call sites (`onProtestBackfireSettled`, `onProtestWin`) with a single continuous signal (`onCrowdSizeChanged`) driven off `RaidController.tick()`'s live security-unit count, so the sticker's inflate/deflate visibly tracks the raid in real time instead of freezing between settle events.

**Architecture:** `RaidController` gains two new callbacks — `onCrowdSizeChanged(count)`, fired once per actual change to `this.units.length` (checked at the end of every `tick()` and once after `spawnPulse()`'s synchronous burst), and `onRaidStart()`, fired at the idle→raiding transition. `onProtestBackfireSettled` is removed — its only consumer (setting sticker scale) is superseded. `StickerOverlay` gains a `locked` flag so `setScaleForRaidSize()` safely no-ops while a win's shrink is in effect, and an `unlock()` method to release it. `main.ts` rewires its callback registrations accordingly.

**Tech Stack:** TypeScript, Vitest (`happy-dom` environment for DOM-touching suites).

**Spec:** `docs/superpowers/specs/2026-08-17-sticker-inflate-deflate-design.md`

## Global Constraints

- No change to power-band thresholds, boost formulas, or backfire escalation math in `RaidController`.
- No change to the linear `[1, MAX_SCALE]` mapping shape, `SQUEEZE_MIN_SCALE` (0.55), `MAX_SCALE` (2), or the CSS transition (`SQUEEZE_TRANSITION`, 1s `cubic-bezier(0.4,0,0.2,1)`).
- No change to charging-state behavior — the sticker must never visibly react while a charge is held. (Falls out for free: no units spawn/despawn during `state === 'charging'`.)
- Every module stays a pure export; side effects live only in `src/main.ts` (per project CLAUDE.md).

---

## Execution Model: phased, worktree-based, parallel lanes

This plan has 3 tasks with the following dependency shape:

```text
Task 1 (RaidController.ts + its test)   ─┐
                                          ├─→ Task 3 (main.ts, integration)
Task 2 (StickerOverlay.ts + its test)   ─┘
```

Task 1 and Task 2 touch **completely disjoint files** — one modifies `src/creatures/RaidController.ts` and `tests/unit/raidController.test.ts`, the other `src/creatures/StickerOverlay.ts` and `tests/unit/stickerOverlay.test.ts`. Neither reads the other's output. They are safe to build **simultaneously, in separate worktrees, by separate subagents.** Task 3 only wires the two new/changed public APIs (`RaidControllerConfig.onCrowdSizeChanged`/`onRaidStart`, `StickerOverlay.unlock()`) together in `main.ts`, so it cannot start until both lanes have landed.

This repo already uses exactly this pattern for parallel feature work (see `.worktrees/v2-phase-b-lane-1..4`, branches `v2/phase-b/lane-N-*`) — follow the same convention here.

**Phase 1 — parallel lanes (dispatch both together via superpowers:dispatching-parallel-agents):**

| Lane | Worktree | Branch | Task |
|---|---|---|---|
| A | `.worktrees/sticker-inflate-deflate-lane-1-raid-controller` | `sticker-inflate-deflate/lane-1-raid-controller` | Task 1 |
| B | `.worktrees/sticker-inflate-deflate-lane-2-sticker-overlay` | `sticker-inflate-deflate/lane-2-sticker-overlay` | Task 2 |

For each lane:
1. Create the worktree/branch via superpowers:using-git-worktrees, branched from this plan's base branch (`worktree-security-raid-protest`).
2. Dispatch a subagent (superpowers:subagent-driven-development) to execute that lane's task inline, in its own worktree — all of that task's Steps (write failing tests → verify fail → implement → verify pass → typecheck → commit) happen there, ending with a commit on the lane's branch.
3. Run the two-stage review (implementation review, then a fresh-eyes second review) on each lane's diff before it's considered done — standard subagent-driven-development gate, applied independently per lane.
4. Once both lanes are reviewed and green, merge both branches into the base branch (`worktree-security-raid-protest`) — order doesn't matter, the file sets don't overlap, so there is no merge conflict to resolve between them.

**Phase 2 — integration (sequential, runs in the base worktree after Phase 1 merges):**

Task 3 depends on both lanes' merged output (`onCrowdSizeChanged`/`onRaidStart` must exist on `RaidControllerConfig`, `unlock()` must exist on `StickerOverlay`) and touches a third, shared file (`main.ts`) that both lanes' work flows into — so it runs by itself, after the merge, not as a third parallel lane. Dispatch one subagent for it (superpowers:subagent-driven-development), then run its own two-stage review.

Do not start Phase 2 until Phase 1's two branches are both merged into the base worktree — `main.ts`'s edit in Task 3 assumes both new APIs already compile.

---

## Phase 1 · Lane A — Task 1: RaidController — add onCrowdSizeChanged / onRaidStart, remove onProtestBackfireSettled

**Worktree:** `.worktrees/sticker-inflate-deflate-lane-1-raid-controller` · **Branch:** `sticker-inflate-deflate/lane-1-raid-controller`

**Files:**
- Modify: `src/creatures/RaidController.ts`
- Test: `tests/unit/raidController.test.ts`

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `RaidControllerConfig.onCrowdSizeChanged?: (securityUnitCount: number) => void`, `RaidControllerConfig.onRaidStart?: () => void` — both consumed by Task 3 (main.ts). `RaidControllerConfig.onProtestBackfireSettled` is removed (no longer exists on the type).

- [ ] **Step 1: Write the failing tests**

Open `tests/unit/raidController.test.ts`. Replace the entire `describe('onProtestWin / onProtestBackfireSettled timing', ...)` block's three `onProtestBackfireSettled` tests (currently the tests named `'onProtestBackfireSettled fires immediately for a fresh raid (no prior raid to poof)'`, `'onProtestBackfireSettled does NOT fire at releaseCharge() for an active-raid backfire — only once every queued respawn has fired'`, and `'a full-power win cancels a still-pending backfire settle — onProtestBackfireSettled never fires for it'`) with the following, and rename the `describe` block. Keep the two existing `onProtestWin` tests (`'onProtestWin fires immediately for a standalone win (nothing to despawn)'` and `'onProtestWin does NOT fire at releaseCharge() for a raid win — only once the despawn sweep finishes'`) and the `triggerRaidOn` helper exactly as they are.

Rename:
```ts
  describe('onProtestWin / onProtestBackfireSettled timing', () => {
```
to:
```ts
  describe('onProtestWin / onCrowdSizeChanged / onRaidStart timing', () => {
```

Then replace the three `onProtestBackfireSettled` tests (everything from `it('onProtestBackfireSettled fires immediately...` through the end of `it('a full-power win cancels a still-pending backfire settle...`, i.e. lines 875–947 in the current file) with:

```ts
    it('onRaidStart fires exactly once at the idle->raiding transition, not on later pulses within the same raid', () => {
      const onRaidStart = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onRaidStart });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      expect(onRaidStart).toHaveBeenCalledTimes(1);

      // A second shake mid-raid spawns more units but must not re-fire onRaidStart.
      tRef.t += SHAKE_PULSE_COOLDOWN_MS;
      triggerRaidOn(r, now, tRef);
      expect(onRaidStart).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('onCrowdSizeChanged fires exactly once when a raid spawns, and not again on ticks where nothing changed', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);

      expect(onCrowdSizeChanged).toHaveBeenCalledTimes(1);
      expect(onCrowdSizeChanged).toHaveBeenCalledWith(r.getSecurityUnits().length);

      // Ticking forward with nothing pending (no respawns, no shrink sweep) must
      // not re-fire — the count genuinely hasn't changed.
      tRef.t += 50;
      r.tick(tRef.t);
      expect(onCrowdSizeChanged).toHaveBeenCalledTimes(1);

      now.mockRestore();
    });

    it('onCrowdSizeChanged fires again as a backfire\'s staggered respawns trickle in, once per arrival', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      const afterSpawnCalls = onCrowdSizeChanged.mock.calls.length;

      r.startCharging();
      tRef.t += Math.round(CHARGE_SWEEP_HALF_PERIOD_MS * 0.5); // MEDIUM power
      r.tick(tRef.t);
      r.releaseCharge();

      // The poof itself doesn't remove anything from `units` synchronously (units
      // only leave once their staggered shrink window elapses in tick()), so no
      // new call yet from the release itself.
      expect(onCrowdSizeChanged.mock.calls.length).toBe(afterSpawnCalls);

      // Advance past the poof's shrink window, the respawn delay, and every
      // staggered respawn slot — each arrival should have produced its own call.
      tRef.t += SECURITY_SHRINK_MS + BACKFIRE_RESPAWN_DELAY_MS + BACKFIRE_RESPAWN_STAGGER_MS * 10;
      r.tick(tRef.t);

      expect(onCrowdSizeChanged.mock.calls.length).toBeGreaterThan(afterSpawnCalls);
      expect(onCrowdSizeChanged).toHaveBeenLastCalledWith(r.getSecurityUnits().length);

      now.mockRestore();
    });

    it('onCrowdSizeChanged fires as a win\'s despawn sweep removes units one at a time, down to 0', () => {
      const onCrowdSizeChanged = vi.fn();
      const r = new RaidController({ container, grid, avatarLayer: container, onCrowdSizeChanged });

      const now = vi.spyOn(Date, 'now');
      const tRef = { t: 0 };
      triggerRaidOn(r, now, tRef);
      const spawned = r.getSecurityUnits().length;

      r.startCharging();
      tRef.t += CHARGE_SWEEP_HALF_PERIOD_MS; // peak
      r.tick(tRef.t);
      r.releaseCharge();

      const seenCounts: number[] = [];
      onCrowdSizeChanged.mockImplementation((count: number) => seenCounts.push(count));

      for (let i = 0; i < spawned; i++) {
        tRef.t += SECURITY_SHRINK_MS;
        r.tick(tRef.t);
      }

      expect(seenCounts.length).toBe(spawned);
      expect(seenCounts[seenCounts.length - 1]).toBe(0);
      // Strictly decreasing, one unit at a time.
      for (let i = 1; i < seenCounts.length; i++) {
        expect(seenCounts[i]).toBe(seenCounts[i - 1] - 1);
      }

      now.mockRestore();
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/raidController.test.ts`
Expected: FAIL — `onRaidStart` and `onCrowdSizeChanged` are not valid `RaidControllerConfig` properties (TypeScript error) / calls never happen.

- [ ] **Step 3: Implement in RaidController.ts**

In the `RaidControllerConfig` interface, replace the `onProtestBackfireSettled` field and its doc comment:

```ts
  /** Fired once a MEDIUM/LOW backfire's raid spawn/respawn has actually finished
   * appearing on screen — right after the fresh-raid spawn burst if no raid was
   * running yet, or once every queued regroup respawn (poofAndEscalate) has fired if
   * one was. Passes the current live security unit count (out of SECURITY_MAX_UNITS)
   * rather than which power band triggered it — a caller mapping this to a visual
   * (e.g. sticker scale) should read it as "how big is the raid right now", not count
   * how many times this has fired. */
  onProtestBackfireSettled?: (securityUnitCount: number) => void;
}
```

with:

```ts
  /** Fired at the idle->raiding transition inside spawnPulse() — i.e. the moment a
   * fresh raid actually starts (a shake, or a MEDIUM/LOW standalone-charge backfire).
   * The correct trigger for un-clocking a sticker's win-lock: a subsequent
   * MEDIUM/LOW backfire on an already-running raid must NOT unlock it, only a brand
   * new raid should. */
  onRaidStart?: () => void;
  /** Fired whenever the live security unit count actually changes — staggered
   * backfire respawns trickling in, or the staggered despawn sweep (win or
   * startRecovery()) removing units one at a time. Checked once per tick() call
   * (and once after spawnPulse()'s synchronous burst) against the last-notified
   * count, so it fires exactly once per real change, never once per frame
   * regardless of whether anything changed. A caller mapping this to a continuous
   * visual (e.g. sticker scale) should treat every call as "the raid's size right
   * now," not accumulate or count calls. */
  onCrowdSizeChanged?: (securityUnitCount: number) => void;
}
```

Replace the private fields:

```ts
  private regroupInFlight = false;
  private readonly onProtestWin: (() => void) | null;
  private readonly onProtestBackfireSettled: ((securityUnitCount: number) => void) | null;
```

with:

```ts
  private regroupInFlight = false;
  /** Last security-unit count passed to onCrowdSizeChanged — compared against
   * this.units.length once per tick() (and once after spawnPulse()'s synchronous
   * burst) so the callback fires exactly once per actual change. */
  private lastNotifiedCrowdCount = 0;
  private readonly onProtestWin: (() => void) | null;
  private readonly onRaidStart: (() => void) | null;
  private readonly onCrowdSizeChanged: ((securityUnitCount: number) => void) | null;
```

Replace the constructor body's callback assignment:

```ts
    this.onProtestWin = config.onProtestWin ?? null;
    this.onProtestBackfireSettled = config.onProtestBackfireSettled ?? null;
```

with:

```ts
    this.onProtestWin = config.onProtestWin ?? null;
    this.onRaidStart = config.onRaidStart ?? null;
    this.onCrowdSizeChanged = config.onCrowdSizeChanged ?? null;
```

In `spawnPulse()`, add the `onRaidStart` call and a trailing notify:

```ts
  private spawnPulse(x: number, y: number): void {
    if (this.state === "idle") {
      this.state = "raiding";
      this.raidStartCount = this.grid.getCreatureCount();
      this.lastAttritionAtMs = Date.now();
      this.grid.setAvatarRepelRadius(null);
      this.onRaidStart?.();
    }

    const available = SECURITY_MAX_UNITS - this.units.length;
    if (available <= 0) return;

    const vw = this.container.clientWidth || window.innerWidth;
    const vh = this.container.clientHeight || window.innerHeight;
    const desired = Math.round(rand(SPAWN_MIN_PER_PULSE, SPAWN_MAX_PER_PULSE));
    const n = Math.min(desired, available);
    const kinds = pickPulseKinds(n);

    for (let i = 0; i < n; i++) {
      const unit = createSecurityUnit(this.avatarLayer, x, y, kinds[i]);
      startSecurityEntranceBurst(unit, vw, vh);
      this.units.push(unit);
    }
    assignEscortFormation(this.units);
    this.notifyCrowdSizeChanged();
  }
```

In `releaseCharge()`, simplify the "no raid running" branch (remove the now-redundant explicit notify — `spawnPulse()` covers it):

```ts
    if (!this.chargeStartedDuringRaid) {
      // No raid running when this charge began — starts one immediately, exactly
      // like a shake. spawnPulse() only runs its idle->raiding initialization when
      // the prior state is 'idle', so set that explicitly first. The spawn burst is
      // near-instant (no queued delay), so spawnPulse()'s own notifyCrowdSizeChanged()
      // call covers it — no separate notification needed here.
      this.state = "idle";
      this.spawnPulse(this.lastAvatarX, this.lastAvatarY);
      return;
    }
```

In `poofAndEscalate()`, update the trailing comment (no code behavior change):

```ts
    // The crowd-size-changed notification for these respawns fires later, from
    // tick(), as each one actually spawns in — not here, before any of them exist.
    this.regroupInFlight = true;
  }
```

In `tick()`, remove the direct settle-callback call and add a trailing notify call. Replace:

```ts
      if (spawnedAny) assignEscortFormation(this.units);
      if (this.regroupInFlight && this.pendingRespawns.length === 0) {
        this.regroupInFlight = false;
        this.onProtestBackfireSettled?.(this.units.length);
      }
    }

    for (const unit of this.units) {
      applyEscortStep(unit, this.lastAvatarX, this.lastAvatarY, nowMs, this.avatarWidth);
      applyEscortRangeConstraint(unit, this.lastAvatarX, this.lastAvatarY, this.avatarWidth);
    }
    applySecurityCollisions(this.units);
```

with:

```ts
      if (spawnedAny) assignEscortFormation(this.units);
      if (this.regroupInFlight && this.pendingRespawns.length === 0) {
        this.regroupInFlight = false;
      }
    }

    for (const unit of this.units) {
      applyEscortStep(unit, this.lastAvatarX, this.lastAvatarY, nowMs, this.avatarWidth);
      applyEscortRangeConstraint(unit, this.lastAvatarX, this.lastAvatarY, this.avatarWidth);
    }
    applySecurityCollisions(this.units);
    this.notifyCrowdSizeChanged();
```

Finally, add the new private method. Place it directly above `destroy()`:

```ts
  /** Compares the live unit count against the last value passed to
   * onCrowdSizeChanged, firing the callback (and updating the stored value) only
   * when it actually changed — called once per tick() and once after
   * spawnPulse()'s synchronous burst, so a caller sees exactly one notification
   * per real change, never one per frame regardless of whether anything moved. */
  private notifyCrowdSizeChanged(): void {
    if (this.units.length !== this.lastNotifiedCrowdCount) {
      this.lastNotifiedCrowdCount = this.units.length;
      this.onCrowdSizeChanged?.(this.units.length);
    }
  }

  /** Full teardown — call when tearing this controller down: ...
```

(The `destroy()` method itself is unchanged — only inserting the new private method immediately before it.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/raidController.test.ts`
Expected: PASS — all tests in the file, including the 4 new ones.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors (confirms no stray references to `onProtestBackfireSettled` remain anywhere in `src/`).

- [ ] **Step 6: Commit**

```bash
git add src/creatures/RaidController.ts tests/unit/raidController.test.ts
git commit -m "feat: replace onProtestBackfireSettled with continuous onCrowdSizeChanged/onRaidStart"
```

---

## Phase 1 · Lane B — Task 2: StickerOverlay — lock/unlock guard around setScaleForRaidSize

**Worktree:** `.worktrees/sticker-inflate-deflate-lane-2-sticker-overlay` · **Branch:** `sticker-inflate-deflate/lane-2-sticker-overlay`

Runs concurrently with Phase 1 · Lane A in its own worktree — does not touch `RaidController.ts` or its test, and Lane A does not touch `StickerOverlay.ts` or its test, so there is no coordination needed between the two lanes until merge.

**Files:**
- Modify: `src/creatures/StickerOverlay.ts`
- Test: `tests/unit/stickerOverlay.test.ts`

**Interfaces:**
- Consumes: nothing new from Task 1.
- Produces: `StickerOverlay.unlock(): void` — a new public method consumed by Task 3 (main.ts). `StickerOverlay.setScaleForRaidSize(unitCount: number, maxUnits: number): void` and `StickerOverlay.lockSqueeze(): void` keep their existing signatures; only their internal behavior changes (locking/no-op).

- [ ] **Step 1: Write the failing tests**

Open `tests/unit/stickerOverlay.test.ts`. Replace the existing test `'setScaleForRaidSize overwrites lockSqueeze — neither is a permanent lock'` (currently):

```ts
  it('setScaleForRaidSize overwrites lockSqueeze — neither is a permanent lock', () => {
    const s = new StickerOverlay('/avatars/a.png');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');

    s.setScaleForRaidSize(10, 40);
    expect(s.el.style.transform).toBe('scale(1.25)');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');
  });
```

with:

```ts
  it('setScaleForRaidSize is a no-op while locked by lockSqueeze', () => {
    const s = new StickerOverlay('/avatars/a.png');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');

    s.setScaleForRaidSize(10, 40);
    expect(s.el.style.transform).toBe('scale(0.55)'); // still locked, unchanged

    s.setScaleForRaidSize(40, 40);
    expect(s.el.style.transform).toBe('scale(0.55)'); // still locked, unchanged
  });

  it('unlock() restores setScaleForRaidSize after a lockSqueeze', () => {
    const s = new StickerOverlay('/avatars/a.png');

    s.lockSqueeze();
    s.unlock();
    s.setScaleForRaidSize(10, 40);
    expect(s.el.style.transform).toBe('scale(1.25)');
  });

  it('lockSqueeze re-locks after an unlock', () => {
    const s = new StickerOverlay('/avatars/a.png');

    s.lockSqueeze();
    s.unlock();
    s.setScaleForRaidSize(20, 40);
    expect(s.el.style.transform).toBe('scale(1.5)');

    s.lockSqueeze();
    expect(s.el.style.transform).toBe('scale(0.55)');
    s.setScaleForRaidSize(40, 40);
    expect(s.el.style.transform).toBe('scale(0.55)'); // no-op again
  });
```

Then replace the test `'setScaleForRaidSize reverts the face back to src once a new raid settles'` (currently):

```ts
  it('setScaleForRaidSize reverts the face back to src once a new raid settles', () => {
    const s = new StickerOverlay(
      '/avatars/grin/grin_gutter.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      false,
      '/avatars/normal/gutter.png',
    );
    const img = s.el.querySelector('img')!;

    s.lockSqueeze();
    expect(img.src).toContain('/avatars/normal/gutter.png');

    s.setScaleForRaidSize(10, 40);
    expect(img.src).toContain('/avatars/grin/grin_gutter.png');
  });
```

with:

```ts
  it('setScaleForRaidSize reverts the face back to src once unlocked and a new raid settles', () => {
    const s = new StickerOverlay(
      '/avatars/grin/grin_gutter.png',
      100,
      100,
      undefined,
      undefined,
      undefined,
      false,
      '/avatars/normal/gutter.png',
    );
    const img = s.el.querySelector('img')!;

    s.lockSqueeze();
    expect(img.src).toContain('/avatars/normal/gutter.png');

    s.unlock();
    s.setScaleForRaidSize(10, 40);
    expect(img.src).toContain('/avatars/grin/grin_gutter.png');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/stickerOverlay.test.ts`
Expected: FAIL — `s.unlock` is not a function; the no-op assertions fail because `setScaleForRaidSize` currently always overwrites.

- [ ] **Step 3: Implement in StickerOverlay.ts**

Add a `locked` field next to `baseScale`. Replace:

```ts
  /** Resting scale — 1 by default, forced to SQUEEZE_MIN_SCALE by lockSqueeze() on a
   * full-power win, or set by setScaleForRaidSize() on a MEDIUM/LOW backfire. Neither
   * is a permanent lock: the next backfire's settle event overwrites it again based on
   * whatever the raid's size is at that point. */
  private baseScale = 1;
```

with:

```ts
  /** Resting scale — 1 by default, forced to SQUEEZE_MIN_SCALE by lockSqueeze() on a
   * full-power win, or continuously driven by setScaleForRaidSize() as the live raid
   * size changes. Not a permanent lock: unlock() (called once a new raid actually
   * starts) restores setScaleForRaidSize()'s ability to update it again. */
  private baseScale = 1;
  /** True from lockSqueeze() until unlock() — while locked, setScaleForRaidSize() is
   * a no-op, so a live crowd-size update arriving right after a win can't silently
   * overwrite the win's fixed floor scale before the next raid has actually begun. */
  private locked = false;
```

Update `setScaleForRaidSize()`. Replace:

```ts
  setScaleForRaidSize(unitCount: number, maxUnits: number): void {
    const t = maxUnits > 0 ? Math.max(0, Math.min(1, unitCount / maxUnits)) : 0;
    this.baseScale = 1 + t * (MAX_SCALE - 1);
    this.el.style.transform = `scale(${this.baseScale})`;
    if (this.dragSrc) this.img.src = this.currentSrc;
  }
```

with:

```ts
  setScaleForRaidSize(unitCount: number, maxUnits: number): void {
    if (this.locked) return;
    const t = maxUnits > 0 ? Math.max(0, Math.min(1, unitCount / maxUnits)) : 0;
    this.baseScale = 1 + t * (MAX_SCALE - 1);
    this.el.style.transform = `scale(${this.baseScale})`;
    if (this.dragSrc) this.img.src = this.currentSrc;
  }
```

(Also update its doc comment above — the "Neither is a permanent lock" framing is now handled by `locked`/`unlock()`; replace the doc comment for `setScaleForRaidSize`:)

```ts
  /** Called once a MEDIUM/LOW backfire's raid spawn/respawn has actually settled on
   * screen (RaidController's onProtestBackfireSettled — never on button release
   * itself). Sets the sticker's resting scale from where the raid's size currently
   * sits within [0, maxUnits], linearly mapped to [1, MAX_SCALE] — not an incremental
   * bump, so it reflects the raid's actual current size rather than a click count
   * that could drift out of sync with what's on screen. Also swaps the face back to
   * `src` (the calm/default expression) if lockSqueeze() had switched it to `dragSrc` —
   * a new raid means the win's weird face is over. */
```

with:

```ts
  /** Called continuously as the live raid's security-unit count changes (RaidController's
   * onCrowdSizeChanged — never on button release itself, and not just at settle events).
   * Sets the sticker's resting scale from where the raid's size currently sits within
   * [0, maxUnits], linearly mapped to [1, MAX_SCALE] — not an incremental bump, so it
   * reflects the raid's actual current size rather than a click count that could drift
   * out of sync with what's on screen. Also swaps the face back to `src` (the calm/default
   * expression) if lockSqueeze() had switched it to `dragSrc` — a new raid means the win's
   * weird face is over. A no-op while locked (see lockSqueeze()/unlock()) — a win's fixed
   * floor scale must not be overwritten by a live update before the next raid starts. */
```

Update `lockSqueeze()`. Replace:

```ts
  lockSqueeze(): void {
    this.baseScale = SQUEEZE_MIN_SCALE;
    this.el.style.transform = `scale(${SQUEEZE_MIN_SCALE})`;
    if (this.dragSrc) this.img.src = this.dragSrc;
  }
```

with:

```ts
  lockSqueeze(): void {
    this.locked = true;
    this.baseScale = SQUEEZE_MIN_SCALE;
    this.el.style.transform = `scale(${SQUEEZE_MIN_SCALE})`;
    if (this.dragSrc) this.img.src = this.dragSrc;
  }

  /** Releases the lock set by lockSqueeze(), letting setScaleForRaidSize() drive the
   * scale again. Called once a new raid actually starts (RaidController's onRaidStart)
   * — not merely once a backfire settles, since a backfire on an already-running raid
   * must not un-clock a still-standing win. Does not itself change the scale; the next
   * setScaleForRaidSize() call (which follows immediately once a raid starts) supplies
   * the new value. */
  unlock(): void {
    this.locked = false;
  }
```

Also update `lockSqueeze()`'s doc comment (directly above it) to mention the new lock semantics. Replace:

```ts
  /** Called once a full-power protest release's despawn sweep has actually finished
   * on screen (RaidController's onProtestWin — never on button release itself): pops
   * the sticker down to SQUEEZE_MIN_SCALE and, for face stickers, swaps to `dragSrc`
   * (the "weird" expression already used mid-drag/shake — see the constructor) so the
   * face-pull reads as part of the same "under strain" moment as the shrink. Not a
   * permanent lock — the next backfire's settle event (setScaleForRaidSize) reverts
   * both the scale and the face. Starting a fresh drag right after a win will also
   * revert the face early (onDragEnd always restores `currentSrc`) — an acceptable
   * overlap between the two mechanics rather than something worth extra state to avoid. */
```

with:

```ts
  /** Called once a full-power protest release's despawn sweep has actually finished
   * on screen (RaidController's onProtestWin — never on button release itself): pops
   * the sticker down to SQUEEZE_MIN_SCALE and, for face stickers, swaps to `dragSrc`
   * (the "weird" expression already used mid-drag/shake — see the constructor) so the
   * face-pull reads as part of the same "under strain" moment as the shrink. Not a
   * permanent lock — unlock() (called once the next raid actually starts) reverts both
   * the scale and the face via the next setScaleForRaidSize() call. Starting a fresh
   * drag right after a win will also revert the face early (onDragEnd always restores
   * `currentSrc`) — an acceptable overlap between the two mechanics rather than
   * something worth extra state to avoid. */
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/stickerOverlay.test.ts`
Expected: PASS — all tests in the file, including the 3 new/modified ones.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/creatures/StickerOverlay.ts tests/unit/stickerOverlay.test.ts
git commit -m "feat: guard StickerOverlay.setScaleForRaidSize with an explicit lock/unlock"
```

---

## Phase 2 (integration) — Task 3: main.ts — rewire callbacks to the continuous signal

**Runs in the base worktree** (`worktree-security-raid-protest`), **after** both Phase 1 branches (`sticker-inflate-deflate/lane-1-raid-controller`, `sticker-inflate-deflate/lane-2-sticker-overlay`) have been merged into it. Do not dispatch this task until both lane merges are confirmed — `main.ts`'s edit references `RaidControllerConfig.onCrowdSizeChanged`/`onRaidStart` (Lane A) and `StickerOverlay.unlock()` (Lane B), neither of which exist until their respective merges land.

**Files:**
- Modify: `src/main.ts:58-85`

**Interfaces:**
- Consumes: `RaidControllerConfig.onCrowdSizeChanged`, `RaidControllerConfig.onRaidStart` (Task 1); `StickerOverlay.unlock()` (Task 2).
- Produces: nothing consumed by later tasks — this is the final wiring task.

- [ ] **Step 1: Update the RaidController construction in main.ts**

In `src/main.ts`, locate the `new RaidController({...})` call (currently lines 58-85):

```ts
  const raidController = new RaidController({
    container,
    grid,
    avatarLayer: document.body,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
    // Both fire once a protest release's spawn/despawn visuals have actually
    // finished on screen — never immediately on button release (see each
    // callback's own doc comment in RaidController.ts for why).
    onProtestWin: () => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.lockSqueeze();
        // Recomputed from the sticker's live width *after* lockSqueeze has actually
        // shrunk it — RaidController already set a plain, unscaled baseline, but only
        // the sticker itself knows its true post-shrink footprint at this instant.
        const ratio = activeOverlay.getWidth() / DEFAULT_WIDTH;
        grid.setAvatarRepelRadius(AVATAR_REPEL_RADIUS_AFTER_WIN * ratio);
      }
    },
    onProtestBackfireSettled: (securityUnitCount) => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.setScaleForRaidSize(securityUnitCount, SECURITY_MAX_UNITS);
      }
    },
  });
```

Replace it with:

```ts
  const raidController = new RaidController({
    container,
    grid,
    avatarLayer: document.body,
    onSecurityRemoved: (x, y, w, h) => {
      const audioContext = audioManager.getAudioContext();
      if (audioContext) playPoofTone(audioContext);
      void spawnPoof(x, y, w, h);
    },
    // Fires once a protest win's despawn visuals have actually finished on screen —
    // never immediately on button release (see the callback's doc comment in
    // RaidController.ts for why).
    onProtestWin: () => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.lockSqueeze();
        // Recomputed from the sticker's live width *after* lockSqueeze has actually
        // shrunk it — RaidController already set a plain, unscaled baseline, but only
        // the sticker itself knows its true post-shrink footprint at this instant.
        const ratio = activeOverlay.getWidth() / DEFAULT_WIDTH;
        grid.setAvatarRepelRadius(AVATAR_REPEL_RADIUS_AFTER_WIN * ratio);
      }
    },
    // Fires the moment a fresh raid actually starts — releases the win-lock so the
    // sticker's scale can track the new raid's live size again.
    onRaidStart: () => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.unlock();
      }
    },
    // Fires continuously as the raid's live security-unit count changes (spawns,
    // backfire respawn trickle-in, despawn sweep) — a no-op on the sticker's side
    // while a win's lock is still in effect.
    onCrowdSizeChanged: (securityUnitCount) => {
      if (activeOverlay instanceof StickerOverlay) {
        activeOverlay.setScaleForRaidSize(securityUnitCount, SECURITY_MAX_UNITS);
      }
    },
  });
```

- [ ] **Step 2: Typecheck and run the full unit suite**

Run: `npx tsc --noEmit && npm test`
Expected: No type errors; all tests pass (aside from any pre-existing unrelated failures already present on this branch — confirm the count of failures matches what existed before this plan's changes, not more).

- [ ] **Step 3: Manual verification in the browser**

Per the project's human-testing rule (this touches `creatures/`), run `npm run dev` and in a browser:
1. Drag the avatar sharply back and forth to shake — a raid spawns, sticker inflates slightly.
2. Shake again mid-raid — more security units spawn, sticker inflates further, tracking the live count (not waiting for a settle event).
3. Hold the Protest button and release at a MEDIUM/LOW power reading — confirm some units poof, then more trickle back in one at a time over ~4.5s+, and the sticker visibly swells in step with each arrival (not one snap update at the end).
4. Hold and release at FULL power (top of the sweep) — confirm the sticker deflates in visible steps as the despawn sweep clears units one by one, then does one final pop to the 0.55 floor scale once the sweep finishes.
5. Confirm holding a charge (before releasing) never visibly changes the sticker's scale, regardless of where the meter is.
6. After a win, shake again to start a new raid — confirm the sticker unlocks and starts tracking the new raid's live size (not stuck at 0.55).

Expected: All six behaviors match. If any step fails, stop and fix before proceeding — do not defer to a later task.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire sticker scale to RaidController's continuous crowd-size signal"
```
