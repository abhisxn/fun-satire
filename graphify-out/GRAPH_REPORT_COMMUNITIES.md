# Graph Report - Communities Detail

## Communities

### Community 0 - "Registry Pattern & Audio Engineering"
Cohesion: 0.06
Nodes (54): ADR 001: Component-as-Data (Registry Pattern), Registry (string ID → Drawer/Behavior factory map), ADR 005: Mode-locked power pairing (v2), ADR 006: Pairwise crowd separation as ForceField.ts exception (v2), ForceField.ts (shared physics/rendering math module), Fun Satire Audio/Effects Engineering — Design Spec, AudioEngine.ts (audio context + gain buses service), audioCueRegistry.ts (cue id → synth-fn registry) (+46 more)

### Community 5 - "Physics & Rendering Math (ForceField/Integrator)"
Cohesion: 0.09
Nodes (28): ADR 002: Shared Physics & Rendering Math (Single Source of Truth), ForceField (cursor magnet-field math), Integrator (semi-implicit Euler physics step), v1 Implementation Plan: Core Loop, Sprint 1 — Engine Foundation, Content-as-data principle (plan copy), v1 — Core Loop scope, v2 — Expansion roadmap (+20 more)

### Community 3 - "Effect System & Power Pipeline"
Cohesion: 0.1
Nodes (30): ADR 003: Staged Effect System, Engine (RAF tick loop), PowerController, EffectSystem (staged timeline effect engine), EntityStore, Renderer (concept), Sprint 2 — Eyes Mode, Fully Playable, Charge-up mechanic (Sprint 2 addendum) (+22 more)

### Community 24 - "HUD Paper-Cut Visual Polish (ADR 004)"
Cohesion: 0.67
Nodes (4): ADR 004: DOM HUD vs Canvas HUD, HUD (Hud.ts, DOM-based), HUD placard visual polish (torn-paper card), Hud.ts (DOM HUD implementation)

### Community 53 - "Community 53 (1 nodes)"
Cohesion: 1.0
Nodes (1): Entity (core definition)

### Community 54 - "Community 54 (1 nodes)"
Cohesion: 1.0
Nodes (1): Power (core definition)

### Community 55 - "Community 55 (1 nodes)"
Cohesion: 1.0
Nodes (1): Effect (core definition)

### Community 35 - "Community 35 (2 nodes)"
Cohesion: 1.0
Nodes (2): Paper-Cut Protest visual identity (plan copy), Paper-Cut Protest visual identity

### Community 56 - "Community 56 (1 nodes)"
Cohesion: 1.0
Nodes (1): Auto-extracted dependency graph (madge)

### Community 10 - "Entity Spawn/Respawn (main.ts)"
Cohesion: 0.21
Nodes (11): spawnInitialEyes(), installBehavior(), respawnEntity(), paletteRef(), jitterScale(), buildEntity(), overlapsAny(), samplePos() (+3 more)

### Community 1 - "EventBus (pub/sub core)"
Cohesion: 0.07
Nodes (4): EventBus, Engine, toCanvas(), PointerTracker

### Community 16 - "Clock (test time control)"
Cohesion: 0.36
Nodes (2): sanitize(), Clock

### Community 6 - "Rng (seeded PRNG)"
Cohesion: 0.11
Nodes (8): mulberry32(), Rng, RespawnScheduler, mulberry32(), make_tile(), write_png(), main(), Deterministic grain texture generator.

### Community 57 - "Community 57 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 4 - "DragController"
Cohesion: 0.09
Nodes (5): DragController, clone(), distSq(), EntityStore, effects_called_with_delay()

### Community 7 - "PowerController"
Cohesion: 0.1
Nodes (6): PowerController, EASE_PROTEST(), EASE_IN(), EASE_OUT(), EASE_LINEAR(), EffectSystem

### Community 21 - "Pupil Tracking"
Cohesion: 0.8
Nodes (3): easeToward(), clampInEllipse(), computePupilOffset()

### Community 22 - "Canvas/DPR Utils"
Cohesion: 0.7
Nodes (3): applyDpr(), clampViewportSize(), createViewport()

### Community 8 - "Renderer & Field-Line Drawing"
Cohesion: 0.15
Nodes (13): renderFrame(), computeFieldLines(), drawFieldLines(), clamp(), easeCharge(), pulseAt(), computeCursorState(), drawCursor() (+5 more)

### Community 13 - "Eye Drawing Geometry"
Cohesion: 0.26
Nodes (11): colorByName(), almondPath(), shapeRy(), shapeRx(), irisRadius(), drawEye(), pseudoRandom(), paperCutEdgePath() (+3 more)

### Community 59 - "Community 59 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Manifest Schema"
Cohesion: 0.5
Nodes (1): ManifestLoadError

