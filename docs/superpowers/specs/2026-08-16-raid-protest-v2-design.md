# Raid/Protest v2 — Escort, Power Meter, Perf, Eye & Placard Follow-ups

## Goal

Second round of fixes on top of the shipped `security-raid-protest-fixes` and `eye-iris-pupil` work, based on
hands-on testing. Ten items: security z-index parity, an escort/follow behavior for security units, a shake
detection bug, a Figma-matched power-selector meter that gates despawn, a despawn-source rework (repel-only
security + time attrition), real perf fixes, a crowd-clustering bug, new placard artwork, a pupil-color fix for
dark irises, and a placard/stick proportion rework.

## A. Z-index parity

**Root cause is deeper than the 90-vs-100 constant.** `index.html` gives `#stage` (the container security units
and creatures are appended into) `position:absolute; z-index:500`, which establishes its own stacking context.
The avatar (a `StickerOverlay`, appended straight to `document.body` — `main.ts:320`) sits at `z-index:100` as
a *sibling* of `#stage`, not inside it. Because `#stage` itself is `z-index:500` at the root level, its entire
subtree — every creature and every security unit, regardless of their own internal `z-index` — already paints
above the avatar, no matter what `SECURITY_Z_INDEX` is set to. The existing 90-vs-100 comment describes a
comparison that only matters *within* `#stage`'s own stacking context; it was never actually keeping security
below the avatar.

Fix: security units need to live in the *same* stacking context as the avatar to make z-index comparisons
between them meaningful at all. `RaidController` gains a second config field, `avatarLayer: HTMLElement`
(`main.ts` passes `document.body`), used as the `appendChild` target for security unit elements in
`createSecurityUnit` instead of the `#stage` container (`container` is still used, unchanged, for viewport-size
reads in `spawnPulse`/`releaseCharge`). With both the avatar and security units now children of `document.body`,
`SecurityCreature.SECURITY_Z_INDEX` changes from `90` to `100`, matching `StickerOverlay.STICKER_Z_INDEX`
exactly — now a real, effective comparison. Because CSS resolves equal-z-index ties by DOM order (later sibling
paints on top), and the avatar is inserted once during onboarding and never re-appended while security units get
appended continuously afterward, the avatar element is explicitly re-appended (moved to the end of
`document.body`'s children via `document.body.appendChild(activeOverlay.el)`) every time a new security unit
spawns, guaranteeing it's always the later — and therefore topmost — sibling at tie z-index. The doc comment
above `SECURITY_Z_INDEX` in `SecurityCreature.ts` is rewritten to explain the shared-stacking-context +
DOM-order guarantee instead of the old (ineffective) "strictly below" rationale.

## B. Security escorts the avatar

While a raid is active (`state !== 'idle'`), security units stop picking free waypoints and instead orbit the
avatar: each unit is assigned a fixed angle/radius offset around the avatar at spawn time (angles spread evenly
across active units so they ring the avatar rather than cluster on one side), and its wander target becomes
`avatar position + offset` instead of a random point, re-evaluated continuously as the avatar moves. The
existing `burstWaypoint` entrance (spawn bursts outward before settling) is unchanged — units burst out, then
fall into formation instead of free-wandering. This replaces `startSecurityWander`'s waypoint-picking behavior
only while raiding; `nextWaypoint`/`burstWaypoint` remain as-is for the entrance leg.

## C. Shake detection fix

Root cause: in `detectShake` (`RaidController.ts`), any sample below `SHAKE_MIN_SPEED_PX_MS` resets
`havePrev = false`, discarding the pending direction. A real hand shake naturally decelerates toward zero speed
at the exact moment it reverses — so the sample right at a reversal is the one most likely to get discarded,
undercounting reversals for anything but a fast, continuous, mostly-diagonal shake (which rarely dips below the
speed floor mid-motion). Fix: on a slow sample, skip it without resetting `havePrev`/`prevDx`/`prevDy`, so the
next fast sample can still be compared against the direction from before the deceleration.

`SHAKE_WINDOW_MS` also increases from `600` to `1100` (per direct instruction), giving a slower, more
deliberate shake more time to accumulate `SHAKE_REVERSAL_THRESHOLD` (3) reversals. `SHAKE_MIN_SPEED_PX_MS` and
`SHAKE_REVERSAL_THRESHOLD` are unchanged.

## D. Power-selector meter (Figma node 431:10191, file `oPAdd7oWLQVMTP1v6pJOW0`)

New `PowerMeter` component: a pill (`WEAK`↔`HIGH` labels either side of a horizontal gradient track, small
triangle marker riding along it) matching the Figma reference — `backdrop-blur` white pill, rounded-full track
with a yellow→green→red gradient, marker as a small absolutely-positioned image. Sized to match the HUD
button cluster's width (responsive to the same `--hud-btn-size`/`--hud-btn-gap` tokens the rest of the HUD
uses), positioned directly above the HUD row.

