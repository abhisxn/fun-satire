# Cockroach Mode Promotion & Bug Swarm Overlay — Design

## Context

Two bug-related icons already exist in the codebase but are wired incorrectly or not at all:

- `docs/superpowers/assets/icons/icn=bug.svg` (24×24 antenna-swirl icon) — currently used by a **standalone utility button** labeled "Cockroach Mode" (`hud-btn--cockroach` class in `Hud.ts`). It should instead be a **primary mode button**, alongside Eye and Point mode, per `docs/superpowers/showcases/grid-scenes/cockroach-grid.html`'s `.hud-btn--bug` reference implementation.
- `docs/superpowers/assets/icons/bug.svg` (35×67 full roach-body icon) — currently used by a "Bug Mode" **toggle** button (`hud-btn--bug-mode` class) whose callback (`onBugModeToggle`) is defined in `Hud.ts` but never consumed in `main.ts`. `BugCreature.ts` (flat bug sprite, `public/creatures/bug.svg`) exists but is never instantiated anywhere.

This design finishes both features:

1. **Cockroach mode**: a fourth primary creature mode, selected the same way as Eye/Point mode.
2. **Bug mode**: an independent toggle that overlays a fixed swarm of crawling flat-SVG bugs on top of whichever primary mode is active (works with all 3: eyes, pointedFinger, cockroach).

## A. Cockroach mode → primary mode row

- Move the cockroach entry into `MODE_BTNS` in `Hud.ts`, positioned between Eye and Point (matching the showcase's Eye → Bug(cockroach) → Hand order):
  ```ts
  { mode: "cockroach", cssClass: "hud-btn--bug", tooltip: "Cockroach Mode", ariaLabel: "Cockroach Mode", svg: SVG_COCKROACH_MODE }
  ```
  where `SVG_COCKROACH_MODE` is the exact markup from `icn=bug.svg` (already present in code as `SVG_COCKROACH`, just renamed for clarity and reused as a mode icon instead of a utility icon).
- Delete the standalone `cockroachBtn` field, its bespoke click handler, and the `cockroachBtn`-specific branch in `setActiveMode()` — the generic `buildModeBtn` handler and the `modeBtnEls` active-state loop already do the right thing once cockroach is a normal `MODE_BTNS` entry.
- Reuse the existing `.hud-btn--bug.active` CSS rule (already defined in `hud.css`, cyan gradient) — no new CSS needed for this part.
- No changes needed in `CreatureGrid.ts` / `CockroachCreature.ts` — cockroach mode's spawn/physics/rotation logic already works correctly; only its trigger UI moves.

## B. Bug mode → `BugSwarm` overlay

New module `src/creatures/BugSwarm.ts`, independent of `CreatureGrid`:

- Owns its own fixed-size array of ~20 bug creatures built with `createBugCreature` from the existing `BugCreature.ts` (flat `public/creatures/bug.svg` sprite, small scale range e.g. 0.3–0.7), scattered at random positions across the viewport (not grid-aligned like the primary modes — this is a sparse overlay).
- Each bug gets wander-and-flee physics mirroring `CockroachCreature`'s approach: random crawl-angle drift, repulsion from the avatar, spring pull back toward a home point, screen-edge wraparound. Rotation faces the crawl direction (reuse the cockroach pattern rather than the current avatar-facing `getBugRotation`).
- Public API: `spawn()` / `clear()`, `setActive(active: boolean)` (spawns on enable, clears on disable), `update(avatarX, avatarY)` (no-op when inactive).
- Rendered into the same `#stage` container as the primary grid, so it visually overlays whichever mode (`eyes` / `pointedFinger` / `cockroach`) is currently active. It does not know about or interact with `CreatureGrid`'s mode — fully independent, so switching primary modes while Bug Mode is on leaves the swarm untouched.

`main.ts` wiring:
- Instantiate `const bugSwarm = new BugSwarm(container);` alongside `CreatureGrid`.
- `hud.onBugModeToggle((active) => bugSwarm.setActive(active));`
- In the engine tick, after `grid.update(center.x, center.y)`, call `bugSwarm.update(center.x, center.y)`.

`Hud.ts` / `hud.css` wiring:
- The toggle button keeps its current slot (next to Settings/Gallery) and icon (`SVG_BUG` = `bug.svg`, already correct — no icon change needed).
- Add a **subtle** active-state style (not the bold cyan mode-gradient) consistent with the other utility-button treatment already in `hud.css`:
  ```css
  .hud-btn--bug-mode.active {
    background: radial-gradient(ellipse at center, rgba(116,212,231,0.45) 0%, rgba(116,212,231,0.12) 70%);
    box-shadow: 0 0 0 2px rgba(58,133,186,0.35);
  }
  ```

## Out of scope

- No changes to the Filter Panel's quantity/repel sliders — bug swarm count is fixed, independent of the primary grid's quantity control.
- No new gallery/sticker entries.
- No changes to `ForceField.ts` / `Engine.ts` / `CreatureGrid.ts`'s core physics (per system-architecture.md guardrails) beyond what's described above.

## Testing

- Unit test for `BugSwarm`: spawn count, `setActive` toggling creates/removes DOM elements, update no-ops when inactive.
- Manual check: switching between Eye/Cockroach/Point while Bug Mode is on keeps the swarm visible and unaffected.
