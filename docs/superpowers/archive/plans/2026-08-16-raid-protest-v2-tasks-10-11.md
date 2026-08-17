# Raid/Protest v2 Implementation Plan — Tasks 10-11 (final)

> Part of [2026-08-16-raid-protest-v2.md](2026-08-16-raid-protest-v2.md) — see that file for the plan header, execution instructions, and the full task index. Continues from [Task 9](2026-08-16-raid-protest-v2-task-9.md). This is the final part.

## Task 10: Perf — merge hover/render passes, reservoir-sample fade/repop picks

**Files:**
- Modify: `src/creatures/CreatureGrid.ts:415-486,488-499,534-562`

- [ ] **Step 1: Establish the behavior-preserving baseline**

This task is a pure refactor — it must not change any observable behavior, only how it's computed. Run the full suite first to record the baseline:

Run: `npm test`
Expected: The same pass/fail counts as after Task 9 (known pre-existing failures only, nothing from this codebase's own logic).

- [ ] **Step 2: Merge the hover-detection loop into the render loop**

In `src/creatures/CreatureGrid.ts`, the `update()` method currently has three separate loops over `this.creatures`/`this.eyeCreatures`: physics (unchanged, leave as-is), a standalone hover-detection loop, and a mode-specific render loop. Replace the hover-detection loop and the render loop — everything from the comment `// Hover-enter edge detection:` through the end of the `if (this.mode === 'eyes') { ... } else { ... }` block — with a single merged pass:

```ts
    if (this.mode === 'eyes') {
      const vw = this.container.clientWidth || window.innerWidth;
      for (const eye of this.eyeCreatures) {
        const dx = avatarX - eye.x;
        const dy = avatarY - eye.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const wasHovered = this.hoverState.get(eye) ?? false;
        // See the comment on the non-eye branch below for why this uses
        // whichever radius is larger.
        const radius = Math.max(hoverRadiusFor(eye), this.physicsParams.repelRadius);
        const { hovered, entered } = computeHoverEdge(distance, radius, wasHovered);
        this.hoverState.set(eye, hovered);
        const prevBoost = this.hoverBoost.get(eye) ?? 0;
        const targetBoost = hovered ? 1 : 0;
        const boost = prevBoost + (targetBoost - prevBoost) * HOVER_BOOST_LERP;
        this.hoverBoost.set(eye, boost);
        if (entered && this.audioContext && canPlayHoverTone(this.lastHoverToneAtMs, now)) {
          this.lastHoverToneAtMs = now;
          this.triggerHoverTone();
        }

        updateEyePupil(eye, avatarX, avatarY);
        const scaleY = updateEyeBlink(eye);
        // Base the angle on the right-half quadrant's large-magnitude form
        // (dx pinned negative) so both left and right get the same tilt
        // range, then mirror the sign for the left half so it fans out
        // symmetrically instead of going flat.
        const halfSign = eye.x < vw / 2 ? -1 : 1;
        const angleRad = Math.atan2(dy, -Math.abs(dx));
        const fullAngle = angleRad * (180 / Math.PI);
        const rotation = fullAngle * eye.rotFactor * halfSign;

        const spawn = resolveSpawnState(eye, now);
        const hoverScale = 1 + boost * HOVER_SCALE_BUMP;
        eye.el.style.opacity = String(spawn.opacity);
        eye.el.style.transform = `translate(${eye.x - eye.w / 2}px,${eye.y - eye.h / 2}px) rotate(${rotation}deg) scale(${spawn.popScale * hoverScale}) scaleY(${scaleY})`;
      }
    } else {
      for (const c of this.creatures) {
        const dx = avatarX - c.x;
        const dy = avatarY - c.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const wasHovered = this.hoverState.get(c) ?? false;
        // The crowd actively flees the cursor (see applyRepulsion in
        // creaturePhysics.ts), and repelRadius (180px) is well outside a
        // creature's own tight hoverRadiusFor(c) (~half its size + 20px). If
        // hover only used hoverRadiusFor, the cursor could almost never catch
        // a creature close enough to register — it's already fleeing by the
        // time it would. Using whichever radius is larger means hover fires
        // as soon as a creature enters the repulsion field it's reacting to.
        const radius = Math.max(hoverRadiusFor(c), this.physicsParams.repelRadius);
        const { hovered, entered } = computeHoverEdge(distance, radius, wasHovered);
        this.hoverState.set(c, hovered);
        const prevBoost = this.hoverBoost.get(c) ?? 0;
        const targetBoost = hovered ? 1 : 0;
        const boost = prevBoost + (targetBoost - prevBoost) * HOVER_BOOST_LERP;
        this.hoverBoost.set(c, boost);
        if (entered && this.audioContext && canPlayHoverTone(this.lastHoverToneAtMs, now)) {
          this.lastHoverToneAtMs = now;
          this.triggerHoverTone();
        }

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

        const spawn = resolveSpawnState(c, now);
        const hoverScale = 1 + boost * HOVER_SCALE_BUMP;
        c.el.style.opacity = String(spawn.opacity);
        c.el.style.transform = `translate(${c.x - c.w * 0.5}px,${c.y - c.h * 0.5}px) rotate(${angle}deg) scale(${spawn.popScale * hoverScale})`;
      }
    }
```

This removes the previously-standalone hover loop entirely (there is no separate `// Hover-enter edge detection:` block left after this change) — cuts one full O(n) pass per frame.

- [ ] **Step 3: Run the full suite to confirm no behavior changed**

Run: `npm test`
Expected: Identical pass/fail results to Step 1's baseline — this includes `tests/unit/creatureGridHoverTones.test.ts` and `tests/unit/creatureGridPopIn.test.ts`, which directly exercise this code path.

- [ ] **Step 4: Reservoir-sample the fade-pick block**

Replace the fade-pick block:

```ts
    // Random disappear: settled creatures fade out independently.
    if (this.shouldRunThrottled(this.lastFadePickMs, FADE_PICK_INTERVAL_MS, now)) {
      const candidates = this.creatures.filter((c) => c.spawnDone && c.fadeStartMs === 0);
      if (candidates.length > 0) {
        this.lastFadePickMs = now;
        const count = Math.min(FADE_PICK_COUNT, candidates.length);
        for (let i = 0; i < count; i++) {
          const picked = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
          picked.fadeStartMs = now;
        }
      }
    }
```

with a single-pass reservoir sample that avoids allocating a filtered copy of the whole crowd every throttled tick:

```ts
    // Random disappear: settled creatures fade out independently. Reservoir-
    // samples up to FADE_PICK_COUNT eligible creatures in one pass instead of
    // filter()-ing the whole crowd into a throwaway array every tick.
    if (this.shouldRunThrottled(this.lastFadePickMs, FADE_PICK_INTERVAL_MS, now)) {
      const picked: Creature[] = [];
      let seen = 0;
      for (const c of this.creatures) {
        if (!c.spawnDone || c.fadeStartMs !== 0) continue;
        seen++;
        if (picked.length < FADE_PICK_COUNT) {
          picked.push(c);
        } else {
          const j = Math.floor(Math.random() * seen);
          if (j < FADE_PICK_COUNT) picked[j] = c;
        }
      }
      if (seen > 0) {
        this.lastFadePickMs = now;
        for (const c of picked) c.fadeStartMs = now;
      }
    }
```

- [ ] **Step 5: Reservoir-sample the repop block**

Replace the repop block:

```ts
    if (this.shouldRunThrottled(this.lastRepopPickMs, REPOP_INTERVAL_MS, now)) {
      this.lastRepopPickMs = now;
      const idleMs = now - this.lastActivityMs;
      const desiredVisibleCount = Math.min(
        this.targetCount,
        Math.max(IDLE_FLOOR_MIN_COUNT, Math.round(this.targetCount * idleVisibleFraction(idleMs))),
      );
      const visibleCount = this.creatures.filter((c) => !c.waitingRespawn).length;
      const deficit = desiredVisibleCount - visibleCount;
      if (deficit > 0) {
        const waiting = this.creatures.filter((c) => c.waitingRespawn);
        const burstCap = Math.max(
          REPOP_COUNT_BURST_MIN,
          Math.round(this.targetCount * REPOP_COUNT_BURST_FRACTION),
        );
        const cap = now < this.burstUntilMs ? burstCap : REPOP_COUNT;
        const count = Math.min(cap, deficit, waiting.length);
        for (let i = 0; i < count; i++) {
          const picked = waiting.splice(Math.floor(Math.random() * waiting.length), 1)[0];
          picked.waitingRespawn = false;
          picked.spawnPopAtMs = now;
        }
      }
    }
```

with:

```ts
    if (this.shouldRunThrottled(this.lastRepopPickMs, REPOP_INTERVAL_MS, now)) {
      this.lastRepopPickMs = now;
      const idleMs = now - this.lastActivityMs;
      const desiredVisibleCount = Math.min(
        this.targetCount,
        Math.max(IDLE_FLOOR_MIN_COUNT, Math.round(this.targetCount * idleVisibleFraction(idleMs))),
      );
      let visibleCount = 0;
      let waitingCount = 0;
      for (const c of this.creatures) {
        if (c.waitingRespawn) waitingCount++;
        else visibleCount++;
      }
      const deficit = desiredVisibleCount - visibleCount;
      if (deficit > 0) {
        const burstCap = Math.max(
          REPOP_COUNT_BURST_MIN,
          Math.round(this.targetCount * REPOP_COUNT_BURST_FRACTION),
        );
        const cap = now < this.burstUntilMs ? burstCap : REPOP_COUNT;
        const count = Math.min(cap, deficit, waitingCount);
        if (count > 0) {
          const picked: Creature[] = [];
          let seen = 0;
          for (const c of this.creatures) {
            if (!c.waitingRespawn) continue;
            seen++;
            if (picked.length < count) {
              picked.push(c);
            } else {
              const j = Math.floor(Math.random() * seen);
              if (j < count) picked[j] = c;
            }
          }
          for (const c of picked) {
            c.waitingRespawn = false;
            c.spawnPopAtMs = now;
          }
        }
      }
    }
```

- [ ] **Step 6: Run the full suite to confirm no behavior changed**

Run: `npm test`
Expected: Identical pass/fail results to Step 1's baseline — this specifically includes `tests/unit/creatureGridIdleResurge.test.ts`, which directly exercises the repop timing/counts.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: Succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/creatures/CreatureGrid.ts
git commit -m "perf: merge hover/render passes into one, reservoir-sample fade/repop picks"
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: Same pass/fail counts as the pre-existing known baseline from the prior plan (495 passed / 17 known-unrelated pre-existing failures) — this plan's own changes should introduce zero new failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Succeeds — `tsc` typecheck and `vite build` both clean.

- [ ] **Step 3: Manual QA checklist (human testing)**

Run `npm run dev` and verify each item from the spec's Testing section:

- Shake the avatar horizontally, vertically, and diagonally with a slower, deliberate wiggle — a raid should trigger reliably in all three directions, not just diagonal/circular motion.
- During a raid, security units should ring/follow the avatar as it's dragged, and never render visually above the avatar sticker at any position.
- Hold the Protest button through WEAK and MEDIUM without releasing — the power meter above the HUD should fill, and security should visibly hold steady (not shrink) until the marker crosses into HIGH.
- Release early (before HIGH) — confirm the full snap-back to pre-charge state still happens.
- Let a raid sit active without charging — the crowd count should visibly drain over time toward the raid floor, while security units only push creatures away on approach, never instantly remove them.
- Raise the crowd quantity substantially via the settings slider and confirm creatures spread evenly across the screen rather than drifting into a left-side cluster.
- Switch to eye mode and confirm pupils are visibly distinct (lighter) on the dark brown/green iris colors, not crushed to near-black.
- Switch to placard mode and confirm the new artwork renders, and sign-to-stick proportions now visibly vary in both directions (some signs notably smaller than their stick).
- Drag the HUD to a different position/corner and confirm the power meter moves with it and still matches its width.

- [ ] **Step 4: Report results**

Summarize test/build status and any manual QA findings back to the user before considering this plan complete.
