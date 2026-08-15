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

## Testing

Per project convention, every change here touches `creatures/` or `hud/` — run `npm run dev` and verify each
fix visually (shake feel, catch behavior, z-index, shadow, tooltip text, spawn-entrance/mix/disperse, poof
timing, hold-to-charge/release behavior, button padding against the Figma screenshot) before considering the
task done, not deferred to the end of the whole pass.
