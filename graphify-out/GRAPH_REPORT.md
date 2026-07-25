# Graph Report - .  (2026-07-25)

## Corpus Check
- 107 files · ~102,133 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 465 nodes · 544 edges · 68 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Audio & Soundscapes|Audio & Soundscapes]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Audio & Soundscapes|Audio & Soundscapes]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_RespawnScheduler|RespawnScheduler]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Canvas Rendering & Gaze Mechanics|Canvas Rendering & Gaze Mechanics]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Canvas Rendering & Gaze Mechanics|Canvas Rendering & Gaze Mechanics]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_clampMag|clampMag]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Canvas Rendering & Gaze Mechanics|Canvas Rendering & Gaze Mechanics]]
- [[_COMMUNITY_HUD Layout & UI Components|HUD Layout & UI Components]]
- [[_COMMUNITY_Content Schema & Manifests|Content Schema & Manifests]]
- [[_COMMUNITY_Canvas Rendering & Gaze Mechanics|Canvas Rendering & Gaze Mechanics]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Content Schema & Manifests|Content Schema & Manifests]]
- [[_COMMUNITY_clampMag|clampMag]]
- [[_COMMUNITY_computeLookAtAngle|computeLookAtAngle]]
- [[_COMMUNITY_HUD Layout & UI Components|HUD Layout & UI Components]]
- [[_COMMUNITY_build-grain.py script|build-grain.py script]]
- [[_COMMUNITY_Canvas Rendering & Gaze Mechanics|Canvas Rendering & Gaze Mechanics]]
- [[_COMMUNITY_HUD Layout & UI Components|HUD Layout & UI Components]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_vite.config.ts|vite.config.ts]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Content Schema & Manifests|Content Schema & Manifests]]
- [[_COMMUNITY_Content Schema & Manifests|Content Schema & Manifests]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Canvas Rendering & Gaze Mechanics|Canvas Rendering & Gaze Mechanics]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_HUD Layout & UI Components|HUD Layout & UI Components]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Unit Testing Suite|Unit Testing Suite]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_HUD Layout & UI Components|HUD Layout & UI Components]]
- [[_COMMUNITY_Core Engine & Input Handling|Core Engine & Input Handling]]
- [[_COMMUNITY_Power Systems & Laser Effects|Power Systems & Laser Effects]]
- [[_COMMUNITY_Open design questions for v...|Open design questions for v...]]
- [[_COMMUNITY_Auto-extracted dependency g...|Auto-extracted dependency g...]]
- [[_COMMUNITY_Site Favicon|Site Favicon ]]
- [[_COMMUNITY_Crowd Physics & Force Fields|Crowd Physics & Force Fields]]
- [[_COMMUNITY_Content Schema & Manifests|Content Schema & Manifests]]

