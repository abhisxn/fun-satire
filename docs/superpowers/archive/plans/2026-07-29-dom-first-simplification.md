# Fun Satire Re-Architecture: DOM-First Simplification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect the app from a canvas-based ECS engine to a simple DOM-first creature grid that visually matches the reference HTML showcases, while retaining the physics core and premium HUD design.

**Architecture:** Replace canvas rendering with DOM-based creature elements (SVG/PNG). Replace complex ECS (Entity/EntityStore/EntityFactory/StateMachine) with simple creature arrays. Consolidate 18 HUD files into a single Hud component matching the reference glassmorphism design. Defer effects, audio, content manifests, and subject collection to future phases.

**Tech Stack:** Vite + TypeScript, DOM rendering, CSS glassmorphism, RAF loop

**Reference Files:**
- `docs/superpowers/showcases/grid-scenes/eye-grid.html` — Eye creature grid (SVG DOM)
- `docs/superpowers/showcases/grid-scenes/finger-grid.html` — Finger creature grid (PNG DOM)
- `docs/superpowers/showcases/grid-scenes/cockroach-grid.html` — Cockroach creature grid (PNG DOM)
- `docs/superpowers/showcases/hud-premium.html` — Premium HUD standalone
- `docs/superpowers/showcases/hud-combined.html` — Full HUD with panels
- `docs/superpowers/showcases/filter-panel.html` — Filter panel standalone
- `docs/superpowers/showcases/glass-panel-selector.html` — Gallery panel standalone

---

## 1. Current State Analysis

### What Exists (Over-Engineered)

| Subsystem | Files | Status |
|-----------|-------|--------|
| Canvas Rendering | `Renderer.ts` + 17 drawer files | **REMOVE** — replace with DOM |
| ECS | `Entity.ts`, `EntityStore.ts`, `EntityFactory.ts`, `behaviors/` | **REMOVE** — replace with simple arrays |
| Effects | `EffectSystem.ts`, `ParticleSystem.ts`, `RespawnScheduler.ts`, `effectDefs/` | **DEFER** — not in reference |
| Audio | `AudioEngine.ts`, `ambientBeds.ts`, `musicBed.ts`, `cues/` | **DEFER** — not in reference |
| Powers | `PowerController.ts`, `laserBurn.ts` | **DEFER** — not in reference |
| Content | `manifestLoader.ts`, `schema.ts`, `manifests/` | **DEFER** — not in reference |
| HUD | 18 files (`Hud.ts`, `ControlBar.ts`, `FilterPanel.ts`, `AvatarGallery.ts`, `TextSubjectComposer.ts`, `OverlayLayout.ts`, etc.) | **CONSOLIDATE** — match reference |
| Subject Collection | `SubjectDragSource.ts`, `subjectQueries.ts`, multi-subject targeting | **REMOVE** — replace with draggable avatar |
| Testing Fixtures | `visualFixture.ts`, `eyesFixtures.ts` | **DEFER** — not in reference |
| Physics | `ForceField.ts`, `SpringHome.ts`, `Integrator.ts`, `LookAt.ts` | **KEEP + SIMPLIFY** |
| Engine | `Engine.ts`, `Clock.ts`, `EventBus.ts` | **KEEP + SIMPLIFY** |
| Input | `PointerTracker.ts` | **KEEP** |

### What the Reference HTMLs Show (Target)

1. **DOM-based creatures** — `<div class="wrap"><img>` or `<div class="wrap"><svg>`, NOT canvas
2. **Simple physics** — repulsion from draggable avatar + spring-to-home + damping
3. **Creature rotation** — face AWAY from draggable (`angle = atan2(...) + 180`)
4. **Grid layout** — creatures arranged in COLS×ROWS grid with random scale variation
5. **Draggable avatar** — Tax Tai PNG that creatures repel from
6. **Premium HUD** — glassmorphism toolbar with mode buttons, attack, cockroach, gallery, settings
7. **Filter panel** — popover anchored to settings button (numbers stepper + repel slider)
8. **Gallery panel** — slide-in side panel (sticker/text toggle with card grids)
9. **Background** — radial gradient (`#EBE9E0 → #CDC0B8 → #AA988E`)

### Gap Summary

| Aspect | Current | Target | Action |
|--------|---------|--------|--------|
| Rendering | Canvas | DOM | Replace |
| Entity model | ECS (Entity/Store/Factory) | Simple arrays | Replace |
| Physics | ForceField + Spring + Separation | ForceField + Spring + Damping | Simplify |
| Repulsion source | Cursor | Draggable avatar | Replace |
| Creature rotation | Toward cursor/subject | Away from avatar | Change |
| HUD | 18 files, complex | Single consolidated | Consolidate |
| Panels | OverlayLayout + multiple components | Popover + slide-in | Simplify |
| Effects | Full staged system | None | Defer |
| Audio | Full engine | None | Defer |
| Content | Manifests + schema | Hardcoded | Defer |

