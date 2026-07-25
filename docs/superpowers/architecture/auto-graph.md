# Auto-extracted dependency graph

Generated from `src/main.ts` via `npx madge --ts-config ./tsconfig.json --extensions ts,tsx`.

## Module graph

```mermaid
graph LR
  config_tokens_ts["config/tokens.ts"]
  content_manifestLoader_ts["content/manifestLoader.ts"]
  content_manifests_eyes_roster_json["content/manifests/eyes.roster.json"]
  content_schema_ts["content/schema.ts"]
  core_Clock_ts["core/Clock.ts"]
  core_Engine_ts["core/Engine.ts"]
  core_EventBus_ts["core/EventBus.ts"]
  core_Rng_ts["core/Rng.ts"]
  effects_EffectSystem_ts["effects/EffectSystem.ts"]
  effects_ParticleSystem_ts["effects/ParticleSystem.ts"]
  effects_RespawnScheduler_ts["effects/RespawnScheduler.ts"]
  effects_effectDefs_laserBurn_ts["effects/effectDefs/laserBurn.ts"]
  entities_Entity_ts["entities/Entity.ts"]
  entities_EntityFactory_ts["entities/EntityFactory.ts"]
  entities_EntityStore_ts["entities/EntityStore.ts"]
  entities_behaviors_EyeBehavior_ts["entities/behaviors/EyeBehavior.ts"]
  entities_behaviors_StateMachine_ts["entities/behaviors/StateMachine.ts"]
  entities_behaviors_index_ts["entities/behaviors/index.ts"]
  hud_Hud_ts["hud/Hud.ts"]
  hud_hud_css["hud/hud.css"]
  hud_hudIcons_ts["hud/hudIcons.ts"]
  input_DragController_ts["input/DragController.ts"]
  input_PointerTracker_ts["input/PointerTracker.ts"]
  input_PowerController_ts["input/PowerController.ts"]
  main_ts["main.ts"]
  physics_ForceField_ts["physics/ForceField.ts"]
  physics_Integrator_ts["physics/Integrator.ts"]
  physics_SpringHome_ts["physics/SpringHome.ts"]
  render_CanvasUtils_ts["render/CanvasUtils.ts"]
  render_Renderer_ts["render/Renderer.ts"]
  render_drawers_drawCursor_ts["render/drawers/drawCursor.ts"]
  render_drawers_drawEye_ts["render/drawers/drawEye.ts"]
  render_drawers_drawFieldLines_ts["render/drawers/drawFieldLines.ts"]
  render_pupilTrack_ts["render/pupilTrack.ts"]
  styles_global_css["styles/global.css"]
  styles_tokens_css["styles/tokens.css"]
  content_manifestLoader_ts --> content_schema_ts
  content_schema_ts --> config_tokens_ts
  core_Engine_ts --> core_Clock_ts
  core_Engine_ts --> core_EventBus_ts
  effects_EffectSystem_ts --> core_Rng_ts
  effects_EffectSystem_ts --> effects_ParticleSystem_ts
  effects_EffectSystem_ts --> entities_Entity_ts
  effects_ParticleSystem_ts --> core_Rng_ts
  effects_RespawnScheduler_ts --> core_Rng_ts
  effects_RespawnScheduler_ts --> entities_Entity_ts
  effects_effectDefs_laserBurn_ts --> config_tokens_ts
  effects_effectDefs_laserBurn_ts --> effects_EffectSystem_ts
  entities_EntityFactory_ts --> content_schema_ts
  entities_EntityFactory_ts --> core_Rng_ts
  entities_EntityFactory_ts --> entities_Entity_ts
  entities_EntityStore_ts --> entities_Entity_ts
  entities_behaviors_EyeBehavior_ts --> core_Rng_ts
  entities_behaviors_EyeBehavior_ts --> entities_behaviors_StateMachine_ts
  entities_behaviors_index_ts --> entities_behaviors_EyeBehavior_ts
  entities_behaviors_index_ts --> entities_behaviors_StateMachine_ts
  hud_Hud_ts --> config_tokens_ts
  hud_Hud_ts --> hud_hudIcons_ts
  hud_hudIcons_ts --> config_tokens_ts
  input_DragController_ts --> entities_Entity_ts
  input_DragController_ts --> entities_EntityStore_ts
  input_PowerController_ts --> core_Rng_ts
  input_PowerController_ts --> effects_EffectSystem_ts
  input_PowerController_ts --> effects_effectDefs_laserBurn_ts
  main_ts --> content_manifestLoader_ts
  main_ts --> content_manifests_eyes_roster_json
  main_ts --> core_Engine_ts
  main_ts --> core_Rng_ts
  main_ts --> effects_EffectSystem_ts
  main_ts --> effects_ParticleSystem_ts
  main_ts --> effects_RespawnScheduler_ts
  main_ts --> effects_effectDefs_laserBurn_ts
  main_ts --> entities_Entity_ts
  main_ts --> entities_EntityFactory_ts
  main_ts --> entities_EntityStore_ts
  main_ts --> entities_behaviors_index_ts
  main_ts --> hud_Hud_ts
  main_ts --> hud_hud_css
  main_ts --> input_DragController_ts
  main_ts --> input_PointerTracker_ts
  main_ts --> input_PowerController_ts
  main_ts --> physics_ForceField_ts
  main_ts --> physics_Integrator_ts
  main_ts --> physics_SpringHome_ts
  main_ts --> render_CanvasUtils_ts
  main_ts --> render_Renderer_ts
  main_ts --> styles_global_css
  render_Renderer_ts --> config_tokens_ts
  render_Renderer_ts --> core_Rng_ts
  render_Renderer_ts --> effects_EffectSystem_ts
  render_Renderer_ts --> effects_ParticleSystem_ts
  render_Renderer_ts --> entities_EntityStore_ts
  render_Renderer_ts --> entities_behaviors_EyeBehavior_ts
  render_Renderer_ts --> render_drawers_drawCursor_ts
  render_Renderer_ts --> render_drawers_drawEye_ts
  render_Renderer_ts --> render_drawers_drawFieldLines_ts
  render_Renderer_ts --> render_pupilTrack_ts
  render_drawers_drawCursor_ts --> config_tokens_ts
  render_drawers_drawEye_ts --> config_tokens_ts
  render_drawers_drawEye_ts --> content_schema_ts
  render_drawers_drawFieldLines_ts --> physics_ForceField_ts
  styles_global_css --> styles_tokens_css
```


