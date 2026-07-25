# Fun Satire — v1 Implementation Plan: Core Loop

Status: **Approved.** This is the in-repo copy of the plan approved via Plan Mode (original at `~/.claude/plans/i-want-to-create-swift-ladybug.md`). Implementation is underway on branch `v1-core-loop` using superpowers:subagent-driven-development. See `docs/superpowers/specs/2026-07-23-fun-satire-design.md` for the full design spec across all versions.

## Context

Inspired by the recent CJP/youth protests at Jantar Mantar against failing political governance, this is a browser-based interactive satire toy: a canvas full of small "creatures" (eyes, later fingers/bugs, later real caricatures of ministers/media/logos) that the user's cursor acts on like a magnet — repelling/attracting them, with visible field lines. The user wields "powers" (starting with a laser burn) to destroy targets with a cathartic particle effect. This plan covers **v1 only** ("Core Loop": Sprint 1 engine foundation + Sprint 2 playable eyes mode), with v2 (fingers/bugs/more powers) and v3 (real caricature roster) as confirmed roadmap stages built on the same engine without rework.

## Decisions Already Locked (do not re-litigate)

- **Stack**: Vite + TypeScript, no frontend framework, no backend. Pure static client-side app (deploy to Vercel/Netlify/GitHub Pages as static files). HTMX explicitly rejected — this is a real-time canvas physics problem, not server-driven hypermedia.
- **Rendering**: Canvas2D + `requestAnimationFrame` loop (WebGL not needed at this scale).
- **Content-as-data**: every subject (shape/colors/mode) lives in a JSON/TS manifest, never hardcoded — so v3's real roster is pure data, zero engine changes.
- **Visual identity — "Paper-Cut Protest"**: matches the user's reference image. Warm cream background `#EDE7DD`, slate-blue `#5B7A8C` and sage-green `#6D7A5E` accents, near-black `#2A2420` shapes, soft coral `#E8A9A0` cursor/highlight. Typography: Fraunces (italic ~500, display) + Space Mono (HUD/labels). Subtle grain/noise overlay. Custom coral circle+crosshair cursor replacing the native pointer.
- **HUD**: minimal "torn-paper placard," fixed bottom-center, showing current mode + power icons.
- **Motion principle**: GPU-safe only (transform/opacity), custom cubic-bezier easing everywhere, no instant state snaps, no linear/ease-in-out.
- **v1 scope**: abstract eye shapes only (no real caricatures yet — avoids likeness/defamation risk while the mechanic is unproven). Single power: laser burn.
- **Burn effect**: satisfying pop & dissolve (~400ms): glow at pupil → laser line draw → shrink → ash-particle dissolve.
- **Respawn**: burned eyes reappear elsewhere after a short delay (3–6s) — canvas never empties, reads as "the establishment keeps growing back."
- **Power trigger**: click-and-hold charge-up (user chose this over instant click — see Sprint 2 addendum below for the charge visual).
- **Touch/mobile**: best-effort for v1, not a blocking requirement (desktop cursor-driven interaction is the core concept).
- **Content guardrail** (for v3, encoded now in schema): all subjects must stay within the same flat illustrated/paper-craft style — satirical caricature, never photoreal/doctored photos, no hate iconography.

## Architecture

```
fun-satire/
├── index.html, package.json, tsconfig.json, vite.config.ts, vercel.json
├── public/textures/grain.png
├── src/
│   ├── main.ts                          # boot sequence only
│   ├── styles/ (tokens.css, global.css, hud.css)
│   ├── core/ (Engine.ts, Clock.ts, EventBus.ts)
│   ├── entities/
│   │   ├── Entity.ts, EntityStore.ts, EntityFactory.ts
│   │   └── behaviors/ (StateMachine.ts, EyeBehavior.ts, index.ts registry)
│   ├── physics/ (ForceField.ts, SpringHome.ts, Integrator.ts)
│   ├── input/ (PointerTracker.ts, DragController.ts, PowerController.ts)
│   ├── render/
│   │   ├── Renderer.ts, CanvasUtils.ts
│   │   └── drawers/ (drawEye.ts, drawFieldLines.ts, drawCursor.ts, index.ts registry)
│   ├── effects/
│   │   ├── EffectSystem.ts, ParticleSystem.ts
│   │   └── effectDefs/ (laserBurn.ts, index.ts registry)
│   ├── powers/ (Power.ts, laserBurn.ts, index.ts registry + equipped-power state)
│   ├── content/ (schema.ts, manifestLoader.ts, manifests/eyes.roster.json)
│   ├── hud/ (Hud.ts, hudIcons.ts)
│   └── config/ (tokens.ts, physics.ts)
└── tests/unit/ (forceField, springHome, stateMachine, manifestLoader, particleSystem .test.ts)
```