---

## 2. New Architecture

### Module Structure

```
src/
  core/
    Engine.ts          — RAF loop (simplified: single tick phase)
    Clock.ts           — Time tracking (keep as-is)
  creatures/
    CreatureGrid.ts    — Manages grid of DOM creatures, spawn/despawn
    creaturePhysics.ts — Per-creature physics update (repulsion + spring + damping)
    EyeCreature.ts     — Eye SVG DOM creature
    BugCreature.ts     — Bug PNG DOM creature
    FingerCreature.ts  — Finger PNG DOM creature
    CockroachCreature.ts — Cockroach PNG DOM creature
    DraggableAvatar.ts — Tax Tai draggable element
    creatureTypes.ts   — Type definitions for creatures
  hud/
    Hud.ts             — Consolidated HUD (all buttons, drag handle, charge ring)
    hud.css            — All HUD styles (glassmorphism, buttons, animations)
    FilterPanel.ts     — Filter panel popover (numbers + repel)
    filterPanel.css    — Filter panel styles
    GalleryPanel.ts    — Gallery panel overlay (sticker/text toggle)
    galleryPanel.css   — Gallery panel styles
    hudIcons.ts        — SVG icon strings (keep from current)
  physics/
    ForceField.ts      — Simplified: repulsion from point (keep core math)
    Integrator.ts      — Semi-implicit Euler (keep as-is)
  input/
    PointerTracker.ts  — Cursor tracking for HUD interactions (keep)
  main.ts              — Simplified orchestrator
  config/
    tokens.ts          — Visual tokens (keep)
    visualTokens.ts    — Token definitions (keep)
    visualTokens.json  — Token values (keep)
```

### Removed Directories

```
src/entities/          — ECS (Entity, EntityStore, EntityFactory, behaviors/)
src/effects/           — Effect system (EffectSystem, ParticleSystem, RespawnScheduler, effectDefs/)
src/powers/            — Power system (PowerController, laserBurn)
src/content/           — Content system (manifestLoader, schema, manifests/)
src/render/            — Canvas rendering (Renderer, drawers/, paperCut, pupilTrack, etc.)
src/audio/             — Audio system (AudioEngine, ambientBeds, musicBed, cues/)
src/testing/           — Visual fixtures (visualFixture, eyesFixtures)
src/styles/            — Global styles (merged into hud/hud.css)
src/assets/            — Asset registries (simplified into creature files)
```

### Data Flow

```
User drags avatar → DraggableAvatar updates position
                    ↓
Engine tick → creaturePhysics.update(creatures, avatarPos)
              ↓
              For each creature:
                - Compute repulsion from avatar (ForceField.compute)
                - Compute spring to home position
                - Integrate velocity + position
                - Update DOM element transform
                    ↓
            requestAnimationFrame → visual update

HUD buttons → mode switch → CreatureGrid.switchMode(mode)
                             ↓
                             Hide/show creature types
Filter panel → quantity/repel changes → CreatureGrid.setQuantity/setRepel
Gallery panel → sticker/text toggle → GalleryPanel visual state
```

### Key Design Decisions

1. **DOM over Canvas** — Creatures are DOM elements (`<div class="wrap"><img/svg>`), matching reference HTMLs. Enables CSS transitions, easier styling, accessibility.

2. **Simple arrays over ECS** — Creatures stored in plain arrays, not EntityStore. No state machines, no lifecycle management. Just `{el, hx, hy, x, y, vx, vy, scale, w, h}`.

3. **Draggable avatar over cursor** — The repulsion source is a draggable PNG element, not the cursor. Matches reference behavior.

4. **Rotation away from avatar** — Creatures rotate to face away from the draggable (`angle = atan2(dy, dx) + 180`), matching reference.

5. **Consolidated HUD** — Single `Hud.ts` file with all buttons, drag handle, charge ring. No ControlBar, no OverlayLayout, no separate components.

6. **Deferred subsystems** — Effects, audio, content manifests, subject collection are NOT implemented. They can be added in future phases.

---

## 3. PR Plan

### PR1: DOM Creature Grid

**Branch:** `refactor/dom-creature-grid`
**Worktree:** `.worktrees/dom-creature-grid`
**Goal:** Replace canvas rendering with DOM-based creature grid. Implement all 4 creature types, physics, draggable avatar, grid layout.

#### Task 1.1: Core Engine Simplification

**Files:**
- Modify: `src/core/Engine.ts`
- Modify: `src/core/Clock.ts` (if needed)
- Test: `tests/unit/engine.test.ts`

- [ ] Simplify Engine to single tick phase (remove pre-physics/post-physics/render phases)
- [ ] Keep Clock as-is
- [ ] Update tests

#### Task 1.2: Creature Type Definitions

