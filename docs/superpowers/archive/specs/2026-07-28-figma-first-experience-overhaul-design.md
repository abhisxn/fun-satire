# Figma-First Experience Overhaul Design

**Date:** 2026-07-28
**Status:** Approved design; ready for implementation planning
**Figma source:** [Untitled, page `0:1`](https://www.figma.com/design/oPAdd7oWLQVMTP1v6pJOW0/Untitled?node-id=0-1)

## 1. Purpose

Rebuild the complete Fun Satire visual experience around the supplied Figma file. The result must preserve the existing simulation, physics, content registries, and effect lifecycles while replacing the visually divergent stage, crowd artwork, subjects, attacks, HUD, panels, controls, motion, and responsive behavior.

This is a Figma-first correction, not another interpretation of the existing paper-cut HUD rules.

## 2. Decisions

The user approved these governing decisions:

1. Figma is the visual source of truth when it conflicts with prior visual specifications.
2. The sprint covers the whole experience, not only the HUD.
3. Smaller screens use an adaptive composition rather than a proportionally scaled desktop layout.
4. Exact Figma SVG and PNG artwork is exported and self-hosted wherever available.
5. Implementation uses a fidelity-first vertical slice before parallel worktree lanes begin.
6. Mobile crowd assets are relatively smaller to preserve density.
7. Mobile HUD controls remain visually prominent and use interaction targets of at least 44 by 44 CSS pixels.
8. Scene-asset scale and control scale are independent responsive systems.

## 3. Source Frames

The following Figma nodes define the reference system:

| Node | Role |
| --- | --- |
| `0:1` | Page-level inventory and visual language |
| `18:113` | Canonical 1280 by 832 eyes scene and bottom control bar |
| `44:287` | Canonical bugs scene |
| `46:905` | Canonical pointed-finger scene |
| `103:3402` | Scene with filter panel and avatar gallery |
| `103:2490` | Canonical control-icon component set |
| `103:3579` | Quantity and repel panel |
| `103:3593` | Avatar gallery |
| `109:3669` | Collective attack presentation |

Figma exposes no variable definitions for page `0:1`. App-owned semantic tokens must therefore be derived from measured Figma values and recorded in the implementation.

## 4. Why The Previous Overhaul Failed

The earlier work failed at the contract boundary rather than through a Git revert.

1. The only commit explicitly tuned against Figma changed the standalone `design-dummy`, not the production application.
2. The production premium-HUD specification banned gradients, glows, glass surfaces, backdrop blur, extra colors, and additional UI typefaces.
3. The actual Figma controls use translucent white glass, blur, gradients, soft elevation, active green wells, and a Bungee attack label.
4. Later plans required the Figma control-bar layout while retaining the contradictory paper-cut restrictions.
5. The current HUD became an approximately 820px all-in-one paper placard instead of the Figma 542 by 70 control capsule with separate contextual panels.
6. The current test suite verifies callbacks, selectors, source strings, and mocked Canvas calls, but not computed geometry, rendered pixels, browser behavior, or Figma parity.
7. Several tests explicitly enforce the divergent palette, typography, and torn-paper HUD.
8. Parallel implementation lanes converged through `main.ts`, `Renderer.ts`, and HUD-local state without deterministic integration fixtures.

This specification resolves those conflicts. Its visual requirements supersede the visual-material and typography restrictions in:

- `docs/superpowers/specs/2026-07-25-subject-browser-premium-hud-design.md`
- `docs/superpowers/specs/2026-07-27-premium-visual-collective-attack-design.md`

Their non-conflicting behavioral and architecture requirements remain valid.

## 5. Scope

### 5.1 In Scope

- Full-viewport stage background and atmosphere
- Exact eye, bug, and pointed-finger crowd artwork
- Dynamic crowd transforms, gaze, and motion using existing simulation state
- Central illustrated, avatar, and text subjects
- Collective attack visuals for all modes
- Bottom control bar
- Quantity and repel filter panel
- Avatar gallery
- Text-subject composition surface
- Audio-control integration
- HUD icons and states
- Desktop, tablet, portrait-phone, and landscape-phone composition
- Keyboard, pointer, touch, focus, selected, disabled, expanded, and reduced-motion states
- Deterministic browser fixtures
- Unit, browser, accessibility, responsive, screenshot, and Figma-overlay validation
- Narrow interaction repairs required to make approved visual states reachable and testable

### 5.2 Out Of Scope

- Physics-equation changes
- Force-field redesign
- Entity-store migration
- State-machine redesign
- Effect lifecycle or destruction-timing redesign
- New crowd modes
- New subject content not present in the current registries or Figma source
- A general rendering-platform rewrite
- Unrelated architecture cleanup

## 6. Visual Language

### 6.1 Stage

The stage is full viewport and remains a one-CSS-pixel Canvas coordinate plane. It must not gain CSS transforms, margins, or a scaled wrapper.

The reference background is a quiet radial neutral field:

- Center near `#EBE9E0`
- Mid field near `#CDC0B8`
- Outer field near `#AA988E`

A restrained paper/noise texture may be retained if it does not materially alter the Figma colors, glass contrast, or screenshot parity. Grain is an atmospheric layer, not the defining HUD material.

### 6.2 Crowd

Crowd assets use exact, self-hosted Figma artwork. Approximate geometric redraws are not acceptable when source artwork exists.

For eyes, source layers are exported or decomposed so the Figma sclera, iris treatment, silhouette, and crop remain exact while the existing live pupil-offset behavior continues. The implementation may cache rasterized or path-ready forms for Canvas performance, but the source geometry remains canonical.

Physics continues to own entity centers, velocity, rotation, scale, and separation. Visual code must fit artwork into declared visual envelopes so antennas, hands, shadows, and rotated silhouettes do not create unbounded overlap.

### 6.3 Subjects

The central subject remains the primary focal point. Illustrated subjects, avatars, and text subjects continue to use their current registries and rendering dispatch.

Source avatar crops, padding, and scale should match Figma. Export metadata such as `Frame 38` or `Designer 1` must never appear as visible product labels.

### 6.4 Attacks

Each mode uses the mapped Figma attack composition. Attack contributors must visually converge on the active target when the design calls for convergence. Effects must remain driven by existing effect-system stages and timestamps.

Visual drawers may change geometry, paint, glow, masks, and compositing. They must not change attack timing, targeting ownership, damage, destruction, or respawn behavior.

### 6.5 UI Surfaces

HUD surfaces use a coherent translucent overlay family:

- White surface near 70 percent opacity
- White hairline border
- Approximately 30px backdrop blur where performance allows
- Concentric radii
- Soft neutral elevation
- A white lower highlight on the main capsule

Torn-paper silhouettes and heavy grain are not default HUD surfaces.

### 6.6 Typography

UI typography follows Figma roles:

- Compact neutral sans serif for labels and values
- Bungee Regular or the exact Figma equivalent for the uppercase Attack label
- Current decorative subject fonts remain available only for text-subject content

Core HUD typography and optional subject typography use separate loading boundaries.

## 7. Composition Contract

### 7.1 Desktop Reference

At 1280 by 832:

- The crowd forms a full-bleed theatrical ring around one central subject.
- The primary control bar is centered near the bottom.
- The control bar is approximately 542 by 70 pixels.
- Quantity and repel live in a separate 139 by 170 contextual panel.
- The avatar browser is a separate 284px-wide two-column gallery.
- Contextual panels never permanently expand the main control bar.
- The UI floats above the stage without enclosing it.

### 7.2 Mobile Reference

At portrait-phone sizes:

- More crowd entities remain visible by rendering scene artwork relatively smaller than in the first companion mockup.
- The target remains legible and unobscured.
- The primary control island remains near the bottom safe area.
- Visible control wells remain approximately 46px and never fall below a 44px interaction target.
- Quantity and repel become an anchored bottom sheet.
- The avatar gallery becomes a touch-safe sheet with a visible peek state.
- Scene density and UI ergonomics use separate responsive tokens.

At landscape-phone sizes:

- The gallery may become a horizontal tray.
- Controls remain reachable without obscuring the target.
- Safe-area insets are honored.
- The stage is not letterboxed or CSS-scaled.

## 8. Component Architecture

### 8.1 Existing Boundary

The current Canvas/DOM split remains authoritative:

- Canvas owns the stage, crowd, subjects, particles, attacks, lock visuals, and custom cursor.
- DOM owns semantic controls, panels, focus, keyboard behavior, labels, selected/open/disabled states, and responsive overlay layout.
- `src/main.ts` remains the sole composition adapter between HUD intent, simulation state, and render snapshots.

### 8.2 DOM Components

The current all-in-one HUD is decomposed conceptually into:

1. `ControlBar`
2. `FilterPanel`
3. `AvatarGallery`
4. `TextSubjectComposer`
5. `AudioControl`
6. `OverlayLayout`

`Hud` coordinates these pieces through explicit typed APIs. It must not dispatch synthetic clicks or rely on document-wide selectors to make one component operate another.

Markup and CSS selectors are one contract. The same worktree lane owns each component's markup, styles, accessibility states, and component tests.

### 8.3 Canvas Components

Canvas changes remain concentrated in leaf drawers and asset helpers:

- `drawEye.ts`
- `drawBug.ts`
- `drawPointedFinger.ts`
- Subject drawers
- `drawCollectiveEffectVisual.ts`
- Cursor and lock drawers
- Asset decoding and drawing helpers

`Renderer.ts` keeps paint-order and dispatch ownership. One serial integration owner handles any renderer changes after leaf drawers are approved.

### 8.4 Closed Files

Routine visual work must not modify:

- `src/core/Engine.ts`
- `src/physics/ForceField.ts`
- `src/entities/EntityStore.ts`
- `src/entities/behaviors/StateMachine.ts`

Any exception requires a documented architecture justification and independent review before implementation.

## 9. Assets And Tokens

### 9.1 Asset Policy

- Export exact Figma SVG and PNG assets.
- Store them under a semantic project-owned path such as `public/assets/figma/`.
- Never depend on `localhost:3845` at runtime.
- Use typed registries for crowd artwork, control icons, and avatars.
- Keep asset IDs stable across HUD and Canvas consumers.
- Decode required assets before declaring the visual fixture ready.
- Lazy-load optional gallery assets and decorative text fonts.
- Provide dimension-stable fallbacks for load and decode failures.

### 9.2 Token Policy

Canvas TypeScript tokens and DOM CSS tokens must derive from one reviewed semantic inventory. Required token groups include:

- Stage gradient
- Glass surface colors and opacity
- Border and highlight colors
- Backdrop blur
- Neutral elevation
- Active green gradient, border, and lower shadow
- Attack orange gradient, border, and lower shadow
- Text and icon colors
- Control sizes
- Panel radii
- Spacing
- Typography roles
- Motion curves and durations
- Breakpoints and safe-area offsets
- Focus, selected, pressed, disabled, and expanded states
- Overlay z-index roles
- Scene density and visual-envelope scales

Canvas-art colors and semantic UI colors are separate namespaces. Tests must not require an exact palette-key count.

## 10. State And Data Flow

Every visible control follows this flow:

```text
user intent
-> semantic DOM control
-> typed HUD callback
-> main.ts composition adapter
-> existing controller or entity API
-> canonical application state
-> DOM reflection and Canvas render snapshot
```

Mode remains writable through HUD callbacks. Power remains a read-only reflection of the selected mode. Open panel, selected avatar, filter values, attack availability, and accessibility attributes must derive from the same state used to render their visual treatment.

Empty control handlers, synthetic click bridges, duplicated selected state, and visual-only disabled flags are prohibited.

## 11. Interaction And Accessibility

### 11.1 Required Behaviors

- All buttons are native buttons or provide equivalent semantics.
- Attack uses native `disabled` or accurate `aria-disabled` behavior.
- Panel triggers expose `aria-expanded` and `aria-controls`.
- Closed panels are not focusable or exposed as active dialogs.
- Opening a sheet or dialog moves focus appropriately.
- Escape closes the active modal surface.
- Closing restores focus to the trigger.
- Selected mode, avatar, font, size, and alignment states are announced.
- Focus-visible treatment is clear against every surface.
- Keyboard-only users can reach the same mode, panel, subject, and attack states as pointer users.
- Controls use at least 44 by 44 CSS-pixel hit areas on touch layouts.

### 11.2 Narrow Interaction Repairs

If deterministic fixtures expose existing defects that make approved states unreachable, those defects are fixed as separate TDD tasks before visual acceptance. Known candidates include:

- Empty hand or text actions
- Synthetic gallery-trigger clicks
- Subject drop meanings collapsed into one null value
- Subject hit testing without a practical radius
- Placed-subject state not reaching subject behavior
- HUD target state not clearing when a subject is removed
- Attack state depending on stale pointer position while focus is on DOM controls

These repairs must not expand into physics, lifecycle, or entity-store redesign.

## 12. Motion And Reduced Motion

Motion uses transforms and opacity where possible. HUD state changes use deliberate spring-like easing rather than default browser transitions.

Reduced-motion mode must:

- Remove panel entrance and card-stagger animations.
- Remove non-essential HUD movement.
- Suppress non-essential Canvas jitter and decorative pulsing.
- Preserve gaze legibility, state changes, attack completion, and destruction outcomes.
- Never leave a control or effect in an intermediate state.

## 13. Error Handling

### 13.1 Asset Failure

If an SVG, PNG, or font fails to decode:

- Preserve layout dimensions.
- Render a neutral fallback appropriate to the asset role.
- Keep the application and RAF loop running.
- Emit one actionable diagnostic rather than logging every frame.
- Expose a deterministic failure state to tests.

### 13.2 Overlay Fit Failure

If a desktop panel cannot fit the current viewport:

- Switch to the defined sheet or tray variant.
- Clamp it to safe-area bounds.
- Preserve access to its close control and trigger.
- Never solve fit by shrinking interactive targets below 44px.

## 14. Deterministic Visual Fixture

Browser screenshots require an explicit deterministic application mode with:

- Fixed seed
- Fixed or explicitly advanced time
- Device scale factor 1 for canonical captures
- Known viewport
- Known entity, subject, lock, and effect state
- Fresh pupil-offset state
- Decoded images
- `document.fonts.ready`
- Completed or disabled entrance transitions
- Suppressed audio side effects
- A browser-visible `visualReady` signal

Ten repeated captures of the same canonical state must be stable before screenshot baselines are accepted.

## 15. Verification Strategy

### 15.1 Unit And Contract Tests

Vitest continues to cover:

- Typed callbacks and state transitions
- Token parity
- Asset registry behavior
- Canvas draw-call geometry
- Contributor-to-target attack endpoints
- Paint order
- Balanced Canvas context state
- Reduced-motion state selection
- HUD semantics and closed-panel inertness

Tests must prefer roles, names, public APIs, semantic tokens, and geometry contracts over decorative selectors or source-string bans.

### 15.2 Browser Tests

Playwright covers:

- Chromium, Firefox, and WebKit boot
- Console-clean startup
- Pointer, touch, and keyboard flows
- Focus movement and restoration
- Panel open and close behavior
- Responsive containment and collision
- Reduced-motion emulation
- Accessibility checks
- Canonical screenshots

### 15.3 Responsive Matrix

Blocking viewports include:

- 320 by 568
- 390 by 844
- 844 by 390
- 768 by 1024
- 1280 by 832
- 1440 by 900

Every viewport must cover default scene, filter open, gallery open, attack active, and keyboard-only operation where applicable.

### 15.4 Figma Parity

Each approved Figma node receives:

- A recorded source node and export version
- A deterministic browser-state mapping
- A canonical viewport, seed, and time
- A source reference image
- A browser baseline
- An overlay or diff artifact
- Documented intentional responsive or accessibility deviations

Figma references are not automatically refreshed during normal CI.

## 16. Blocking Acceptance Gates

1. **Baseline:** clean install, current unit suite, production build, and browser boot pass.
2. **Determinism:** repeated canonical captures are stable.
3. **Vertical slice:** one complete eyes scene, including exact assets, target, HUD, filter, gallery, one attack, mobile adaptation, and parity evidence, is approved.
4. **Component contracts:** semantics, callbacks, focus, selected, open, and disabled states pass.
5. **Parallel visual lanes:** bug, finger, subject, VFX, and QA work passes lane-specific tests and two-stage review.
6. **Integration:** one owner integrates approved lanes without modifying closed architecture files.
7. **Responsive:** no overflow, collision, clipped target, unreachable control, or undersized touch target occurs in the viewport matrix.
8. **Accessibility:** no serious or critical automated violations; keyboard and focus flows pass.
9. **Visual regression:** reviewed canonical baselines pass in the pinned Chromium environment.
10. **Figma parity:** mapped node overlays and documented deviations are approved.
11. **Release:** unit, build, browser, accessibility, responsive, reduced-motion, visual, and parity gates pass from the integrated branch.

## 17. Agent And Worktree Topology

### 17.1 Research Completed

Four isolated research worktrees audited:

- Figma fidelity and current UI
- Architecture and safe ownership boundaries
- Historical overhaul root causes
- Visual and browser QA strategy

### 17.2 Execution Phases

Implementation uses this sequence:

1. Contract and deterministic-fixture foundation
2. Eyes-mode vertical slice
3. Review and correction of the vertical slice
4. Parallel disjoint worktree lanes
5. Serial integration
6. Full release verification

After the vertical slice, safe parallel lanes are:

- **DOM UI:** control bar, filter panel, gallery, text composer, audio placement, responsive sheets, accessibility
- **Crowd assets:** eye, bug, and pointed-finger asset helpers and leaf drawers
- **Subjects and VFX:** subject rendering, attack presentation, cursor, and lock visuals
- **QA harness:** deterministic fixture, Playwright, accessibility, responsive matrix, screenshots, and Figma comparison

One integration owner controls `src/main.ts`, `src/render/Renderer.ts`, shared token files, and final dependency reconciliation.

Each implementation task requires:

1. TDD by the implementer
2. Implementer self-review
3. Independent specification-compliance review
4. Fix and re-review until compliant
5. Independent code-quality review
6. Fix and re-review until approved
7. Lane-specific verification before integration

## 18. Release Definition

The overhaul is complete only when the integrated application:

- Visibly matches the mapped Figma scenes and components at the canonical desktop viewport.
- Uses exact self-hosted source artwork where available.
- Preserves the existing simulation and lifecycle architecture.
- Adapts composition for portrait and landscape mobile without shrinking controls below ergonomic targets.
- Exposes coherent, accessible, working controls rather than decorative placeholders.
- Passes unit, build, browser, accessibility, responsive, reduced-motion, deterministic screenshot, and Figma-overlay gates.
- Contains no unauthorized changes to the closed engine, force-field, entity-store, or state-machine files.
