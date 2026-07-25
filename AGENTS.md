# Fun Satire — Agent Instructions

Interactive canvas app: cursor-driven "eyes"/"subjects" crowd with physics-based force fields, staged burn/destroy effects, and a DOM HUD. Vite + TypeScript, vitest for tests.

**Full architecture, ADRs, and data-flow diagram**: [docs/superpowers/system-architecture.md](docs/superpowers/system-architecture.md) — read that before making structural changes. This file only covers conventions and pointers.

(This file mirrors [CLAUDE.md](CLAUDE.md) for agents/tools that read `AGENTS.md` instead. Keep the two in sync when either changes.)

## Conventions

- TypeScript 5.x+, ES2022+, `erasableSyntaxOnly`, `verbatimModuleSyntax` (`import type` required), `noUnusedLocals`.
- Every module is a pure export; side effects live only in `src/main.ts`.
- `Entity.content` is `Readonly`; `EntityStore.get()` snapshots via `structuredClone` by default.
- Physics: semi-implicit Euler (`v += a*dt; p += v*dt`).
- New creature types are added via registries (`Registry` maps string IDs → Drawer/Behavior factories) — see ADR 001. Adding content should be additive, not require engine changes.
- `ForceField.ts` is otherwise closed to extension — ADR 006 is the one sanctioned exception (pairwise separation). Any new touch to `ForceField.ts`, `Engine.ts`, `StateMachine.ts`, or `EntityStore.ts` should be treated as a deliberate, reviewed exception, not a routine edit.

## Layout

```text
src/
  core/       Engine (RAF loop), Clock, EventBus, Rng
  physics/    ForceField, Integrator, SpringHome, LookAt
  entities/   Entity, EntityFactory, EntityStore, behaviors/ (StateMachine, EyeBehavior, SubjectBehavior)
  effects/    EffectSystem (staged timeline), ParticleSystem, RespawnScheduler, effectDefs/
  powers/     PowerController-triggered effects (laserBurn, ...)
  input/      PointerTracker, DragController, PowerController
  render/     Renderer, CanvasUtils, paperCut, pupilTrack, drawers/ (per-entity draw fns)
  content/    manifestLoader, schema, manifests/ (*.roster.json — content-as-data)
  hud/        Hud (DOM-based, SVG-masked paper-cut edges — ADR 004)
  config/     tokens.ts
tests/unit/   vitest — one file per module/feature, run via `npm test`
docs/superpowers/
  system-architecture.md   ADRs, core definitions, data-flow diagram
  specs/                   active (in-progress) per-feature design specs
  plans/                   active (in-progress) per-feature implementation/sprint plans
  archive/specs/,plans/    shipped features' specs/plans, moved here once their ADRs are captured
graphify-out/
  GRAPH_REPORT.md              knowledge graph summary (god nodes, surprising connections, community index)
  GRAPH_REPORT_COMMUNITIES.md  full community membership detail (split out to stay under 500 lines)
  graph.html                   interactive graph visualization
```

## Commands

- `npm run dev` — Vite dev server
- `npm test` — vitest run (unit suite)
- `npm run build` — typecheck + production build

## Markdown files

No `.md` file in this project should exceed 500 lines. If a doc grows past that, split it into a sibling file (e.g. `foo.md` + `foo-communities.md`) and link between them, rather than letting one file grow unbounded.

## Docs index

- [system-architecture.md](docs/superpowers/system-architecture.md) — ADRs 001-006, core definitions, data-flow diagram
- [docs/superpowers/specs/](docs/superpowers/specs/) — active design specs (v2 in progress)
- [docs/superpowers/plans/](docs/superpowers/plans/) — active implementation/sprint plans matching each spec
- [docs/superpowers/archive/](docs/superpowers/archive/) — shipped features' specs/plans (v1, merged-eyes, subject mechanic, browser matrix)
- [README.md](README.md) — project brief, status, quick start
- [SECURITY.md](SECURITY.md) — reporting a vulnerability
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) — knowledge graph of the whole corpus (code + docs); useful for finding cross-cutting relationships before a refactor