**Files:**
- Create: `src/creatures/creatureTypes.ts`
- Test: `tests/unit/creatureTypes.test.ts`

- [ ] Define `Creature` interface: `{el: HTMLElement, hx: number, hy: number, x: number, y: number, vx: number, vy: number, scale: number, w: number, h: number}`
- [ ] Define `CreatureMode` type: `'eyes' | 'bugs' | 'pointedFinger' | 'cockroach'`
- [ ] Define `CreatureGrid` interface: `{creatures: Creature[], mode: CreatureMode, cols: number, rows: number}`

#### Task 1.3: Creature Physics

**Files:**
- Create: `src/creatures/creaturePhysics.ts`
- Modify: `src/physics/ForceField.ts` (simplify)
- Test: `tests/unit/creaturePhysics.test.ts`

- [ ] Implement `updateCreature(creature, avatarPos, repelRadius, repelStrength, springStrength, damping)` — matches reference physics
- [ ] Simplify ForceField.compute to match reference: `f = (1 - dist/repelRadius) * repelStrength`
- [ ] Spring-to-home: `fx = (homeX - x) * springStrength`
- [ ] Damping: `vx = (vx + fx) * damping`
- [ ] Rotation: `angle = atan2(avatarY - y, avatarX - x) * (180/Math.PI) + 180`

#### Task 1.4: Eye Creature (SVG DOM)

**Files:**
- Create: `src/creatures/EyeCreature.ts`
- Create: `public/creatures/eye.svg` (copy from `docs/superpowers/showcases/grid-scenes/eye.svg`)
- Test: `tests/unit/eyeCreature.test.ts`

- [ ] Implement `createEyeCreature(x, y, scale)` — creates DOM element with inline SVG
- [ ] SVG has movable pupil (circle element) that tracks toward avatar
- [ ] Blink animation (scaleY on the eye)
- [ ] Random pupil color from palette

#### Task 1.5: Bug Creature (PNG DOM)

**Files:**
- Create: `src/creatures/BugCreature.ts`
- Create: `public/creatures/bug.png` (extract from current assets or reference)
- Test: `tests/unit/bugCreature.test.ts`

- [ ] Implement `createBugCreature(x, y, scale)` — creates DOM element with `<img>` tag
- [ ] Rotation faces away from avatar
- [ ] Natural dimensions: check reference for `NAT_W`, `NAT_H`

#### Task 1.6: Finger Creature (PNG DOM)

**Files:**
- Create: `src/creatures/FingerCreature.ts`
- Copy: `public/creatures/finger.png` from `docs/superpowers/showcases/grid-scenes/finger.png`
- Test: `tests/unit/fingerCreature.test.ts`

- [ ] Implement `createFingerCreature(x, y, scale)` — creates DOM element with `<img>` tag
- [ ] Rotation faces away from avatar
- [ ] Natural dimensions: `NAT_W=405, NAT_H=171` (from reference)

#### Task 1.7: Cockroach Creature (PNG DOM)

**Files:**
- Create: `src/creatures/CockroachCreature.ts`
- Copy: `public/creatures/cockroach.png` from `docs/superpowers/showcases/grid-scenes/cockroach.png`
- Test: `tests/unit/cockroachCreature.test.ts`

- [ ] Implement `createCockroachCreature(x, y, scale)` — creates DOM element with `<img>` tag
- [ ] Rotation faces away from avatar
- [ ] Natural dimensions: `NAT_W=420, NAT_H=216` (from reference)

#### Task 1.8: Creature Grid Manager

**Files:**
- Create: `src/creatures/CreatureGrid.ts`
- Test: `tests/unit/creatureGrid.test.ts`

- [ ] Implement `CreatureGrid` class: manages array of creatures, spawn/despawn, mode switching
- [ ] `spawn(mode, cols, rows, viewportWidth, viewportHeight)` — creates grid of creatures
- [ ] `setQuantity(n)` — add/remove creatures to match target count
- [ ] `switchMode(mode)` — hide current creatures, show new mode's creatures
- [ ] `update(avatarPos, repelMultiplier)` — update all creature physics
- [ ] Random scale variation: `scale = 0.08 + Math.pow(Math.random(), 1.5) * 0.35`

#### Task 1.9: Draggable Avatar

**Files:**
- Create: `src/creatures/DraggableAvatar.ts`
- Copy: `public/avatars/tax-tai.png` from `public/avatars/Designer (1).png`
- Test: `tests/unit/draggableAvatar.test.ts`

- [ ] Implement `DraggableAvatar` class: draggable PNG element
- [ ] Mouse + touch drag support
- [ ] Exposes `getPosition(): {x, y}` for physics
- [ ] Visual: 140px width, drop-shadow, grab cursor

#### Task 1.10: Wire to main.ts