### Community 17 - "Manifest Loader & Validation"
Cohesion: 0.57
Nodes (6): between(), validateEntry(), validateManifest(), loadManifestFromText(), validateEyeEntry(), validateSubjectEntry()

### Community 26 - "SpringHome"
Cohesion: 0.83
Nodes (2): clampMag(), compute()

### Community 20 - "Integrator (physics step)"
Cohesion: 0.67
Nodes (4): clampMag(), sanitizeDt(), integrate(), steerToward()

### Community 14 - "ParticleSystem"
Cohesion: 0.18
Nodes (1): ParticleSystem

### Community 29 - "Community 29 (3 nodes)"
Cohesion: 0.67
Nodes (1): laserBurnProgressAt()

### Community 60 - "Community 60 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "StateMachine & EyeBehavior"
Cohesion: 0.14
Nodes (3): StateMachine, EyeBlinkTimer, EyeBehavior

### Community 62 - "Community 62 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Hud (DOM HUD)"
Cohesion: 0.36
Nodes (1): Hud

### Community 63 - "Community 63 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Grain Texture Test"
Cohesion: 0.5
Nodes (0): 

### Community 39 - "Community 39 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30 (3 nodes)"
Cohesion: 0.67
Nodes (0): 

### Community 40 - "Community 40 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31 (3 nodes)"
Cohesion: 0.67
Nodes (0): 

### Community 41 - "Community 41 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Scaffold Cleanup Test"
Cohesion: 0.6
Nodes (3): exists(), isDir(), walk()

### Community 69 - "Community 69 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32 (3 nodes)"
Cohesion: 0.67
Nodes (0): 

### Community 71 - "Community 71 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Browser/DPR Test Matrix"
Cohesion: 0.12
Nodes (17): Browser Matrix (T24), Automated Unit Suite (216/216 tests, 25 files), Fun Satire v1 Plan (exit criteria), Chromium Manual Check (1280x720, 1440x900), Firefox Manual Check, Safari 17+ Manual Check, Mobile Emulator Manual Check (390x844), Resize Test (+9 more)

### Community 19 - "Injectable Time Sources & Playwright E2E"
Cohesion: 0.25
Nodes (8): Engine.ts (injectable RAF/time sources), EngineOptions, Rng.ts / Rng.fromQueryString, PowerController (cooldownMs, targetRadius), PowerControllerArgs, Playwright E2E fixture, Rationale: injectable RAF/time sources enable deterministic Playwright E2E, Rationale: seeded Rng enables reproducible browser snapshot tests

### Community 46 - "Community 46 (2 nodes)"
Cohesion: 1.0
Nodes (2): paperCut.ts shared rendering utility, entities/behaviors/EyeBehavior.ts (module)

### Community 81 - "Community 81 (1 nodes)"
Cohesion: 1.0
Nodes (1): Site Favicon (Solid Pink Circle)

### Community 33 - "Community 33 (3 nodes)"
Cohesion: 0.67
Nodes (3): Grain Texture (grain.png), build-grain.py script, Post-processing / Visual Overlay Effect

### Community 82 - "Community 82 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Community 86 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Community 87 (1 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Subject Renderer Test Fixtures"
Cohesion: 0.5
Nodes (0): 

### Community 52 - "Community 52 (2 nodes)"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34 (3 nodes)"
Cohesion: 1.0
Nodes (2): homeFor(), stepSubjectPhysics()

### Community 2 - "Subject Mechanic Test Suite"
Cohesion: 0.09
Nodes (21): behavior.test.ts (StateMachine/EyeBehavior/BurnAssistRange), helpers/mainDomSetup.ts (stub canvas + DOM bootstrap), StateMachine, EyeBehavior, isWithinBurnAssistRange, spawnSubject, drawSubject(), queryNearestEye (+13 more)

### Community 12 - "App Wiring & Drawer Registry"
Cohesion: 0.22
Nodes (14): main.ts (app entry/orchestrator), paperCut.ts (paper-cut render helpers), Renderer.ts (renderFrame), drawGazeLines.ts (computeGazeLines), drawers/index.ts (drawer registry barrel), content/schema.ts (manifest/type schema), manifestLoader.ts (validateManifest/loadManifestFromText), laserBurn.ts (laserBurnEffect def) (+6 more)

### Community 15 - "Merged-Eyes Design Dummy Prototype"
Cohesion: 0.25
Nodes (9): Merged eyes design dummy — design spec, deep-index.html (SVG eye shape prototype), glm-index.html (visual style + pupil dilation prototype), design-dummy.html (canvas physics/interaction engine prototype), Figma reference oPAdd7oWLQVMTP1v6pJOW0 node 1:2, design-dummy/index.html (merged deliverable), Subject browser panel (slide-out drawer), Panel-to-canvas drag/tap subject swap interaction (+1 more)

### Community 88 - "Community 88 (1 nodes)"
Cohesion: 1.0
Nodes (1): Open design questions for v2 §6