## Adjacency (internal)

| From | → | To |
|------|---|----|
| `content/manifestLoader.ts` | → | `content/schema.ts` |
| `content/schema.ts` | → | `config/tokens.ts` |
| `core/Engine.ts` | → | `core/Clock.ts` |
| `core/Engine.ts` | → | `core/EventBus.ts` |
| `effects/EffectSystem.ts` | → | `core/Rng.ts` |
| `effects/EffectSystem.ts` | → | `effects/ParticleSystem.ts` |
| `effects/EffectSystem.ts` | → | `entities/Entity.ts` |
| `effects/ParticleSystem.ts` | → | `core/Rng.ts` |
| `effects/RespawnScheduler.ts` | → | `core/Rng.ts` |
| `effects/RespawnScheduler.ts` | → | `entities/Entity.ts` |
| `effects/effectDefs/laserBurn.ts` | → | `config/tokens.ts` |
| `effects/effectDefs/laserBurn.ts` | → | `effects/EffectSystem.ts` |
| `entities/EntityFactory.ts` | → | `content/schema.ts` |
| `entities/EntityFactory.ts` | → | `core/Rng.ts` |
| `entities/EntityFactory.ts` | → | `entities/Entity.ts` |
| `entities/EntityStore.ts` | → | `entities/Entity.ts` |
| `entities/behaviors/EyeBehavior.ts` | → | `core/Rng.ts` |
| `entities/behaviors/EyeBehavior.ts` | → | `entities/behaviors/StateMachine.ts` |
| `entities/behaviors/index.ts` | → | `entities/behaviors/EyeBehavior.ts` |
| `entities/behaviors/index.ts` | → | `entities/behaviors/StateMachine.ts` |
| `hud/Hud.ts` | → | `config/tokens.ts` |
| `hud/Hud.ts` | → | `hud/hudIcons.ts` |
| `hud/hudIcons.ts` | → | `config/tokens.ts` |
| `input/DragController.ts` | → | `entities/Entity.ts` |
| `input/DragController.ts` | → | `entities/EntityStore.ts` |
| `input/PowerController.ts` | → | `core/Rng.ts` |
| `input/PowerController.ts` | → | `effects/EffectSystem.ts` |
| `input/PowerController.ts` | → | `effects/effectDefs/laserBurn.ts` |
| `main.ts` | → | `content/manifestLoader.ts` |
| `main.ts` | → | `content/manifests/eyes.roster.json` |
| `main.ts` | → | `core/Engine.ts` |
| `main.ts` | → | `core/Rng.ts` |
| `main.ts` | → | `effects/EffectSystem.ts` |
| `main.ts` | → | `effects/ParticleSystem.ts` |
| `main.ts` | → | `effects/RespawnScheduler.ts` |
| `main.ts` | → | `effects/effectDefs/laserBurn.ts` |
| `main.ts` | → | `entities/Entity.ts` |
| `main.ts` | → | `entities/EntityFactory.ts` |
| `main.ts` | → | `entities/EntityStore.ts` |
| `main.ts` | → | `entities/behaviors/index.ts` |
| `main.ts` | → | `hud/Hud.ts` |
| `main.ts` | → | `hud/hud.css` |
| `main.ts` | → | `input/DragController.ts` |
| `main.ts` | → | `input/PointerTracker.ts` |
| `main.ts` | → | `input/PowerController.ts` |
| `main.ts` | → | `physics/ForceField.ts` |
| `main.ts` | → | `physics/Integrator.ts` |
| `main.ts` | → | `physics/SpringHome.ts` |
| `main.ts` | → | `render/CanvasUtils.ts` |
| `main.ts` | → | `render/Renderer.ts` |
| `main.ts` | → | `styles/global.css` |
| `render/Renderer.ts` | → | `config/tokens.ts` |
| `render/Renderer.ts` | → | `core/Rng.ts` |
| `render/Renderer.ts` | → | `effects/EffectSystem.ts` |
| `render/Renderer.ts` | → | `effects/ParticleSystem.ts` |
| `render/Renderer.ts` | → | `entities/EntityStore.ts` |
| `render/Renderer.ts` | → | `entities/behaviors/EyeBehavior.ts` |
| `render/Renderer.ts` | → | `render/drawers/drawCursor.ts` |
| `render/Renderer.ts` | → | `render/drawers/drawEye.ts` |
| `render/Renderer.ts` | → | `render/drawers/drawFieldLines.ts` |
| `render/Renderer.ts` | → | `render/pupilTrack.ts` |
| `render/drawers/drawCursor.ts` | → | `config/tokens.ts` |
| `render/drawers/drawEye.ts` | → | `config/tokens.ts` |
| `render/drawers/drawEye.ts` | → | `content/schema.ts` |
| `render/drawers/drawFieldLines.ts` | → | `physics/ForceField.ts` |
| `styles/global.css` | → | `styles/tokens.css` |

**Nodes**: 36 internal modules. **Edges**: 66 internal imports.

## Notes

- No circular dependencies (verified by `madge --circular`).
- `config/tokens.ts` is the locked-palette leaf — referenced by `drawCursor`, `drawEye`, `drawFieldLines` indirectly through HUD/icon files, and by `laserBurn`, `hud/Hud`, etc.
- `core/Rng.ts` is the only module that produces entropy; everything else takes a seeded `Rng` argument.
- `physics/ForceField.ts` is consumed by `render/drawers/drawFieldLines.ts` — the build-test enforces this single-source-of-truth invariant.
- `core/Engine.ts` reaches the widest: Clock, EventBus, Rng. It is the only object that owns the RAF loop.
- `render/Renderer.ts` is the second-widest fan-in (drawers + effects + entities + Rng + pupilTrack). It is the only object that draws to the canvas.