**Files:**
- Modify: `src/main.ts`
- Delete: `src/render/` (entire directory)
- Delete: `src/entities/` (entire directory)
- Delete: `src/effects/` (entire directory)
- Delete: `src/powers/` (entire directory)
- Delete: `src/content/` (entire directory)
- Delete: `src/audio/` (entire directory)
- Delete: `src/testing/` (entire directory)
- Delete: `src/styles/` (merge into hud.css)
- Delete: `src/assets/` (simplified into creature files)

- [ ] Replace canvas element with DOM container in `index.html`
- [ ] Initialize CreatureGrid, DraggableAvatar
- [ ] Wire Engine tick to creature physics update
- [ ] Remove all imports to deleted modules
- [ ] Verify: creatures appear in grid, react to draggable avatar

#### Task 1.11: Background + Responsive

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`

- [ ] Set background to radial gradient: `radial-gradient(circle, #EBE9E0 0%, #CDC0B8 65%, #AA988E 100%)`
- [ ] Handle viewport resize (recalculate grid positions)
- [ ] Mobile responsive (adjust cols/rows for small screens)

**PR1 Verification:**
- [ ] `npm run build` passes
- [ ] `npm test` passes (with updated tests)
- [ ] Visual: creatures appear in grid, react to draggable avatar, rotate correctly
- [ ] Visual: matches reference HTML behavior

---

### PR2: HUD Consolidation

**Branch:** `refactor/hud-consolidation`
**Worktree:** `.worktrees/hud-consolidation`
**Goal:** Replace 18 HUD files with a single consolidated Hud component matching the reference premium HUD design.

#### Task 2.1: Consolidated Hud.ts

**Files:**
- Create: `src/hud/Hud.ts` (new consolidated version)
- Delete: `src/hud/ControlBar.ts`
- Delete: `src/hud/AvatarGallery.ts`
- Delete: `src/hud/TextSubjectComposer.ts`
- Delete: `src/hud/OverlayLayout.ts`
- Delete: `src/hud/AudioControl.ts`
- Delete: `src/hud/subjectSkinRegistry.ts`
- Delete: `src/hud/textFontRegistry.ts`
- Delete: `src/hud/avatarAssetRegistry.ts`
- Delete: `src/hud/controlBar.css`
- Delete: `src/hud/avatarGallery.css`
- Delete: `src/hud/textComposer.css`
- Delete: `src/hud/overlayLayout.css`
- Delete: `src/hud/audioControl.css`
- Delete: `src/hud/hud.css` (old version)

- [ ] Create single `Hud.ts` class that builds the entire HUD DOM structure
- [ ] Match reference HTML structure exactly:
  - Drag handle (6-dot grip icon)
  - Mode buttons: eye, bug, hand (with active gradient backgrounds)
  - Attack button (gradient, Bungee font)
  - Cockroach button
  - Gallery button
  - Settings button
- [ ] Mode button click → switch active mode, emit event
- [ ] Attack button → emit press/release events
- [ ] Drag handle → HUD repositioning (mouse + touch)
- [ ] Tooltips on hover (data-tooltip attribute)

#### Task 2.2: HUD CSS

**Files:**
- Create: `src/hud/hud.css` (new consolidated version)

- [ ] Copy all styles from reference `hud-premium.html` / `hud-premium.css`
- [ ] Glassmorphism: `backdrop-filter: blur(30px)`, `background: rgba(255,255,255,0.7)`
- [ ] Button styles: mode buttons with active gradients, attack button gradient
- [ ] Animations: entrance (slide-up), button pop, staggered delays
- [ ] Responsive: mobile breakpoints (768px, 380px)
- [ ] Reduced motion: disable animations
- [ ] Magnetic hover effect on buttons (translate toward cursor)

#### Task 2.3: HUD Icons

**Files:**
- Modify: `src/hud/hudIcons.ts` (keep, ensure all icons present)

- [ ] Verify all SVG icons match reference:
  - Eye icon
  - Bug icon
  - Hand/point icon
  - Cockroach icon
  - Gallery icon
  - Settings icon
  - Drag handle icon

#### Task 2.4: Wire HUD to CreatureGrid

**Files:**
- Modify: `src/main.ts`
- Modify: `src/hud/Hud.ts`

- [ ] HUD mode change → CreatureGrid.switchMode(mode)
- [ ] HUD attack press/release → (deferred, no-op for now)
- [ ] HUD quantity change → CreatureGrid.setQuantity(n)
- [ ] HUD repel change → update repelMultiplier

#### Task 2.5: Charge Ring (Deferred)

**Files:**
- Modify: `src/hud/Hud.ts`

- [ ] Add charge ring element (visual only, no logic yet)
- [ ] Expose `setCharge(progress, visible)` method (no-op for now)

**PR2 Verification:**
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Visual: HUD matches reference `hud-premium.html` exactly
- [ ] Visual: mode buttons switch active state with gradients
- [ ] Visual: attack button has gradient, hover, active states
- [ ] Visual: HUD is draggable via handle
- [ ] Visual: tooltips appear on hover
- [ ] Visual: entrance animations work

---

### PR3: Panels (Filter + Gallery)

**Branch:** `refactor/panels`
**Worktree:** `.worktrees/panels`
**Goal:** Implement filter panel popover and gallery panel overlay matching reference designs.

#### Task 3.1: Filter Panel

**Files:**
- Create: `src/hud/FilterPanel.ts` (simplified version)
- Create: `src/hud/filterPanel.css`
- Delete: `src/hud/FilterPanel.ts` (old version)

- [ ] Implement filter panel as popover anchored to settings button
- [ ] Match reference `filter-panel.html` structure:
  - Numbers section: stepper with +/- buttons, value display
  - Divider
  - Repel section: slider (range input)
- [ ] Position: above settings button, centered
- [ ] Open/close: click settings button to toggle, click outside to close, Escape to close
- [ ] Quantity stepper: min=10, max=220, step=10
- [ ] Repel slider: min=0, max=2, step=0.05
- [ ] Emit events: `onQuantityChange`, `onRepelChange`

#### Task 3.2: Filter Panel CSS

**Files:**
- Create: `src/hud/filterPanel.css`

- [ ] Copy styles from reference `filter-panel.html`
- [ ] Glassmorphism: `backdrop-filter: blur(30px)`, `background: rgba(255,255,255,0.7)`
- [ ] Stepper buttons: hover, active, focus states
- [ ] Value display: Space Mono font, white background
- [ ] Repel slider: custom thumb (white circle with border)
- [ ] Entrance animation: fade + slide up
- [ ] Responsive: mobile breakpoints

#### Task 3.3: Gallery Panel

**Files:**
- Create: `src/hud/GalleryPanel.ts`
- Create: `src/hud/galleryPanel.css`

- [ ] Implement gallery panel as slide-in side panel
- [ ] Match reference `glass-panel-selector.html` / `hud-combined.html` structure:
  - Toggle section: Sticker/Text buttons
  - Sticker grid: 2-column grid with cards (placeholders for now)
  - Text grid: 1-column grid with cards (Fraunces font)
- [ ] Position: right side, full height
- [ ] Open/close: click gallery button to toggle, click outside to close, Escape to close
- [ ] Toggle between sticker/text modes
- [ ] Card hover effects: lift, scale, radial gradient follow cursor
- [ ] Staggered entrance animations

#### Task 3.4: Gallery Panel CSS

**Files:**
- Create: `src/hud/galleryPanel.css`

- [ ] Copy styles from reference `hud-combined.html` (glass-panel section)
- [ ] Glassmorphism panel
- [ ] Toggle buttons: active state with white background
- [ ] Sticker cards: aspect-ratio 1, hover lift + scale
- [ ] Text cards: Fraunces font, hover slide + gradient sweep
- [ ] Card entrance animations: staggered fade + slide up
- [ ] Responsive: mobile breakpoints (380px)

#### Task 3.5: Wire Panels to HUD

**Files:**
- Modify: `src/main.ts`
- Modify: `src/hud/Hud.ts`

- [ ] Settings button click → toggle FilterPanel
- [ ] Gallery button click → toggle GalleryPanel
- [ ] FilterPanel quantity change → CreatureGrid.setQuantity(n)
- [ ] FilterPanel repel change → update repelMultiplier
- [ ] GalleryPanel sticker/text toggle → visual state (no functional change yet)
- [ ] Close panels when other opens (mutual exclusion)
- [ ] Close panels on Escape key

**PR3 Verification:**
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Visual: filter panel appears above settings button
- [ ] Visual: filter panel has stepper + slider matching reference
- [ ] Visual: gallery panel slides in from right
- [ ] Visual: gallery panel has sticker/text toggle
- [ ] Visual: card hover effects work
- [ ] Visual: panels close on outside click / Escape
- [ ] Visual: entrance animations work

---

### PR4: Integration + Cleanup

**Branch:** `refactor/integration-cleanup`
**Worktree:** `.worktrees/integration-cleanup`
**Goal:** Wire everything together, remove all dead code, update documentation, final visual verification.

#### Task 4.1: Remove Dead Code

**Files:**
- Delete: All files in directories marked for deletion in PR1
- Delete: All test files for deleted modules
- Modify: `src/main.ts` — remove all imports to deleted modules

- [ ] Remove all imports to deleted modules in main.ts
- [ ] Delete test files:
  - `tests/unit/EffectSystem.test.ts`
  - `tests/unit/SubjectBehavior.test.ts`
  - `tests/unit/ambientBedTrack.test.ts`
  - `tests/unit/ambientBeds.test.ts`
  - `tests/unit/audioControl.test.ts`
  - `tests/unit/audioCueIdConsistency.test.ts`
  - `tests/unit/audioCueRegistry.test.ts`
  - `tests/unit/audioEngine.test.ts`
  - `tests/unit/avatarGallery.test.ts`
  - `tests/unit/behavior.test.ts`
  - `tests/unit/boot-wiring.test.ts`
  - `tests/unit/boot.test.ts`
  - `tests/unit/bugEat.test.ts`
  - `tests/unit/bugEatCues.test.ts`
  - `tests/unit/chargeRespawnCues.test.ts`
  - `tests/unit/collectiveContributors.test.ts`
  - `tests/unit/controlBar.test.ts`
  - `tests/unit/crowdAssetRegistry.test.ts`
  - `tests/unit/crowdAttackStagePresentation.test.ts`
  - `tests/unit/crowdCursorAndLockPresentation.test.ts`
  - `tests/unit/crowdFieldAndGazeLines.test.ts`
  - `tests/unit/crowdSubjectRegistry.test.ts`
  - `tests/unit/damageCueWiring.test.ts`
  - `tests/unit/dragController.test.ts`
  - `tests/unit/drawBug.test.ts`
  - `tests/unit/drawCollectiveEffectVisual.test.ts`
  - `tests/unit/drawCursor.test.ts`
  - `tests/unit/drawEye.test.ts`
  - `tests/unit/drawFieldLines.test.ts`
  - `tests/unit/drawGazeLines.test.ts`
  - `tests/unit/drawLockIndicator.test.ts`
  - `tests/unit/drawPointedFinger.test.ts`
  - `tests/unit/drawSubject.test.ts`
  - `tests/unit/drawSubjectAvatar.test.ts`
  - `tests/unit/drawSubjectFigureFigma.test.ts`
  - `tests/unit/drawSubjectLotusFigma.test.ts`
  - `tests/unit/drawSubjectPlaceholders.test.ts`
  - `tests/unit/drawSubjectSkins.test.ts`
  - `tests/unit/drawSubjectText.test.ts`
  - `tests/unit/drawSubjectTextFigma.test.ts`
  - `tests/unit/effectSystemAudio.test.ts`
  - `tests/unit/effects.test.ts`
  - `tests/unit/electricBurn.test.ts`
  - `tests/unit/electricBurnCues.test.ts`
  - `tests/unit/entityFactory.test.ts`
  - `tests/unit/entityFactoryQuantity.test.ts`
  - `tests/unit/entityFactorySubject.test.ts`
  - `tests/unit/entityStore.test.ts`
  - `tests/unit/figmaAssetAudit.test.ts`
  - `tests/unit/figmaAssetRegistry.test.ts`
  - `tests/unit/filterPanel.test.ts` (old version)
  - `tests/unit/forceFieldSeparation.test.ts`
  - `tests/unit/grain.test.ts`
  - `tests/unit/hud.test.ts` (old version)
  - `tests/unit/hudControls.test.ts`
  - `tests/unit/hudCues.test.ts`
  - `tests/unit/hudIcons.test.ts`
  - `tests/unit/imageAssets.test.ts`
  - `tests/unit/laserBurn.test.ts`
  - `tests/unit/laserBurnBeam.test.ts`
  - `tests/unit/laserBurnCues.test.ts`
  - `tests/unit/laserBurnRespawnDelay.test.ts`
  - `tests/unit/mainSubjectCollection.test.ts`
  - `tests/unit/mainSubjectSkinWiring.test.ts`
  - `tests/unit/mainSubjectWiring.test.ts`
  - `tests/unit/manifestLoader.test.ts`
  - `tests/unit/musicBed.test.ts`
  - `tests/unit/overlayLayout.test.ts`
  - `tests/unit/overlayVariant.test.ts`
  - `tests/unit/paperCut.test.ts`
  - `tests/unit/powerController.test.ts`
  - `tests/unit/pupilTrack.test.ts`
  - `tests/unit/rendererCrowdDispatch.test.ts`
  - `tests/unit/rendererModeDispatch.test.ts`
  - `tests/unit/rendererSubject.test.ts`
  - `tests/unit/rendererSubjects.test.ts`
  - `tests/unit/respawn.test.ts`
  - `tests/unit/responsiveCss.test.ts`
  - `tests/unit/responsiveScene.test.ts`
  - `tests/unit/roster.test.ts`
  - `tests/unit/scaffold-cleanup.test.ts`
  - `tests/unit/schemaEyeAsset.test.ts`
  - `tests/unit/schemaRename.test.ts`
  - `tests/unit/schemaSubjectSkin.test.ts`
  - `tests/unit/smoke.test.ts`
  - `tests/unit/subjectDragSource.test.ts`
  - `tests/unit/subjectManifest.test.ts`
  - `tests/unit/subjectQueries.test.ts`
  - `tests/unit/subjectSkinRegistry.test.ts`
  - `tests/unit/synthToolkit.test.ts`
  - `tests/unit/textSubjectComposer.test.ts`
  - `tests/unit/visualAssetReadiness.test.ts`
  - `tests/unit/visualFixture.test.ts`
- [ ] Keep test files:
  - `tests/unit/core.test.ts`
  - `tests/unit/physics.test.ts`
  - `tests/unit/integrator.test.ts`
  - `tests/unit/lookAt.test.ts`
  - `tests/unit/pointerTracker.test.ts`
  - `tests/unit/tokens.test.ts`
  - `tests/unit/barrels.test.ts`
  - All new test files from PR1-PR3

#### Task 4.2: Update ADRs

**Files:**
- Modify: `docs/superpowers/system-architecture.md`

- [ ] Update ADR 001 (Component-as-Data): Mark as superseded — replaced with DOM-first approach
- [ ] Update ADR 002 (Shared Physics): Keep, update to reflect simplified physics
- [ ] Update ADR 003 (Staged Effect System): Mark as deferred
- [ ] Update ADR 004 (DOM HUD): Keep, update to reflect consolidated HUD
- [ ] Update ADR 005 (Mode-locked power pairing): Mark as deferred
- [ ] Update ADR 006 (Pairwise separation): Mark as deferred
- [ ] Update ADR 007 (Canvas + TypeScript): Mark as superseded — replaced with DOM rendering
- [ ] Update ADR 008 (Content guardrail): Mark as deferred
- [ ] Update ADR 009 (Curated avatar guardrail): Mark as deferred
- [ ] Update ADR 010 (Multi-subject targeting): Mark as superseded — replaced with draggable avatar
- [ ] Add ADR 011: DOM-first creature rendering
- [ ] Add ADR 012: Simplified physics (repulsion + spring + damping)
- [ ] Add ADR 013: Consolidated HUD component
- [ ] Update Core Definitions table
- [ ] Update System Relationships diagram

#### Task 4.3: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] Update Layout section to reflect new structure
- [ ] Remove references to deleted modules
- [ ] Update conventions if needed

#### Task 4.4: Final Visual Verification

**Files:**
- None (manual verification)

- [ ] Compare app visually against reference HTMLs:
  - `eye-grid.html` — creature grid behavior
  - `finger-grid.html` — creature grid behavior
  - `cockroach-grid.html` — creature grid behavior
  - `hud-premium.html` — HUD design
  - `hud-combined.html` — full HUD with panels
  - `filter-panel.html` — filter panel design
  - `glass-panel-selector.html` — gallery panel design
- [ ] Verify creature physics matches reference (repulsion, spring, damping, rotation)
- [ ] Verify HUD interactions match reference (mode switching, drag, tooltips)
- [ ] Verify panel interactions match reference (open/close, animations)
- [ ] Verify responsive behavior on mobile viewports
- [ ] Verify reduced-motion behavior

#### Task 4.5: Clean Up Worktrees

- [ ] Merge all PRs to main
- [ ] Delete worktree branches
- [ ] Delete local worktree directories
- [ ] Verify clean git status

**PR4 Verification:**
- [ ] `npm run build` passes
- [ ] `npm test` passes (all remaining tests)
- [ ] No dead code remains
- [ ] Documentation updated
- [ ] Visual parity with reference HTMLs confirmed

---

## 4. Execution Strategy

### Worktree Setup

Each PR gets its own worktree:

```bash
# PR1
git worktree add .worktrees/dom-creature-grid -b refactor/dom-creature-grid

# PR2 (after PR1 merged)
git worktree add .worktrees/hud-consolidation -b refactor/hud-consolidation

# PR3 (after PR2 merged)
git worktree add .worktrees/panels -b refactor/panels

# PR4 (after PR3 merged)
git worktree add .worktrees/integration-cleanup -b refactor/integration-cleanup
```

### Sub-Agent Dispatch

Within each PR, dispatch sub-agents for each task:

```
PR1: DOM Creature Grid
  ├─ Agent 1: Task 1.1 (Engine simplification)
  ├─ Agent 2: Task 1.2 (Creature types) — parallel with 1.1
  ├─ Agent 3: Task 1.3 (Creature physics) — parallel with 1.1, 1.2
  ├─ Agent 4: Task 1.4 (Eye creature) — after 1.2, 1.3
  ├─ Agent 5: Task 1.5 (Bug creature) — parallel with 1.4
  ├─ Agent 6: Task 1.6 (Finger creature) — parallel with 1.4, 1.5
  ├─ Agent 7: Task 1.7 (Cockroach creature) — parallel with 1.4-1.6
  ├─ Agent 8: Task 1.8 (Creature grid) — after 1.4-1.7
  ├─ Agent 9: Task 1.9 (Draggable avatar) — parallel with 1.8
  └─ Agent 10: Task 1.10-1.11 (Wire + responsive) — after 1.8, 1.9
```

### Review Checkpoints

After each task:
1. Implementer subagent completes task, writes tests, commits
2. Spec reviewer subagent verifies task matches spec
3. Code quality reviewer subagent verifies code quality
4. If issues found, implementer fixes, re-review
5. Mark task complete, move to next

### PR Flow

After all tasks in a PR:
1. Run `npm run build` — must pass
2. Run `npm test` — must pass
3. Visual verification against reference HTMLs
4. Push branch to GitHub
5. Create PR
6. After review/merge, sync local main
7. Clean up worktree

---

## 5. Cleanup Checklist

### Directories to Delete

- [ ] `src/entities/` — ECS
- [ ] `src/effects/` — Effect system
- [ ] `src/powers/` — Power system
- [ ] `src/content/` — Content system
- [ ] `src/render/` — Canvas rendering
- [ ] `src/audio/` — Audio system
- [ ] `src/testing/` — Visual fixtures
- [ ] `src/styles/` — Global styles (merged into hud.css)
- [ ] `src/assets/` — Asset registries

### Files to Delete

- [ ] `src/hud/ControlBar.ts`
- [ ] `src/hud/AvatarGallery.ts`
- [ ] `src/hud/TextSubjectComposer.ts`
- [ ] `src/hud/OverlayLayout.ts`
- [ ] `src/hud/AudioControl.ts`
- [ ] `src/hud/subjectSkinRegistry.ts`
- [ ] `src/hud/textFontRegistry.ts`
- [ ] `src/hud/avatarAssetRegistry.ts`
- [ ] `src/hud/controlBar.css`
- [ ] `src/hud/avatarGallery.css`
- [ ] `src/hud/textComposer.css`
- [ ] `src/hud/overlayLayout.css`
- [ ] `src/hud/audioControl.css`
- [ ] `src/input/DragController.ts`
- [ ] `src/input/SubjectDragSource.ts`
- [ ] `src/input/PowerController.ts`
- [ ] `src/physics/SpringHome.ts` (simplified into creaturePhysics.ts)
- [ ] `src/physics/LookAt.ts` (simplified into creaturePhysics.ts)
- [ ] `src/core/EventBus.ts` (simplified out of Engine)
- [ ] `src/config/visualTokens.json` (if merged into visualTokens.ts)

### Test Files to Delete

- [ ] All test files listed in Task 4.1

### Documentation to Update

- [ ] `docs/superpowers/system-architecture.md` — Update ADRs, definitions, data flow
- [ ] `AGENTS.md` — Update layout, conventions
- [ ] `README.md` — Update if needed

---

## 6. Deferred Subsystems

These subsystems are NOT implemented in this refactor. They can be added in future phases:

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Effects (laser burn, electric burn, bug eat) | Deferred | Not in reference HTMLs |
| Audio (ambient beds, music, cues) | Deferred | Not in reference HTMLs |
| Content manifests (JSON rosters, schema) | Deferred | Creatures are hardcoded for now |
| Subject collection (drag-to-place, tap-to-lock) | Deferred | Replaced with draggable avatar |
| Power controller (charge, cooldown) | Deferred | Attack button is visual only |
| Particle system | Deferred | Not in reference HTMLs |
| Visual fixture testing | Deferred | Not in reference HTMLs |
| Pairwise separation | Deferred | Can be added later if needed |
| Field lines / gaze lines | Deferred | Visual polish, not in reference |
| Lock indicator | Deferred | Not in reference HTMLs |
| Collective effect visuals | Deferred | Not in reference HTMLs |

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Visual mismatch with reference | Compare against reference HTMLs at each PR |
| Physics behavior mismatch | Port exact physics from reference HTMLs |
| Breaking existing functionality | Defer complex features, focus on visual parity |
| Test coverage gaps | Write tests for new modules, delete tests for removed modules |
| Performance regression (DOM vs Canvas) | DOM is fine for ~200 creatures (reference uses this approach) |

---

## 8. Success Criteria

1. **Visual parity** — App looks identical to reference HTMLs
2. **Behavioral parity** — Creatures react to draggable avatar exactly like reference
3. **HUD parity** — HUD matches reference premium design exactly
4. **Panel parity** — Filter and gallery panels match reference designs
5. **Code simplicity** — Far fewer files, no ECS, no canvas rendering
6. **Test coverage** — All new modules have tests
7. **Documentation** — ADRs and architecture docs updated

---

## 9. Future Phases (Out of Scope)

After this refactor is complete, future phases can add:

1. **Effects Phase** — Implement laser burn, electric burn, bug eat effects
2. **Audio Phase** — Implement audio engine, ambient beds, music, cues
3. **Content Phase** — Implement manifest system, schema validation
4. **Subject Phase** — Implement subject collection, drag-to-place, tap-to-lock
5. **Power Phase** — Implement power controller, charge/cooldown
6. **Polish Phase** — Field lines, gaze lines, lock indicators, collective effects

Each future phase should follow the same pattern: spec → plan → PR → review → merge.
