# Figma-First Experience Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the divergent production visuals with the approved Figma system across stage, crowd, subjects, attacks, HUD, panels, responsive layouts, and release validation.

**Architecture:** Execute a serial eyes-mode vertical slice first, then branch disjoint worktree lanes from its approved commit. Merge reviewed lane commits through one integration owner; keep engine, force-field, entity-store, and state-machine files closed.

**Tech Stack:** Vite 8, TypeScript 6, Canvas 2D, DOM/CSS, Vitest 4, Playwright, axe-core, PNG overlays, Figma SVG/PNG exports.

---

## Plan Package

1. [Phase 1: Foundation And Eyes Vertical Slice](2026-07-28-figma-first-overhaul-phase-1.md)
2. [Phase 2: Parallel Visual Worktree Lanes](2026-07-28-figma-first-overhaul-phase-2.md)
3. [Phase 3: Serial Integration And Release](2026-07-28-figma-first-overhaul-phase-3.md)

Approved design: `docs/superpowers/specs/2026-07-28-figma-first-experience-overhaul-design.md`

## Global Rules

- Read `AGENTS.md` and `docs/superpowers/system-architecture.md` before editing.
- Follow TDD for every behavior or visual-contract change.
- Do not modify `src/core/Engine.ts`, `src/physics/ForceField.ts`, `src/entities/EntityStore.ts`, or `src/entities/behaviors/StateMachine.ts`.
- Never use `localhost:3845` at runtime. Commit reviewed Figma exports under `public/assets/figma/`.
- Never CSS-transform or letterbox `#stage`.
- Never consume shared `Rng` while drawing.
- Balance every Canvas `save()` with `restore()`.
- Keep mobile scene scale independent from the 44px minimum control hit area.
- Do not begin code-quality review until specification review passes.
- Do not integrate a lane with open review findings.

## Branch Topology

### Sprint 1: Serial Vertical Slice

Create one native Agent Manager worktree:

```text
branch: overhaul/figma-eyes-vertical-slice
owner: vertical-slice implementer
base: committed plan SHA
```

Use a fresh implementer agent per task in the Phase 1 plan. After every task:

1. Run focused tests.
2. Commit.
3. Dispatch specification reviewer.
4. Fix and repeat specification review.
5. Dispatch code-quality reviewer.
6. Fix and repeat quality review.

Phase 1 exits only after the complete eyes scene passes its browser and Figma review. Record:

```bash
git rev-parse HEAD
git tag figma-eyes-approved-2026-07-28
```

The resulting SHA is `EYES_APPROVED_SHA` for all later worktrees.

### Sprint 2: Parallel Worktrees

Create these worktrees from the exact `EYES_APPROVED_SHA`:

| Lane | Branch | Exclusive production ownership |
| --- | --- | --- |
| DOM UI | `overhaul/figma-dom-ui` | HUD components, HUD CSS, accessibility, responsive overlays |
| Crowd | `overhaul/figma-crowd-assets` | Bug/finger assets, registries, leaf drawers |
| Subjects/VFX | `overhaul/figma-subjects-vfx` | Subject leaf drawers, VFX, cursor, lock |
| QA | `overhaul/figma-qa` | Browser specs, references, overlays, audits |

Do not let these lanes edit `src/main.ts`, `src/render/Renderer.ts`, shared token sources, or each other's files.

Each lane runs independent specification and quality reviews. The lane records its approved tip SHA; branch names are not accepted as integration inputs.

### Sprint 3: Serial Integration

Create `overhaul/figma-integration` from `EYES_APPROVED_SHA`. Cherry-pick approved lane commits by SHA in this order:

1. Crowd
2. Subjects/VFX
3. DOM UI
4. QA

After each lane:

```bash
npm test
npm run build
git diff --name-only "$EYES_APPROVED_SHA"...HEAD -- \
  src/core/Engine.ts \
  src/physics/ForceField.ts \
  src/entities/EntityStore.ts \
  src/entities/behaviors/StateMachine.ts
```

