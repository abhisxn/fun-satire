# Security Raid Protest — Fixes & Power Mechanic

Follow-up to [2026-08-15-security-raid-protest-design.md](2026-08-15-security-raid-protest-design.md), after
in-browser testing surfaced bugs and feel issues, plus a new ask: give the Protest button real stakes.

## Goal

Thematic frame: shaking the avatar (protesting against those in power) draws a brutal security raid. Only
when the crowd holds together and grows does pressure build enough to reach them. The Protest button should
carry that same tension — commit and hold, or the raid regains ground.

## A. Bug fixes

1. **Shake responsiveness** (`RaidController.ts`) — a shake currently needs 4 reversals inside a 900ms
   window at ≥1.2px/ms to register, which reads as sluggish. Tighten to:
   - `SHAKE_REVERSAL_THRESHOLD`: 4 → 3
   - `SHAKE_WINDOW_MS`: 900 → 600
   - `SHAKE_MIN_SPEED_PX_MS`: 1.2 → 0.9
   `SHAKE_PULSE_COOLDOWN_MS` (500ms) stays — it's what keeps a sustained shake reading as a wave of arrivals
   rather than a machine-gun spawn, independent of how easy one pulse is to trigger.

2. **Security repels but never despawns creatures** (`CreatureGrid.ts:552-574`) — root cause: the catch-check
   skips any creature where `!c.spawnDone`. Since a creature's spawn-pop can be scheduled anywhere across a
   20s wave (`SPAWN_WAVE_MS`), most of the crowd is ineligible to be caught for a long stretch after every
   spawn/respawn, so security only ever pushes the (spawn-done) minority around. Fix: drop the `spawnDone`
   requirement from the catch condition — a creature should be catchable once it exists and isn't already
   mid-fade or waiting-to-respawn, regardless of pop-in animation state. This is also the direct fix for
   **"security isn't triggered until spawn is complete."**

