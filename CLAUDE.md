# Gutter Generation — Project Instructions

Interactive DOM app: a cursor-driven crowd of creatures (eyes, cockroaches, pointed fingers, placards) with physics-based force fields and a DOM HUD (gallery, filters, protest panel, onboarding carousel). No canvas rendering and no burn/destroy effects — creatures are DOM elements repelled/animated directly; the only staged effect is a lightweight poof (spawn/despawn). Vite + TypeScript, vitest for tests.

**Full architecture, ADRs, and data-flow diagram**: [docs/superpowers/system-architecture.md](docs/superpowers/system-architecture.md) — read that before making structural changes. This file only covers conventions and pointers.

## Conventions

- TypeScript 5.x+, ES2022+, `erasableSyntaxOnly`, `verbatimModuleSyntax` (`import type` required), `noUnusedLocals`.
- Every module is a pure export; side effects live only in `src/main.ts`.
- Physics: semi-implicit Euler (`v += a*dt; p += v*dt`).
- `CreatureMode` (`'eyes' | 'pointedFinger' | 'cockroach' | 'placard'`) selects behavior/rendering per creature in `CreatureGrid`/`creaturePhysics.ts` — adding a mode should stay additive there rather than forking the grid/physics loop.
- `ForceField.ts` (pairwise repel from cursor/avatar) and `Engine.ts` (RAF tick loop) are small, load-bearing, and shared by every creature — treat any touch to them as a deliberate, reviewed exception, not a routine edit.

> Note: `docs/superpowers/system-architecture.md`'s ADRs (001-006) and data-flow diagram describe an earlier `entities/` + canvas-`render/` + `effects/`/`powers/` architecture that has since been replaced by the flatter `creatures/`+DOM structure below. Treat that doc as historical until it's refreshed to match.

## Human testing

After completing any task that touches `physics/`, `creatures/`, `audio/`, or `hud/`, run `npm run dev` and verify the change in a browser before reporting the task complete. Unit tests don't catch visual/feel regressions in this app. Test at the task level, not deferred to phase/sprint end — catching a regression at the task that introduced it beats debugging it several tasks later.

## Layout

```text
src/
  core/       Engine (RAF loop), Clock, Rng
  physics/    ForceField (cursor repel), Integrator
  creatures/  CreatureGrid, creaturePhysics, creatureTypes, per-type modules
              (EyeCreature, CockroachCreature, FingerCreature, PlacardCreature, BugSwarm),
              poofEffect (spawn/despawn), DraggableAvatar, makeDraggable, snapGrid/snapGuides,
              StickerOverlay, TextOverlay, pinchZoom, touchSupport
  input/      PointerTracker
  audio/      AudioManager, AudioWidget, clickSound, dragScratchSound, hoverTones, hudTones, poofTone
  hud/        Hud, FilterPanel, GalleryPanel, MenuButton, MenuPanel, menuContent (protest content
              lives here, no separate ProtestPanel file), shareLinks, onboarding/ (OnboardingCarousel, beats)
  analytics/  ga.ts (Google Analytics)
  config/     tokens.ts, visualTokens.ts
tests/unit/   vitest — one file per module/feature, run via `npm test`
docs/superpowers/
  system-architecture.md   ADRs, core definitions, data-flow diagram
  specs/                   active (in-progress) per-feature design specs
  plans/                   active (in-progress) per-feature implementation/sprint plans
  archive/specs/,plans/    shipped features' specs/plans, moved here once their ADRs are captured
graphify-out/
  GRAPH_REPORT.md                knowledge graph summary (god nodes, surprising connections, community index)
  GRAPH_REPORT_COMMUNITIES.md,
  GRAPH_REPORT_COMMUNITIES_2.md,
  GRAPH_REPORT_COMMUNITIES_3.md  full community membership detail (split across files to stay under 500 lines each)
  graph.html                     interactive graph visualization
```

## Commands

- `npm run dev` — Vite dev server
- `npm test` — vitest run (unit suite)
- `npm run build` — typecheck + production build
- `npm run tokens:generate` / `npm run tokens:check` — regenerate/verify `visualTokens.ts` from source tokens

## Markdown files

No `.md` file in this project should exceed 500 lines. If a doc grows past that, split it into a sibling file (e.g. `foo.md` + `foo-communities.md`) and link between them, rather than letting one file grow unbounded.

## Docs index

- [system-architecture.md](docs/superpowers/system-architecture.md) — ADRs 001-006, core definitions, data-flow diagram
- [docs/superpowers/specs/](docs/superpowers/specs/) — active design specs (v2 in progress)
- [docs/superpowers/plans/](docs/superpowers/plans/) — active implementation/sprint plans matching each spec
- [docs/superpowers/archive/](docs/superpowers/archive/) — shipped features' specs/plans, moved here once merged to main
- [README.md](README.md) — project brief, status, quick start
- [ABOUT.md](ABOUT.md) — why this exists, what it's an ode to, key takeaways, what you can do as a responsible citizen
- [SECURITY.md](SECURITY.md) — reporting a vulnerability
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) — knowledge graph of the whole corpus (code + docs); useful for finding cross-cutting relationships before a refactor
