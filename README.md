# Gutter Generation

An interactive DOM app: a cursor-driven crowd of creatures (eyes, cockroaches, pointed fingers, placards) with physics-based force fields and a DOM HUD (gallery, filters, menu panel, onboarding carousel). No canvas rendering — creatures are DOM elements repelled and animated directly, with a lightweight poof (spawn/despawn) as the only staged effect.

Built as a physics-driven satire toy. Adding a creature mode is additive: `CreatureMode` (`'eyes' | 'pointedFinger' | 'cockroach' | 'placard'`) selects behavior/rendering in `CreatureGrid`/`creaturePhysics.ts`, so new modes don't require forking the grid or physics loop.

It's also a satirical ode to a real protest movement — why it exists, what it's trying to say, and what a responsible citizen can do about it, is in [ABOUT.md](ABOUT.md).

## Status

- **v1 (shipped)**: eyes mode, laser burn power, core physics loop, DOM HUD, cross-browser matrix. Design/plan docs archived in [docs/superpowers/archive/](docs/superpowers/archive/).
- **v2 (shipped)**: three crowd modes (eyes/bugs/pointedFinger), mode-locked power pairing (eyes→laserBurn, bugs→bugEat, pointedFinger→electricBurn), no-overlap crowd separation, look-at rotation, subject skins (figure/lotus), quantity/repel HUD controls, laserBurn beam/glow polish, electricBurn and bugEat effect test coverage.
- **v3 (shipped)**: canvas/power system replaced with the current DOM-based `creatures/` architecture (eyes/cockroach/pointedFinger/placard, no burn/zap/eat) plus gallery, onboarding carousel, and menu panel. See [CLAUDE.md](CLAUDE.md) for current conventions and layout.

## Quick start

```bash
npm install
npm run dev      # Vite dev server
npm test         # vitest unit suite
npm run build    # typecheck + production build
```

## Where to look next

- [ABOUT.md](ABOUT.md) — why this exists, what it's an ode to, key takeaways, what you can do as a responsible citizen
- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — conventions, file layout, and doc index (kept in sync with each other)
- [docs/superpowers/system-architecture.md](docs/superpowers/system-architecture.md) — ADRs, core definitions, data-flow diagram
- [SECURITY.md](SECURITY.md) — reporting a vulnerability
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) — generated knowledge graph of the whole corpus (code + docs)

Deployed via Vercel ([vercel.json](vercel.json)).