**Core data model** — `Entity` splits into identity/content (immutable, from manifest), physical state (position/velocity/home/scale/rotation, mutated by physics), and behavioral state (state machine + a per-rig `behaviorData` bag). `SubjectManifest` (the content schema) carries `renderType`/`rig` keys that index into `behaviors/index.ts` and `render/index.ts` registries — adding v2 rigs (finger/bug) or v3 caricatures means adding one behavior file + one drawer file + a registry entry, **never** touching `Engine.ts`, `ForceField.ts`, `StateMachine.ts`, or `EntityStore.ts`.

**Physics composition** (per frame): drag overrides position directly (skips force integration) → force-field repulsion + spring-home restoring force sum into acceleration for all other live entities → blink runs independently of position (concurrent with drag/flee) → dying entities are excluded from drag/physics eligibility and removed once their effect timeline completes. Field-line rendering reuses the exact same `ForceField.compute` math as physics, so the visual never drifts from the real force.

**Generic effect system** — `EffectDef` = ordered `stages` (each a time-window + eased update fn) run by `EffectSystem`; `ParticleSystem` is a generic pooled burst/update/draw with no knowledge of "laser" or "eye." `laserBurn` composes: charge (see addendum) → glow → laser-line-draw → shrink → particle dissolve. Future powers (eat/shock/ink-smear/shame-stamp) are just new `EffectDef` + `Power` registry entries — zero changes to the systems themselves.

**Sprint 2 addendum — charge-up mechanic** (from click-and-hold decision): `PowerController` tracks hold duration once the pointer is down near a valid target. While charging, render a pulsing coral ring expanding from the cursor (reuses the cursor draw layer, eased scale/opacity, no new system needed) and intensify the field-lines toward that target. At a charge threshold (~500–600ms) the burn fires automatically (existing `laserBurn` effect); releasing early cancels the charge with a quick fade, no burn. This is one added stage in front of the existing 4-stage effect, plus a small charge-tracking flag in `PowerController` — no architectural change.

## Multi-Agent Execution Framework

This build uses **superpowers:subagent-driven-development** + **superpowers:using-git-worktrees** to isolate the workspace, followed by review/verification before merge (per **superpowers:finishing-a-development-branch**).

**Execution note (as actually run):** subagent-driven-development's own red flags prohibit dispatching multiple implementer subagents in parallel ("conflicts"). In practice, all 24 tasks below are executed **sequentially**, one fresh implementer subagent per task, inside a single isolated worktree (`.worktrees/v1-core-loop` on branch `v1-core-loop`) — not as five separately-parallelized track worktrees. The five conceptual tracks below describe the *dependency structure* of the work (which tasks are independent of which), not separate simultaneous worktrees.

**Sprint 1 & 2 — specialist coding tracks (dependency structure):**
1. **Engine/Physics track** — `core/`, `physics/`, `entities/EntityStore.ts` (tasks 5–8 below). Independent of visual/content work; can start immediately.
2. **Visual/Cursor track** — `styles/`, `config/tokens.ts`, grain overlay, custom cursor, field-line drawer (tasks 2–4, 9). Independent of physics logic itself; depends only on locked design tokens.
3. **Content track** — `content/schema.ts`, `manifestLoader.ts`, `eyes.roster.json`, `EntityFactory.ts` (tasks 11–13). Independent of physics/visual internals; only needs the `Entity` type shape agreed up front.
4. **Effects/Powers track** — `effects/`, `powers/`, charge-up mechanic (tasks 18–20). Depends on Engine track's entity/state-machine shape existing first.
5. **Input track** — `input/PointerTracker.ts`, `DragController.ts` (task 10, 17). Depends on Engine + Entity tracks.

Tracks 1–3 have no dependency ordering among themselves; tracks 4–5 depend on tracks 1–3's `Entity`/`EntityStore` interfaces existing. The ordered task list below (which is what's actually executed) already respects this dependency order. After each task: **superpowers:requesting-code-review** (spec compliance, then code quality), then mark complete. After all 24 tasks: final code-reviewer pass, then **superpowers:finishing-a-development-branch**.