## God Nodes (most connected - your core abstractions)
1. `PointerTracker` - 14 edges
2. `EntityStore` - 14 edges
3. `Fun Satire v2 — Expansion — Design Spec` - 13 edges
4. `Engine` - 12 edges
5. `ParticleSystem` - 11 edges
6. `Browser Matrix (T24)` - 11 edges
7. `Fun Satire v2 — Sprint Execution Plan` - 11 edges
8. `Fun Satire Audio Engineering Implementation Plan` - 11 edges
9. `PowerController` - 10 edges
10. `RespawnScheduler` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Autoplay unlock via first pointerdown` --semantically_similar_to--> `Merged eyes design dummy — design spec`  [AMBIGUOUS] [semantically similar]
  docs/superpowers/specs/2026-07-25-fun-satire-audio-design.md → docs/superpowers/specs/2026-07-24-merged-eyes-design-dummy-design.md
- `MODE_POWER_MAP active power locking map` --references--> `ADR 005: Mode-locked power pairing (v2)`  [INFERRED]
  src/hud/hudIcons.ts → AGENTS.md
- `Grain Texture (grain.png)` --generated_by--> `build-grain.py script`  [INFERRED]
  public/textures/grain.png → scripts/build-grain.py
- `App Layout structure` --references--> `content/schema.ts (manifest/type schema)`  [EXTRACTED]
  AGENTS.md → src/content/schema.ts
- `ADR 006: Pairwise crowd separation as ForceField.ts exception (v2)` --rationale_for--> `computeSeparation() pairwise push function`  [INFERRED]
  AGENTS.md → src/physics/ForceField.ts

## Hyperedges (group relationships)
- **Subject spawn/respawn cooldown lifecycle spanning cursor wiring, entity fixture shape, and laser-burn respawn timing** — mainSubjectWiring_test, laserBurnRespawnDelay_test, rendererSubject_test, concept_makeEntityFixture [INFERRED 0.75]
- **Locked subject color palette {suit, shirt, outline} shared across manifest, factory, drawer, and renderer** — concept_subjectColorPalette, entityFactorySubject_test, drawSubject_test, subjectManifest_test, rendererSubject_test [INFERRED 0.80]
- **Subject rig public API surface verified via barrel exports (behavior + rendering)** — barrels_test, subjectBehavior_test, drawSubject_test, drawGazeLines_test, behavior_test [INFERRED 0.75]
- **Drawer functions unified via drawers/index.ts barrel** — drawEye_ts, drawSubject_ts, drawGazeLines_ts, drawers_index_ts [EXTRACTED 0.95]
- **Entity struct created, mutated, and orchestrated across factory/effect/main** — Entity_ts, EntityFactory_ts, laserBurn_ts, main_ts [INFERRED 0.80]
- **Entity behaviors unified via behaviors/index.ts barrel** — EyeBehavior_ts, SubjectBehavior_ts, behaviors_index_ts [EXTRACTED 0.95]
- **v2 planning/spec document set (expansion → sprint → orchestration → sub-specs)** — v2spec_expansiondesign, v2plan_expansion, sprintplan_v2, orchestration_addendum, subjbrowser_spec, audiodesign_spec [EXTRACTED 0.90]
- **Multi-Agent Execution Framework dependency tracks** — v1plan_multiagent, v1plan_track_engine, v1plan_track_visual, v1plan_track_content, v1plan_track_effects, v1plan_track_input [EXTRACTED 0.95]
- **ADR 005/006 as v2 design gates enforced through orchestration review** — sysarch_adr005, sysarch_adr006, orchestration_adrgate, v2spec_modelockedpower, v2spec_nooverlap [EXTRACTED 0.85]
- **Staged Burn Effect Pipeline (charge→glow→line→shrink→dissolve)** — sysarch_adr003, sysarch_effectsystem, design_burneffect, subjfix_powercontrollerchange, subjfix_gazelines [INFERRED 0.80]
- **Shared paperCut.ts consumed across Subject, v2 drawers, and premium HUD** — subjmech_papercut_ts, v2spec_crowdmodes, subjbrowser_premiumhud_bar, v2spec_subjectskins [INFERRED 0.80]
- **Drawer functions unified via drawers/index.ts barrel** — drawEye_ts, drawSubject_ts, drawGazeLines_ts, drawers_index_ts [EXTRACTED 0.95]
- **Entity behaviors unified via behaviors/index.ts barrel** — EyeBehavior_ts, SubjectBehavior_ts, behaviors_index_ts [EXTRACTED 0.95]
- **Entity struct created, mutated, and orchestrated across factory/effect/main** — Entity_ts, EntityFactory_ts, laserBurn_ts, main_ts [INFERRED 0.80]
- **v2 planning/spec document set (expansion → sprint → orchestration → sub-specs)** — v2spec_expansiondesign, v2plan_expansion, sprintplan_v2, orchestration_addendum, subjbrowser_spec, audiodesign_spec [EXTRACTED 0.90]
- **ADR 005/006 as v2 design gates enforced through orchestration review** — sysarch_adr005, sysarch_adr006, orchestration_adrgate, v2spec_modelockedpower, v2spec_nooverlap [EXTRACTED 0.85]
- **Shared paperCut.ts consumed across Subject, v2 drawers, and premium HUD** — subjmech_papercut_ts, v2spec_crowdmodes, subjbrowser_premiumhud_bar, v2spec_subjectskins [INFERRED 0.80]
- **Separation Force Pipeline** — force_field_compute_separation, force_field_accumulate_separation, force_field_separation_constant, force_field_separation_test_ts [EXTRACTED 0.95]
- **Subject Skin Customization System** — schema_subject_skin, schema_subject_skin_test_ts, hud_icons_hud_skin_type, hud_icons_hud_icons_constant [INFERRED 0.85]
- **Mode-Power Locking Pattern** — hud_icons_mode_power_map, hud_icons_hud_mode_type, hud_icons_hud_power_type, agents_adr005 [EXTRACTED 0.90]

## Communities

### Community 0 - "Audio & Soundscapes"
Cohesion: 0.06
Nodes (56): ambientBeds.ts (per-crowd-mode ambient loops), AudioEngine.ts (audio context + gain buses service), Autoplay unlock via first pointerdown, audioCueRegistry.ts (cue id → synth-fn registry), musicBed.ts (looping mp3 music bed), Fun Satire Audio/Effects Engineering — Design Spec, Volume/mute HUD placard control, Fun Satire Audio Engineering Implementation Plan (+48 more)

### Community 1 - "Core Engine & Input Handling"
Cohesion: 0.08
Nodes (4): Engine, EventBus, PointerTracker, toCanvas()

### Community 2 - "Crowd Physics & Force Fields"
Cohesion: 0.08
Nodes (19): behavior.test.ts (StateMachine/EyeBehavior/BurnAssistRange), Burn-assist radius gating concept (eye-to-subject proximity), Shared makeEntity() Entity fixture pattern, Mock CanvasRenderingContext2D call-tracking helper pattern, helpers/mainDomSetup.ts (stub canvas + DOM bootstrap), Entity / EntityColorPalette shape, EyeBehavior, Hud (hud-placard grain/CSS tokens) (+11 more)

### Community 3 - "Core Engine & Input Handling"
Cohesion: 0.09
Nodes (5): effects_called_with_delay(), DragController, clone(), distSq(), EntityStore

### Community 4 - "Audio & Soundscapes"
Cohesion: 0.09
Nodes (27): ADR 001: Component-as-Data (Registry Pattern), ADR 004: DOM HUD with paper-cut visual polish, ADR 006: Pairwise crowd separation as ForceField.ts exception (v2), TypeScript & pure export conventions, App Layout structure, Effect System & Power Pipeline Community, HUD Paper-Cut Visual Polish Community (ADR 004), Physics & Rendering Math Community (+19 more)

### Community 5 - "Power Systems & Laser Effects"
Cohesion: 0.09
Nodes (2): EffectSystem, PowerController

### Community 6 - "Power Systems & Laser Effects"
Cohesion: 0.1
Nodes (22): Burn effect (pop & dissolve, ~400ms), Rationale: burn effect chosen for catharsis over char/zap alternatives, Content guardrail (styleGuardrail: 'flat-illustrated'), Registry pattern (renderType/rig keys), Respawn mechanic (burned eyes reappear 3-6s), Rationale: respawn as 'establishment keeps growing back' theme, v1 — Core Loop scope, v2 — Expansion roadmap (+14 more)

### Community 7 - "Power Systems & Laser Effects"
Cohesion: 0.12
Nodes (19): ADR 005: Mode-locked power pairing (v2), hudIcons SVG renderers store, HudMode type, HudPower type, HudSkin type, hudIcons registry validation test suite, MODE_POWER_MAP active power locking map, MODE_POWER_MAP locks test suite (+11 more)

### Community 8 - "RespawnScheduler"
Cohesion: 0.15
Nodes (3): RespawnScheduler, mulberry32(), Rng

### Community 9 - "Crowd Physics & Force Fields"
Cohesion: 0.2
Nodes (15): EntityFactory.ts (spawnEyes/spawnSubject), Entity.ts (Entity/PhysicsState/LifecycleState types), EyeBehavior.ts (EyeBehavior/EyeBlinkTimer/isWithinBurnAssistRange), Hud.ts (Hud class), Renderer.ts (renderFrame), SubjectBehavior.ts (stepSubjectPhysics/homeFor), behaviors/index.ts (behavior registry barrel), drawGazeLines.ts (computeGazeLines) (+7 more)

### Community 10 - "Core Engine & Input Handling"
Cohesion: 0.12
Nodes (17): applyDpr function, Browser Matrix (T24), CanvasUtils.ts (module), Chromium Manual Check (1280x720, 1440x900), DPR Test, Firefox Manual Check, Mobile Emulator Manual Check (390x844), package.json build script (+9 more)

### Community 11 - "Crowd Physics & Force Fields"
Cohesion: 0.19
Nodes (15): config/tokens.ts (locked-palette leaf module), effects/EffectSystem.ts (module), core/Engine.ts (module), entities/EntityStore.ts (module), entities/behaviors/EyeBehavior.ts (module), physics/ForceField.ts (module), effects/effectDefs/laserBurn.ts (module), main.ts (module) (+7 more)

### Community 12 - "Canvas Rendering & Gaze Mechanics"
Cohesion: 0.18
Nodes (1): ParticleSystem

### Community 13 - "Crowd Physics & Force Fields"
Cohesion: 0.29
Nodes (7): computeFieldLines(), accumulateSeparation(), clampR(), compute(), computeSeparation(), falloff(), sampleAlongRay()

### Community 14 - "Crowd Physics & Force Fields"
Cohesion: 0.25
Nodes (9): deep-index.html (SVG eye shape prototype), Merged eyes design dummy — design spec, Figma reference oPAdd7oWLQVMTP1v6pJOW0 node 1:2, glm-index.html (visual style + pupil dilation prototype), design-dummy/index.html (merged deliverable), design-dummy.html (canvas physics/interaction engine prototype), Merged Eyes Design Dummy Implementation Plan, Panel-to-canvas drag/tap subject swap interaction (+1 more)

### Community 15 - "Power Systems & Laser Effects"
Cohesion: 0.25
Nodes (8): Engine.ts (injectable RAF/time sources), EngineOptions, Playwright E2E fixture, PowerController (cooldownMs, targetRadius), PowerControllerArgs, Rationale: injectable RAF/time sources enable deterministic Playwright E2E, Rationale: seeded Rng enables reproducible browser snapshot tests, Rng.ts / Rng.fromQueryString

### Community 16 - "Core Engine & Input Handling"
Cohesion: 0.38
Nodes (2): Clock, sanitize()

### Community 17 - "Canvas Rendering & Gaze Mechanics"
Cohesion: 0.53
Nodes (4): clamp(), computeCursorState(), easeCharge(), pulseAt()

### Community 18 - "Crowd Physics & Force Fields"
Cohesion: 0.47
Nodes (6): Multi-Agent Execution Framework, Content track, Effects/Powers track, Engine/Physics track, Input track, Visual/Cursor track

### Community 19 - "Unit Testing Suite"
Cohesion: 0.6
Nodes (3): exists(), isDir(), walk()

### Community 20 - "clampMag"
Cohesion: 0.6
Nodes (3): clampMag(), integrate(), sanitizeDt()

### Community 21 - "Unit Testing Suite"
Cohesion: 0.5
Nodes (0): 

### Community 22 - "Canvas Rendering & Gaze Mechanics"
Cohesion: 0.83
Nodes (3): clampInEllipse(), computePupilOffset(), easeToward()

### Community 23 - "HUD Layout & UI Components"
Cohesion: 0.67
Nodes (2): applyDpr(), createViewport()

### Community 24 - "Content Schema & Manifests"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Canvas Rendering & Gaze Mechanics"
Cohesion: 0.67
Nodes (0): 

### Community 26 - "Core Engine & Input Handling"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Content Schema & Manifests"
Cohesion: 0.67
Nodes (1): ManifestLoadError

### Community 28 - "clampMag"
Cohesion: 1.0
Nodes (2): clampMag(), compute()

### Community 29 - "computeLookAtAngle"
Cohesion: 1.0
Nodes (2): computeLookAtAngle(), computeLookAtRotation()

### Community 30 - "HUD Layout & UI Components"
Cohesion: 0.67
Nodes (3): HUD placard visual polish (torn-paper card), ADR 004: DOM HUD vs Canvas HUD, Hud.ts (DOM HUD implementation)

### Community 31 - "build-grain.py script"
Cohesion: 0.67
Nodes (3): build-grain.py script, Grain Texture (grain.png), Post-processing / Visual Overlay Effect

### Community 32 - "Canvas Rendering & Gaze Mechanics"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "HUD Layout & UI Components"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Core Engine & Input Handling"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Power Systems & Laser Effects"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (2): Paper-Cut Protest visual identity, Paper-Cut Protest visual identity (plan copy)

### Community 42 - "AGENTS.md"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "vite.config.ts"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Crowd Physics & Force Fields"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Content Schema & Manifests"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Content Schema & Manifests"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Crowd Physics & Force Fields"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Canvas Rendering & Gaze Mechanics"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Power Systems & Laser Effects"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "HUD Layout & UI Components"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Crowd Physics & Force Fields"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Unit Testing Suite"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Power Systems & Laser Effects"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "index.ts"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "index.ts"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "HUD Layout & UI Components"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Core Engine & Input Handling"
Cohesion: 1.0
Nodes (1): Sprint 1 — Engine Foundation

### Community 62 - "Power Systems & Laser Effects"
Cohesion: 1.0
Nodes (1): PowerController targeting simplification (single Subject)

### Community 63 - "Open design questions for v..."
Cohesion: 1.0
Nodes (1): Open design questions for v2 §6

### Community 64 - "Auto-extracted dependency g..."
Cohesion: 1.0
Nodes (1): Auto-extracted dependency graph (madge)

### Community 65 - "Site Favicon "
Cohesion: 1.0
Nodes (1): Site Favicon (Solid Pink Circle)

### Community 66 - "Crowd Physics & Force Fields"
Cohesion: 1.0
Nodes (1): FORCEFIELD configuration constant

### Community 67 - "Content Schema & Manifests"
Cohesion: 1.0
Nodes (1): ManifestLoadError validation class

## Ambiguous Edges - Review These
- `paperCut.ts shared rendering utility` → `entities/behaviors/EyeBehavior.ts (module)`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-24-subject-mechanic-and-visual-polish-design.md · relation: references
- `Autoplay unlock via first pointerdown` → `Merged eyes design dummy — design spec`  [AMBIGUOUS]
  docs/superpowers/specs/2026-07-25-fun-satire-audio-design.md · relation: semantically_similar_to

## Knowledge Gaps
- **89 isolated node(s):** `helpers/mainDomSetup.ts (stub canvas + DOM bootstrap)`, `build-grain.py script`, `queryNearestEye`, `shouldSpawnSubject`, `renderFrame` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Canvas Rendering & Gaze Mechanics`** (2 nodes): `makeCtx()`, `drawEye.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HUD Layout & UI Components`** (2 nodes): `readText()`, `hud.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Core Engine & Input Handling`** (2 nodes): `makeEntity()`, `dragController.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (2 nodes): `makeEntity()`, `respawn.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (2 nodes): `entry()`, `entityFactory.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (2 nodes): `walk()`, `boot.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (2 nodes): `makeEntity()`, `entityStore.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (2 nodes): `makeEntity()`, `effects.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Power Systems & Laser Effects`** (2 nodes): `makeEntity()`, `powerController.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (2 nodes): `Paper-Cut Protest visual identity`, `Paper-Cut Protest visual identity (plan copy)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AGENTS.md`** (2 nodes): `AGENTS.md`, `CLAUDE.md`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite.config.ts`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Crowd Physics & Force Fields`** (1 nodes): `forceFieldSeparation.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (1 nodes): `integrator.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (1 nodes): `smoke.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (1 nodes): `core.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Content Schema & Manifests`** (1 nodes): `roster.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Content Schema & Manifests`** (1 nodes): `schemaSubjectSkin.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Crowd Physics & Force Fields`** (1 nodes): `drawFieldLines.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Canvas Rendering & Gaze Mechanics`** (1 nodes): `pupilTrack.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Power Systems & Laser Effects`** (1 nodes): `laserBurn.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HUD Layout & UI Components`** (1 nodes): `hudIcons.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Crowd Physics & Force Fields`** (1 nodes): `physics.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (1 nodes): `viewport.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Testing Suite`** (1 nodes): `lookAt.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Power Systems & Laser Effects`** (1 nodes): `laserBurn.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `index.ts`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `index.ts`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HUD Layout & UI Components`** (1 nodes): `hudIcons.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Core Engine & Input Handling`** (1 nodes): `Sprint 1 — Engine Foundation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Power Systems & Laser Effects`** (1 nodes): `PowerController targeting simplification (single Subject)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Open design questions for v...`** (1 nodes): `Open design questions for v2 §6`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auto-extracted dependency g...`** (1 nodes): `Auto-extracted dependency graph (madge)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Site Favicon `** (1 nodes): `Site Favicon (Solid Pink Circle)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Crowd Physics & Force Fields`** (1 nodes): `FORCEFIELD configuration constant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Content Schema & Manifests`** (1 nodes): `ManifestLoadError validation class`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `paperCut.ts shared rendering utility` and `entities/behaviors/EyeBehavior.ts (module)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Autoplay unlock via first pointerdown` and `Merged eyes design dummy — design spec`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `Rng` connect `RespawnScheduler` to `Core Engine & Input Handling`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `helpers/mainDomSetup.ts (stub canvas + DOM bootstrap)`, `build-grain.py script`, `queryNearestEye` to the rest of the system?**
  _89 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Audio & Soundscapes` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Core Engine & Input Handling` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Crowd Physics & Force Fields` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._