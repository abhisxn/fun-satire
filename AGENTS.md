# Fun Satire — Agent Instructions

Interactive DOM app: draggable-avatar-driven crowd with three creature modes (eyes, bugs, pointedFinger), simple repulsion + spring + damping physics, and a consolidated DOM HUD with filter and gallery panels. Vite + TypeScript, vitest for tests.

**Full architecture, ADRs, and data-flow diagram**: [docs/superpowers/system-architecture.md](docs/superpowers/system-architecture.md) — read that before making structural changes. This file only covers conventions and pointers.

(This file mirrors [CLAUDE.md](CLAUDE.md) for agents/tools that read `AGENTS.md` instead. Keep the two in sync when either changes.)

## Conventions

- TypeScript 5.x+, ES2022+, `erasableSyntaxOnly`, `verbatimModuleSyntax` (`import type` required), `noUnusedLocals`.
- Every module is a pure export; side effects live only in `src/main.ts`.
- Creatures are plain objects managed in arrays by `CreatureGrid`; no ECS or entity store.
- Physics: simple repulsion + spring + damping. Semi-implicit Euler (`v += a*dt; p += v*dt`).
- New creature types are added as modules in `src/creatures/` (e.g. `EyeCreature.ts`, `BugCreature.ts`). Adding content should be additive, not require engine changes.
- `ForceField.ts` and `Integrator.ts` are closed to casual edits. Any change to `ForceField.ts`, `Engine.ts`, or `CreatureGrid.ts` should be treated as a deliberate, reviewed exception.

## Layout

```text
src/
  core/          Engine (RAF loop), Clock, Rng
  physics/       ForceField (repulsion), Integrator (spring + damping)
  creatures/     CreatureGrid, creaturePhysics, creatureTypes, DraggableAvatar,
                 EyeCreature, BugCreature, CockroachCreature, FingerCreature
  input/         PointerTracker
  hud/           Hud (consolidated DOM HUD), FilterPanel, GalleryPanel (+ CSS)
  config/        tokens.ts, visualTokens.ts, visualTokens.json
  main.ts        sole side-effect entry point
tests/unit/      vitest — one file per module/feature, run via `npm test`
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
- [docs/superpowers/specs/](docs/superpowers/specs/) — active design specs
- [docs/superpowers/plans/](docs/superpowers/plans/) — active implementation/sprint plans
- [docs/superpowers/archive/](docs/superpowers/archive/) — shipped features' specs/plans (v1, v2 expansion, merged-eyes, subject mechanic, browser matrix)
- [README.md](README.md) — project brief, status, quick start
- [ABOUT.md](ABOUT.md) — why this exists, what it's an ode to, key takeaways, what you can do as a responsible citizen
- [SECURITY.md](SECURITY.md) — reporting a vulnerability
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) — knowledge graph of the whole corpus (code + docs); useful for finding cross-cutting relationships before a refactor