**Future pipeline (v2/v3 — not this plan's scope):** see `docs/superpowers/specs/2026-07-23-fun-satire-design.md` for the v2 (expansion) and v3 (real roster) roadmap, including the web-research/asset-capture/caricature-illustration agent pipeline planned for v3.

## Sprint 1 — Engine Foundation (ordered, each independently verifiable)

1. Scaffold Vite+TS (`vanilla-ts` template), verify `npm run dev` + `npm run build`. Add static deploy config. — **DONE** (commit `3b0a9de` on `v1-core-loop`)
2. `config/tokens.ts` + `styles/tokens.css`: locked palette + fonts (self-hosted Fraunces/Space Mono, no external CDN dependency). Verify on a static test page.
3. Grain overlay: fixed full-viewport low-opacity texture div/pseudo-element, `pointer-events: none`.
4. Custom cursor (`drawCursor.ts`): coral circle+crosshair on canvas at pointer position; hide native cursor (`cursor: none`) over canvas.
5. `core/Clock.ts` (delta time) + `core/Engine.ts` (RAF loop, register/unregister callbacks). Unit test `Clock.ts`.
6. `entities/Entity.ts` type + `entities/EntityStore.ts` (spawn/remove/list/queryNearest). Unit test `queryNearest`.
7. `physics/ForceField.ts` + `physics/SpringHome.ts` (pure functions). Unit test both against known input/output pairs.
8. `physics/Integrator.ts` (semi-implicit Euler); wire a dummy dot entity fleeing cursor and springing home. Manual check: no jitter/oscillation at rest.
9. `render/drawers/drawFieldLines.ts`: radial lines around cursor, length/opacity from `ForceField` output (single source of truth with physics). Manual check against "magnet" feel.
10. `input/PointerTracker.ts`: normalized mouse+touch pointer state, wired into `Engine.ts` tick.

**Exit criteria**: blank canvas, grain texture, custom cursor, dummy entity fleeing/springing with visible field lines.

## Sprint 2 — Eyes Mode, Fully Playable

11. `content/schema.ts` + `manifestLoader.ts` (validate, descriptive errors). Unit test valid + malformed fixtures.
12. Author `eyes.roster.json`: ~15–25 eye subjects, varied size/palette/shapeVariant, non-grid scatter placement.
13. `entities/EntityFactory.ts`: spawn from roster with jittered/reject-sampled scatter (no overlaps, no grid look).
14. `render/drawers/drawEye.ts`: almond sclera, iris ring, pupil, blink scale-Y.
15. `entities/behaviors/StateMachine.ts` (generic transition table) + `EyeBehavior.ts` blink timers (randomized per-eye, non-synchronized). Unit test the transition table.
16. Pupil tracking: angle-to-cursor with elliptical clamp to socket bounds — pupils never escape the iris.
17. `input/DragController.ts`: click-drag any eye, release sets new home position (no snap-back), residual velocity settles naturally; dragged eyes still blink.
18. `effects/ParticleSystem.ts` (generic pool) + `effects/EffectSystem.ts` (generic stage timeline). Unit test burst/update/cull.
19. `effects/effectDefs/laserBurn.ts` (charge → glow → line → shrink → dissolve) + `powers/laserBurn.ts`. Unit test stage-progress math in isolation from rendering.
20. `input/PowerController.ts`: click-and-hold charge detection near nearest in-range eye, auto-fire at threshold, cancel-on-early-release, cooldown gate against double-trigger.
21. Wire respawn: `EntityStore`/`EntityFactory` re-spawn a burned eye elsewhere after 3–6s delay.
22. `hud/Hud.ts` + `hudIcons.ts` + `styles/hud.css`: torn-paper placard, bottom-center, mode+power icons, CSS-transition entrance (custom easing, transform/opacity only).
23. Integration pass: full boot order in `main.ts` (manifest → factory → engine start → input → HUD mount), no console errors, target smooth frame rate with full roster.
24. Cross-browser + basic responsive/touch check: canvas resize/DPR correctness, best-effort tap-to-burn and touch-drag in at least one emulated mobile viewport.

**Exit criteria**: scattered eyes blink, track cursor, feel the repulsion field, can be dragged; charge-and-release laser burn destroys targets with full effect and delayed respawn; HUD shows mode/power; deployable as a static build.

## Verification Strategy

- **Unit-tested (Vitest, no DOM needed)**: `Clock`, `ForceField`, `SpringHome`, `Integrator`, `StateMachine` transitions, `EntityStore.queryNearest`, `manifestLoader` (valid/invalid fixtures), `ParticleSystem` lifecycle, `laserBurn` stage-progress math.
- **Manual/visual in-browser**: field-line "magnet" feel, blink variety, pupil-tracking smoothness, drag feel, charge-and-burn timing/sequencing, HUD/type/grain/cursor fidelity to the reference image, overall paper-cut identity (no photoreal elements — subjective check).
- **Optional smoke test**: one Playwright test asserting canvas exists with non-zero size, HUD present with expected data-attributes, and a click-hold at a seeded eye position reduces entity count after the effect completes. Skip pixel-diff visual regression for v1 — blink timers/particle bursts/scatter placement are inherently randomized; revisit with a seeded RNG later if needed.
- **End-to-end**: run `npm run dev`, open in browser, play through the full loop (drag, blink/track, charge-burn, respawn) per exit criteria above before calling Sprint 2 done.

## Critical Files

- `src/entities/Entity.ts` — core data model, extension point for all future rigs
- `src/content/schema.ts` — manifest schema, extension point for v3 roster + style guardrail
- `src/physics/ForceField.ts` — cursor magnet-field math, shared by physics and field-line rendering
- `src/effects/EffectSystem.ts` / `src/effects/ParticleSystem.ts` — generic effect/particle engine reused by all future powers
- `src/powers/laserBurn.ts` — first power implementation, template for eat/shock/ink-smear/shame-stamp
