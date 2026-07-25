# Fun Satire

An interactive canvas toy: a crowd of cursor-reactive "eyes"/"subjects" that flee, drag, and get burned/zapped/eaten by cursor-armed powers, rendered in a hand-cut paper-cutout style with a DOM HUD.

Built as a physics-driven satire toy — content-as-data (JSON manifests) drives which creatures exist, so new subjects are additive, not engine changes. See [ADR 001](docs/superpowers/system-architecture.md#adr-001-component-as-data-registry-pattern) for why.

## Status

- **v1 (shipped)**: eyes mode, laser burn power, core physics loop, DOM HUD, cross-browser matrix. Design/plan docs archived in [docs/superpowers/archive/](docs/superpowers/archive/).
- **v2 (in progress)**: subject browser + premium HUD, audio/effects engineering, mode-locked power pairing, crowd quantity/repel controls. Active docs in [docs/superpowers/specs/](docs/superpowers/specs/) and [docs/superpowers/plans/](docs/superpowers/plans/).

## Quick start

```bash
npm install
npm run dev      # Vite dev server
npm test         # vitest unit suite
npm run build    # typecheck + production build
```

## Where to look next

- [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) — conventions, file layout, and doc index (kept in sync with each other)
- [docs/superpowers/system-architecture.md](docs/superpowers/system-architecture.md) — ADRs, core definitions, data-flow diagram
- [SECURITY.md](SECURITY.md) — reporting a vulnerability
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) — generated knowledge graph of the whole corpus (code + docs)

Deployed via Vercel ([vercel.json](vercel.json)).
