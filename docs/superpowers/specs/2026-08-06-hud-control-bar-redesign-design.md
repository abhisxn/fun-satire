# HUD Control Bar Redesign — Design

Figma: https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=189-4623

## Context

The premium HUD control bar (`Hud.ts`/`hud.css`) already implements drag-to-move and per-panel click-outside-to-close (`FilterPanel.ts`, `GalleryPanel.ts`) — both requirements are satisfied today and need no change. The real gaps, found by cross-referencing the Figma control-bar component (node `189:4623`, "Frame 37") against the current implementation:

1. **Wrong active colors.** `MODE_BTNS` maps `cockroach` → CSS class `hud-btn--bug` (blue active gradient) and `pointedFinger` → `hud-btn--hand` (green active gradient). Figma has it the other way: pointed-finger is blue, cockroach is green.
2. **Wrong bar order.** Code renders eyes → cockroach → pointedFinger. Figma renders eye → hand → cockroach → (new) placard.
3. **No hover-white-circle.** Utility buttons (filter, gallery) currently carry a permanent faint white radial background; mode buttons get a radial white fade only via `::before` on hover. Figma wants: no background at rest (for everything except the active mode pill and the Protest button), a solid white circle on hover.
4. **Bug Mode is a standalone bar button.** Figma moves it into the filter panel as a toggle, alongside Numbers (qty) and Repel.
5. **Missing 4th mode: Placard.** A new `CreatureMode` where the crowd holds placard signs, matching the purple gradient slot in the Figma component set.

## 1. Button states (default / hover / pressed)

Applies to: drag handle (unchanged, already opacity-based), all 4 mode buttons when *not* active, filter button, gallery button. Does **not** apply to the Protest button (always has its orange gradient) or to a mode button while it is the active mode (keeps its colored pill).

- **Default:** transparent background, outline-only icon — already true, no change.
- **Hover:** a solid white circle (`rgba(255,255,255,0.9)`, full-bleed circle behind the icon) fades in — replaces the existing radial-gradient `::before` treatment and the permanent radial background on `.hud-btn--gallery`/`.hud-btn--settings`.
- **Pressed:** existing `scale(0.95)` on `:active` is kept as-is; it already reads as a pressed state.

`.hud-btn--bug-mode` and its CSS block are deleted entirely (§4).

## 2. Bar order + mode colors

New left-to-right order: drag handle → Eye → Hand (pointedFinger) → Cockroach → Placard → divider → Filter → Gallery → Protest.

`MODE_BTNS` in `Hud.ts` is reordered and re-pointed at corrected CSS classes:

| mode | cssClass | active gradient | border |
|---|---|---|---|
| eyes | `hud-btn--eye` | `#f78d8d → #e26790` (unchanged) | `#a02b4d` |
| pointedFinger | `hud-btn--hand` | `#74d4e7 → #3a85ba` (was on `--bug`) | `#226591` |
| cockroach | `hud-btn--bug` | `#8be774 → #3cba3a` (was on `--hand`) | `#228b20` |
| placard | `hud-btn--placard` (new) | `#f4a893 → #ba3aba` | `#871e93` |

CSS class names (`--bug`, `--hand`) are kept attached to their existing selectors to minimize churn — only the gradient/border values swap between the `--bug` and `--hand` rules, plus a new `--placard` rule is added.

## 3. Bug Mode → Filter panel toggle

- Remove `bugModeBtn` construction/wiring from `Hud.ts` (the `buildUtilityBtn("hud-btn--bug-mode", ...)` call, its click handler, `bugModeActive` state, `onBugModeToggle`/`isBugModeActive` — this API moves to `FilterPanel`).
- `FilterPanel` gains a third section, "Bug Mode", below the existing divider/Repel section: a label + a small pill-style toggle switch (new CSS, no existing toggle component in the codebase — a standard two-state track/knob, sized to match the panel's existing minimal aesthetic).
- `FilterPanel` gains `onBugModeToggle(cb: (active: boolean) => void)`, mirroring `onQuantityChange`/`onRepelChange`.
- `main.ts`: replace `hud.onBugModeToggle((active) => bugSwarm.setActive(active))` with `filterPanel.onBugModeToggle((active) => bugSwarm.setActive(active))`.
- No change to `BugSwarm` itself, its behavior, or `Hud`'s open/close/click-outside plumbing for the filter panel — the toggle is just a new row inside the existing popover.

## 4. New Placard mode

Follows the existing `pointedFinger`/`cockroach` pattern exactly — no new abstractions.

- `creatureTypes.ts`: `CreatureMode` becomes `'eyes' | 'pointedFinger' | 'cockroach' | 'placard'`.
- New `src/creatures/PlacardCreature.ts`, structurally identical to `CockroachCreature.ts`/`FingerCreature.ts`: `createPlacardCreature(hx, hy, scale)` builds a `.wrap` div with an `<img src="/creatures/placard_stick.png">`, and `getPlacardRotation(creature, avatarX, avatarY)` reuses the same atan2-toward-avatar formula. Natural width/height constants (`PLACARD_NAT_W`/`PLACARD_NAT_H`) default to the same 405×171 proportions as `FingerCreature` until the real asset's dimensions are known — trivial to correct once `placard_stick.png` is supplied.
- `public/creatures/placard_stick.png` is assumed to exist at that path; the user is supplying this asset separately. No placeholder/fallback asset is generated.
- `CreatureGrid.ts`:
  - `MODE_CONFIGS.placard` added, matching the `pointedFinger`/`cockroach` swarm config (`cols: 20, rows: 12`, same scale function).
  - `case 'placard': creature = createPlacardCreature(hx, hy, scale); break;` added to both `spawn()` and `setQuantity()`.
  - `case 'placard': angle = getPlacardRotation(c, avatarX, avatarY); break;` added to `update()`.
- `Hud.ts`: new `MODE_BTNS` entry `{ mode: "placard", cssClass: "hud-btn--placard", tooltip: "Placard Mode", ariaLabel: "Placard Mode", svg: SVG_PLACARD }`. `SVG_PLACARD` is a new inline icon (signboard-on-a-stick outline, matching the line-art style of the other mode icons — border rectangle + two lines beneath, per the Figma glyph) added alongside the existing `SVG_EYE`/`SVG_HAND`/`SVG_COCKROACH` constants.

## Out of scope

- Drag-to-move: already implemented, untouched.
- Click-outside-to-close on `FilterPanel`/`GalleryPanel`: already implemented, untouched.
- `BugSwarm`'s internal behavior (anime.js crawl, click-to-drop): untouched, only its activation trigger moves.
- Gallery panel (sticker/text overlay system): untouched, unrelated to this spec.
- Tooltip styling, responsive breakpoints, reduced-motion handling: untouched.