Driven by the same pointerdown/pointerup hold gesture already wired to the Protest button — no new input.
`PowerMeter`'s marker position is a pure function of `raidController.getChargeFraction()` (0 → left edge, 1 →
right edge), synced in the existing `engine.onTick` in `main.ts` alongside the `--charge` CSS var update.

**Responsive/mobile**: the HUD already has a fluid sizing system — `--hud-density` (`hud.css:22`) is a single
`clamp(0px, calc(100vw - 320px), 448px)` token that every button/gap/padding dimension derives from, ramping
continuously from a 320px viewport up to a 768px+ ceiling, with no breakpoint cliffs. `PowerMeter`'s CSS derives
its own sizing (pill height, label font-size, track height/width, marker size) from that same `--hud-density`
token rather than inventing a parallel scale, so it stays visually in lockstep with the HUD row it sits above
at every viewport width. Its width is set to match the HUD row's own rendered width (read via
`getBoundingClientRect()` on the HUD container and applied as an inline style, updated on resize alongside the
existing `resize` listener in `main.ts`) rather than a hardcoded percentage, so "match width with HUD" holds
exactly regardless of how many HUD buttons are present. Touch target height follows `--hud-btn-size` (min 44px,
already touch-friendly) rather than the Figma reference's smaller 39px desktop figure, consistent with how
`.hud-attack` already sizes itself today. No new media query is needed — the existing `768px` structural
breakpoint (which only drops tooltips, per the comment at `hud.css:440`) is untouched since `PowerMeter` has no
tooltip.

**Gated despawn**: a new `CHARGE_HIGH_THRESHOLD = 0.66` constant in `RaidController.ts`. `tick()`'s
charge-shrink logic (the `excess`/`keepCount` block, which removes *security units*) only starts once
`chargeFraction >= CHARGE_HIGH_THRESHOLD` — holding in the WEAK/MEDIUM zone (0–0.66) visibly fills the meter
but doesn't yet shrink security. The separate `rebuilt` crowd-count calculation in the same `tick()` (which
grows the crowd back toward `QTY_MAX`) is **not** gated — it keeps progressing continuously across the whole
0–1 hold, unchanged from today, since the ask was specifically about security only clearing in the high range,
not about delaying crowd regrowth. Releasing before full charge still calls `releaseCharge()` exactly as today
(all progress lost, security and crowd count snap back to their pre-charge baseline) regardless of which zone
the release happened in.

## E. Despawn source: security repel-only + time attrition

`CreatureGrid.update()`'s security catch-check block (the one iterating `securityUnits` and removing creatures
within `unit.catchRadius`) is removed entirely. `SecurityUnit.catchRadius` and `SECURITY_CATCH_RADIUS` are
removed from `RaidController.getSecurityUnits()`/`SecurityCreature.ts` — security units keep only
`repelRadius`, becoming pure repulsors like the avatar, never permanently removing a creature on contact.

Crowd attrition during an active raid instead comes from a new periodic drain in `RaidController.tick()`: while
`state === 'raiding'` (not `charging`, not `recovering`), on a throttled interval (e.g. every 400ms, tracked via
a new `lastAttritionAtMs` field) nudge `grid.setQuantity()` one step down toward `getRaidFloor()` — a small,
steady loss for as long as the raid sits unaddressed, independent of the charge gesture. This directly answers
"more despawn when security is triggered" without contact-catches, and also removes the O(units × creatures)
catch scan that was the direct cause of item G below (despawn slowing as crowd count rises).

## F. GPU/CPU perf

Confirmed in `CreatureGrid.update()`: three full O(n) passes over `this.creatures` every RAF frame (physics
update, hover-detection, mode-specific render), plus `.filter()` array allocations inside the throttled
fade-pick and repop blocks, plus (before E above) an O(units × creatures) catch scan. Fixes, staying inside the
existing DOM-elements-as-renderer architecture (no canvas, no spatial partitioning, no object pooling — none of
those are warranted once the redundant work above is gone):

