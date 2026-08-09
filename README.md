# Fun Satire

An interactive canvas toy: a crowd of cursor-reactive creatures in three modes (eyes, bugs, pointedFinger) that flee, drag, and get burned/zapped/eaten by cursor-armed powers, rendered in a hand-cut paper-cutout style with a DOM HUD.

Built as a physics-driven satire toy — content-as-data (JSON manifests) drives which creatures exist, so new subjects are additive, not engine changes. See [ADR 001](docs/superpowers/system-architecture.md#adr-001-component-as-data-registry-pattern) for why.

It's also a satirical ode to a real protest movement — why it exists, what it's trying to say, and what a responsible citizen can do about it, is in [ABOUT.md](ABOUT.md).

## Status

- **v1 (shipped)**: eyes mode, laser burn power, core physics loop, DOM HUD, cross-browser matrix. Design/plan docs archived in [docs/superpowers/archive/](docs/superpowers/archive/).
- **v2 (shipped)**: three crowd modes (eyes/bugs/pointedFinger), mode-locked power pairing (eyes→laserBurn, bugs→bugEat, pointedFinger→electricBurn), no-overlap crowd separation, look-at rotation, subject skins (figure/lotus), quantity/repel HUD controls, laserBurn beam/glow polish, electricBurn and bugEat effect test coverage.

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