3. **Z-index** — security sprites render at `z-index:210` (`SecurityCreature.ts`), above the avatar/sticker's
   `z-index:100` (`DraggableAvatar.ts` / `StickerOverlay.ts`'s `STICKER_Z_INDEX`). Change security to `90`
   (`SECURITY_Z_INDEX`, strictly below `STICKER_Z_INDEX`) so the avatar/sticker always renders on top,
   regardless of DOM append order.

4. **Shadow** — security's `filter:drop-shadow(0 2px 3px rgba(0,0,0,0.25))` reads as floating. Flatten to
   `drop-shadow(0 1px 1px rgba(0,0,0,0.12))` — subtle, grounded, consistent with a flat-surface placement.

5. **Tooltip copy** — `StickerOverlay.ts`'s drag-hint (`buildDragHint`) says "Drag me". Change to
   "Drag or Shake Me" — it's the only overlay wired to `raidController.onAvatarMove` (text overlay
   intentionally isn't), so the hint should say what both gestures do.

6. **Security despawn poof** — `RaidController.popNextUnit()` calls `onSecurityRemoved` (which triggers
   `spawnPoof`) and `removeSecurityUnit()` (instant DOM removal + `el.remove()`) back-to-back, so the sprite
   is gone before the poof cloud has visibly grown to cover it. Fix: when a unit is about to pop during
   recovery, first ease its effective `repelRadius` toward 0 over ~250ms (mirrors the crowd's own spawn-in
   easing, in reverse — "losing ground" before vanishing), then fire the poof and remove. This needs a small
   per-unit "shrinking" state in `RaidControllerConfig`'s unit list, read by `getSecurityUnits()` while a unit
   is in its pre-poof shrink window.

7. **Security spawn entrance — mixed kinds, bee-swarm burst** — currently `spawnPulse` places every unit at
   the exact avatar coordinates at full size/opacity with no entrance animation, and kind is an independent
   50/50 coin-flip per unit (`pickSecurityKind`), so a pulse can end up all-police or all-raf by chance. Fix:
   - **Mix**: when a pulse spawns 2+ units, force at least one of each kind (`police`/`raf`) present rather
     than leaving it to independent coin-flips — still randomize which slots get which kind beyond that
     guarantee, and order of appearance.
   - **Entrance**: every unit spawns at `scale:0, opacity:0` positioned exactly on the avatar's current
     center (`x, y` already passed into `createSecurityUnit`, so this holds "irrespective of its position" —
     wherever the avatar/sticker currently is, that's where the unit is born), then eases to `scale:1,
     opacity:1` over a short pop (~250-300ms, easing akin to the crowd's `easeOutBack` pop-in) — this is new
     state on `SecurityUnitState` (e.g. `spawnScale`/`spawnOpacity` read by `createSecurityUnit`'s
     caller/`applyTransform`), not reusing `CreatureGrid`'s pop machinery directly since security units aren't
     `Creature`s.
   - **Disperse**: instead of `startSecurityWander`'s generic `nextWaypoint` (small random step from current
     position), a freshly-spawned unit's *first* waypoint should be pushed outward from the avatar center in a
     random direction at a larger initial distance (e.g. 150-300px) — so a pulse visibly scatters outward like
     a disturbed swarm before settling into its normal wander behavior for all subsequent legs.

## B. Protest button — power/hold mechanic

Currently `hud.getProtestButton()`'s click handler calls `raidController.startRecovery()` instantly — one
click undoes an entire raid. New behavior: recovery must be *earned* by holding.

- **Trigger**: `pointerdown` on `.hud-attack` starts charging a power meter; `pointerup` / `pointerleave`
  before it's full counts as releasing too soon. Full charge takes **1.8s** of continuous hold (tune by feel
  during human testing; expose as a named constant, not a magic number).
- **While charging**: recovery proceeds progressively (not held until 100%) — `RaidController` gains a
  `chargeRecovery(fraction: number)` that scales security-unit poof progress and crowd rebuild to the current
  charge fraction, so the player visibly sees the raid receding as they hold.
- **Release before full charge → security surges back**: charging halts and reverses — the raid floor rises
  back toward its value at the moment the hold started (partial credit is lost, not full-reset-to-raid-start,
  since a full reset was explicitly ruled out as too punishing for an accidental tap), and a proportional
  batch of security re-spawns to match. The player must press-and-hold again from scratch to retry.
- **Full charge (1.8s held) → win**: same end state as today's instant `startRecovery()` — crowd fully
  rebuilds to `QTY_MAX`, all remaining security poofs away (using the new despawn-poof sequencing from A.6).
- **Visual feedback**: a fill sweep across `.hud-attack` (gradient/glow reusing its existing orange palette)
  tracks charge progress in both directions — filling while held, visibly retreating if released early — so
  the "losing ground" is legible without reading code or numbers.

`RaidController`'s public surface grows by: `startCharging()`, `updateCharge(fraction)`,
`releaseCharge()` (replacing the current single `startRecovery()` call site in `main.ts`), while
`startRecovery()` itself can stay internally as what fires once charge reaches 1.0.

## C. Protest button — Figma padding fix

Figma (node `189:4623`) specs the Protest CTA pill as its own fixed box: `height:39px`, `padding:12px` on all
sides, `border-radius:12px` — sized independently from the other HUD icon buttons. Current CSS
(`hud.css` `.hud-attack`) instead inherits the icon buttons' responsive sizing token
(`height: var(--hud-btn-size)` ≈ 44–52px, `padding: 0 16px`), so it's taller and only side-padded versus the
Figma spec. Fix: give `.hud-attack` its own fixed `height:39px; padding:12px`, independent of
`--hud-btn-size`. Everything else already matches Figma (gradient, border color, box-shadow, font).

## D. Long-session GPU/CPU perf

Per discussion, this pass starts with **investigation, not blind fixes** — profile the running app across a
long session and report concrete findings (creature/timer count growth, per-frame allocation in
`CreatureGrid.update()`, `filter:drop-shadow` compositing cost across dozens of simultaneously-animating
security + crowd elements, whether `anime.js` instances from `startSecurityWander` are being cleaned up on
unit removal) before deciding what to change. Findings and the resulting fix list get folded into the
implementation plan as a distinct, ordered step — likely covering some combination of: capping/throttling
expensive-filter element counts, verifying `posAnim` cleanup in `removeSecurityUnit` (currently pauses but
doesn't appear to be nulled/GC'd early), and confirming `RaidController.destroy()` is actually invoked on
every teardown path.

## E. Complexity & dependency recommendations

Reviewed while scoping A–D, since the charge/release mechanic and spawn-entrance work both add new mutable
state to the same files. Findings, most concrete first:

1. **Real perf bug: creature transform is written twice per frame.** `creaturePhysics.ts`'s `updateCreature()`
   already sets `creature.el.style.transform` (line 69) for every creature — then `CreatureGrid.update()`
   immediately overwrites it again for every creature, every frame, in its per-mode loop (eyes: line 479;
   finger/cockroach/placard: line 501), to add rotation/scale/hover-boost the physics layer doesn't know
   about. Every creature gets two style writes (and two forced layout-relevant recalcs) per animation frame
   when only one is used. Fix: have `updateCreature()` stop writing `transform`/return the computed
   `angle` instead of touching the DOM, and let `CreatureGrid` do the single authoritative write. This is the
   single highest-leverage fix for D's "GPU/CPU panics in long sessions" — it scales with creature count
   (hundreds) × 60fps, dwarfing the security-unit count (≤24).

2. **Three near-identical throttle blocks in `CreatureGrid.update()`.** Fade-pick, repop-pick, and
   catch-check each repeat the same `if (now - lastXMs >= intervalMs) { lastXMs = now; ... }` shape inline,
   contributing to `update()` being ~170 lines with several unrelated concerns interleaved. Recommend
   extracting a small private `runThrottled(lastMs, intervalMs, now, fn)` helper before adding any 4th
   throttled behavior (e.g. if the perf investigation in D wants another periodic pass) — mechanical, low
   risk, makes `update()` read as a list of named passes instead of a wall of timer bookkeeping.

3. **Duplicated per-mode creature-factory switch.** `spawn()` and `setQuantity()` both contain the identical
   `switch (mode) { case 'eyes': ... }` block for creating one creature. Since A.7's spawn-entrance work and
   any future mode both touch this path, extract `createCreatureForMode(mode, hx, hy, scale, uid)` once and
   call it from both — removes ~15 duplicated lines and one more place the two spawn paths could drift.

4. **`SecurityUnitState` is about to accumulate ad-hoc animation flags.** A.6 (shrink-before-poof) and A.7
   (spawn-entrance ease) each want to add their own transient fields read by different callers
   (`RaidController` for despawn timing, `SecurityCreature`/`applyTransform` for rendering,
   `getSecurityUnits()` for the repulsion radius fed to `CreatureGrid`). Recommend modeling this the same way
   `CreatureGrid` already models creature spawn/fade (`computeSpawnProgress`, a pure function of elapsed time
   → `{scale, opacity, done}`): one small `phase: 'entering' | 'wandering' | 'poofing'` plus a
   `phaseStartMs` on `SecurityUnitState`, with scale/opacity/effective-repel-radius all derived by pure
   functions of `(phase, now - phaseStartMs)`. One source of truth instead of three independently-mutated
   fields staying in sync by convention.

5. **Prefer pure math over new `anime.js` instances for the one-shot effects.** The bee-swarm entrance and
   shrink-before-poof are both short, one-shot, easily expressed as `t/duration` easing (like
   `computeSpawnProgress` already does) — recommend computing them inline in the same per-frame update rather
   than spinning up additional `anime()` calls per unit. `anime.js` should stay reserved for the continuous
   wander loop it's already driving. Keeps `removeSecurityUnit()`'s cleanup surface at "pause one `posAnim`"
   instead of growing to track/pause 2-3 animation handles per unit, which matters directly for D: fewer live
   animation instances during a long raid with up to 24 simultaneous security units.

6. **Preserve the current one-way dependency.** `CreatureGrid` never imports `RaidController` — raid state
   flows in only through `update(avatarX, avatarY, securityUnits, raidFloor)`'s parameters, and
   `RaidController` reads crowd state back only through `CreatureGrid`'s public `getCreatureCount()` /
   `setQuantity()`. None of A–D need to break this. Explicitly flagging it so the charge/release work doesn't
   take a shortcut (e.g. `CreatureGrid` reaching into `RaidController` for charge fraction) — all new security
   state should keep flowing through the existing `getSecurityUnits()` / `getRaidFloor()` read-only
   accessors, with a new `getChargeFraction()`-style accessor added the same way if `CreatureGrid` ever needs
   it for rendering.

## Testing

Per project convention, every change here touches `creatures/` or `hud/` — run `npm run dev` and verify each
fix visually (shake feel, catch behavior, z-index, shadow, tooltip text, spawn-entrance/mix/disperse, poof
timing, hold-to-charge/release behavior, button padding against the Figma screenshot) before considering the
task done, not deferred to the end of the whole pass.