- Merge the hover-detection loop and the mode-specific render loop into a single pass over `this.creatures`
  (they already both iterate it separately every frame for every mode).
- Replace the `.filter(...)` + `splice(Math.floor(Math.random() * len))` pattern in the fade-pick and repop
  blocks with a single pass that counts eligible candidates and reservoir-samples the picks, instead of
  allocating a fresh filtered array on every throttled tick.
- Item E's removal of the per-frame catch scan is itself a major perf win at high crowd/security counts.

## G. Crowd-clustering-left bug

Root cause: while charging, `RaidController.tick()` calls `grid.setQuantity(rebuilt)` every single RAF frame
(as `chargeFraction` ramps smoothly), and each call fully recomputes `cols`/`rows`/`cellW`/`cellH` and
reassigns every creature's home position (`hx`/`hy`) to a brand-new grid layout — but the physics spring pull
toward a new home is comparatively weak per frame, so creatures barely progress toward each new layout before
it's replaced again next frame. Meanwhile repulsion from the avatar and the now-orbiting security units (both
clustered near the avatar, per section B) dominates the velocity, dragging the visible crowd toward wherever
the repulsors currently sit instead of ever settling into an even grid.

Fix: throttle the `grid.setQuantity()` calls driven by charge/attrition progress to a fixed interval (matching
the pattern already used for fade/repop/catch — e.g. every 200ms) instead of every frame, giving the spring
force time to actually converge creatures to each layout before the next reflow arrives.

## H. New placard artwork

`public/creatures/placards/` now has 19 PNGs (`placard_01`–`placard_19`) with entirely different native pixel
dimensions than the ones currently hardcoded in `PlacardCreature.PLACARD_POOL`. The pool is replaced with the
measured dimensions of the new files:

```ts
export const PLACARD_POOL: PlacardAsset[] = [
  { src: '/creatures/placards/placard_01.png', w: 560, h: 432 },
  { src: '/creatures/placards/placard_02.png', w: 868, h: 432 },
  { src: '/creatures/placards/placard_03.png', w: 808, h: 432 },
  { src: '/creatures/placards/placard_04.png', w: 808, h: 432 },
  { src: '/creatures/placards/placard_05.png', w: 946, h: 432 },
  { src: '/creatures/placards/placard_06.png', w: 1242, h: 548 },
  { src: '/creatures/placards/placard_07.png', w: 726, h: 432 },
  { src: '/creatures/placards/placard_08.png', w: 1142, h: 548 },
  { src: '/creatures/placards/placard_09.png', w: 902, h: 432 },
  { src: '/creatures/placards/placard_10.png', w: 740, h: 432 },
  { src: '/creatures/placards/placard_11.png', w: 1080, h: 432 },
  { src: '/creatures/placards/placard_12.png', w: 1124, h: 548 },
  { src: '/creatures/placards/placard_13.png', w: 1198, h: 432 },
  { src: '/creatures/placards/placard_14.png', w: 1210, h: 432 },
  { src: '/creatures/placards/placard_15.png', w: 546, h: 432 },
  { src: '/creatures/placards/placard_16.png', w: 714, h: 432 },
  { src: '/creatures/placards/placard_17.png', w: 714, h: 432 },
  { src: '/creatures/placards/placard_18.png', w: 1330, h: 432 },
  { src: '/creatures/placards/placard_19.png', w: 824, h: 432 },
];
```

No other change to `pickRandomPlacard()` — it already indexes uniformly across the pool, so the 19th entry is
picked up automatically.

## I. Pupil color for dark irises

Most of `EyeCreature.IRIS_COLORS` are already dark browns/greens (`#3D3229`, `#2D2520`, `#4A3528`, `#5C4033`,
`#4A5E4A`) — `darkenHexColor` pushing them further toward black produces a pupil that's nearly invisible
against its own iris. Fix: a new pure `lightenHexColor(hex: string, amount: number): string` (same
channel-wise math as `darkenHexColor`, mixing each channel toward 255 instead of 0), and a new pure
`derivePupilColor(hex: string, amount: number): string` that computes perceptual luminance
(`0.299r + 0.587g + 0.114b`) from the iris hex and calls `lightenHexColor` when luminance is below 128,
`darkenHexColor` otherwise. `createEyeCreature`'s `pupil.setAttribute('fill', ...)` call switches from
`darkenHexColor(irisColor, PUPIL_DARKEN_AMOUNT)` to `derivePupilColor(irisColor, PUPIL_DARKEN_AMOUNT)`.
`darkenHexColor` stays exported unchanged (existing tests reference it directly); `lightenHexColor` and
`derivePupilColor` are new exports. `PUPIL_DARKEN_AMOUNT` (0.2) is reused as the adjustment magnitude in both
directions.