Expected: tests and build pass; closed-file command prints nothing.

The integration owner alone reconciles `main.ts`, `Renderer.ts`, shared tokens, and dependency scripts.

## Phased Task List

### Phase 1: Foundation And Eyes

- [ ] 1. Establish semantic Figma tokens and token drift checks.
- [ ] 2. Export, verify, and register exact self-hosted assets.
- [ ] 3. Make image decode readiness awaitable and failure-safe.
- [ ] 4. Add deterministic visual fixture configuration without editing `Engine.ts`.
- [ ] 5. Bootstrap Playwright and prove ten-capture determinism.
- [ ] 6. Render exact eye assets while preserving gaze and blink.
- [ ] 7. Replace the placard with the semantic Figma control bar.
- [ ] 8. Add the separate quantity/repel filter panel.
- [ ] 9. Add the avatar gallery and remove synthetic click bridging.
- [ ] 10. Integrate the canonical subject and eyes attack geometry.
- [ ] 11. Implement independent scene and overlay responsive policies.
- [ ] 12. Pass eyes interaction, accessibility, responsive, visual, and parity gates.

### Phase 2: Parallel Lanes

- [ ] A1. Add overlay focus and panel-state coordination.
- [ ] A2. Complete control, filter, gallery, and text components.
- [ ] A3. Integrate audio and mobile sheet/tray variants.
- [ ] B1. Export and register exact bug and finger assets.
- [ ] B2. Replace procedural bug/finger geometry with asset drawers.
- [ ] B3. Suppress only decorative crowd motion under reduced motion.
- [ ] C1. Define subject visual metrics and exact avatar crops.
- [ ] C2. Align illustrated/text subject composition.
- [ ] C3. Correct contributor-to-target VFX and reduced-motion states.
- [ ] C4. Align cursor and lock leaf visuals.
- [ ] D1. Extend fixture scenarios and browser state matrix.
- [ ] D2. Record Figma manifest/reference exports.
- [ ] D3. Add screenshot, determinism, overlay, and release audits.

### Phase 3: Integration And Release

- [ ] 1. Record immutable lane SHAs and collision audit.
- [ ] 2. Integrate one approved lane at a time.
- [ ] 3. Distinguish subject placement from cancellation.
- [ ] 4. Bound subject hit testing.
- [ ] 5. Route HUD tools through typed APIs.
- [ ] 6. Decouple control-origin attack from Canvas cursor state.
- [ ] 7. Synchronize removed subjects with HUD target state.
- [ ] 8. Reconcile renderer dispatch and shared tokens.
- [ ] 9. Run interaction, accessibility, responsive, and reduced-motion matrices.
- [ ] 10. Generate reviewed visual baselines and Figma overlays.
- [ ] 11. Run forbidden-file and release audits.
- [ ] 12. Complete final specification and code-quality reviews.

## Review Prompt Contract

Every reviewer receives:

```text
approved spec path
phase plan path and full task text
base SHA and task SHA
relevant Figma node IDs
owned-file allowlist
closed-file denylist
focused verification output
```

Specification reviewer answers only:

```text
APPROVED
```

or findings with severity and exact file/line references.

Code-quality reviewer checks:

- Determinism and no shared-RNG consumption
- Balanced Canvas state
- Semantic DOM and focus lifecycle
- Dimension-stable loading/error states
- No per-frame logging or avoidable allocation
- Public type consistency
- Tests based on roles, APIs, geometry, and state
- No cross-lane file leakage

## Release Command

The integrated branch is releasable only when this clean-checkout sequence passes:

```bash
npm ci
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser:cross
npm run test:a11y
npm run test:responsive
npm run test:motion
npm run test:determinism
npm run test:visual
npm run test:figma
PHASE_BASE_SHA="$EYES_APPROVED_SHA" npm run audit:release
```

Expected: all commands exit 0, canonical captures are stable, all mapped references generate overlays, and closed-file audits report no changes.