## J. Placard/stick proportion rework

`pickSignScale()` keeps its existing name (no rename — call site in `createPlacardCreature` is unchanged), but
its return value's meaning changes from an absolute multiplier on a fixed 150px base to a **ratio** applied on
top of the creature's own depth-`scale`. Its range changes from `0.3 + Math.pow(Math.random(), 1.5) * 0.5`
(independent of creature scale) to a flat **0.5–1.4** random range, and the call site changes from
`placardW = PLACARD_BASE_W * signScale` to `placardW = PLACARD_BASE_W * scale * signScale`. Effects:

- A small/distant creature (low `scale`) now always carries a proportionally small placard instead of
  potentially a full-size one — placard and stick sizing stay visually coupled to the same depth cue.
- The 0.5 floor is below 1.0, so a placard can end up smaller than its own stick's rendered footprint —
  previously the independent 0.3–0.8-of-150px range rarely produced a placard smaller than the stick at typical
  `scale` values.
- `placardH` still derives from `asset.h / asset.w` (aspect preserved); `STICK_ANCHOR_PCT`-based positioning is
  unchanged.

## Files affected

- `src/creatures/SecurityCreature.ts` — A (z-index constant + comment), B (formation offset fields/logic on
  `SecurityUnitState`, avatar-relative wander target), E (drop `catchRadius`/`SECURITY_CATCH_RADIUS`).
- `src/creatures/RaidController.ts` — C (`detectShake` fix, `SHAKE_WINDOW_MS`), D (`CHARGE_HIGH_THRESHOLD` gate
  on the charge-shrink logic, `getChargeFraction()` already exists and is reused), E (attrition tick, drop
  `catchRadius` from `getSecurityUnits()`), G (throttle `setQuantity()` calls during charge/attrition).
- `src/creatures/CreatureGrid.ts` — E (remove the security catch-check block), F (merge hover+render passes,
  reservoir-sample fade/repop picks instead of `.filter()`+`splice`).
- `src/main.ts` — A (pass `avatarLayer: document.body` into `RaidController`'s config; re-append
  `activeOverlay.el` to `document.body` whenever a security unit spawns).
- `src/hud/` — D: new `PowerMeter.ts` (+ CSS) component, wired in `main.ts` alongside the existing
  `--charge`/Protest-button sync in `engine.onTick`.
- `src/creatures/EyeCreature.ts` — I (`lightenHexColor`, `derivePupilColor`, swap the fill call).
- `src/creatures/PlacardCreature.ts` — H (`PLACARD_POOL` dimensions + 19th entry), J (`pickSignScale` → ratio
  applied on top of `scale`).
- Test files: `tests/unit/raidController.test.ts`, `tests/unit/securityCreature.test.ts`,
  `tests/unit/creatureGrid.test.ts`, `tests/unit/eyeCreature.test.ts`, `tests/unit/placardCreature.test.ts` (or
  equivalent existing placard test file), plus a new `tests/unit/powerMeter.test.ts`.

## Testing

Touches `physics/`, `creatures/`, and `hud/` — run `npm run dev` and manually verify, per project convention:

- Shake horizontally, vertically, and diagonally with a slower, deliberate wiggle — raid should trigger
  reliably in all three, not just diagonal/circular motion.
- During a raid, confirm security units ring/follow the avatar instead of wandering independently, and never
  render visually above the avatar sticker even as both move.
- Hold the Protest button/power meter through WEAK and MEDIUM without releasing — security should visibly hold
  steady (not shrink) until the meter crosses into the HIGH zone, matching the Figma reference's three-zone
  layout.
- Release early (before HIGH) — confirm the full snap-back to pre-charge state still happens.
- Let a raid sit active without charging — crowd count should visibly drain over time toward the raid floor,
  while security units only push creatures away on approach rather than instantly removing them.
- Raise crowd quantity substantially (via the quantity slider) and confirm creatures spread evenly across the
  screen rather than drifting into a left-side cluster.
- Switch to eye mode and confirm pupils are visibly distinct (lighter) on the dark brown/green iris colors, not
  crushed to near-black.
- Switch to placard mode and confirm the new artwork renders, and that sign-to-stick proportions now visibly
  vary in both directions (some signs notably smaller than their stick, not just larger).
