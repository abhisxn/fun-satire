# Protest Panel — Visual Redesign

## Context

The [Protest Impact Panel](2026-08-08-protest-impact-panel-design.md) shipped as a functional-but-plain glass panel: static honest note, a black CTA link, an unstyled bullet list of 8 text links, and three small flat text share buttons (`src/hud/ProtestPanel.ts`, `src/hud/protestPanel.css`).

This spec redesigns the same panel's *visual and interaction* layer to feel like a high-end media surface — real video thumbnails, full-color icons, richer buttons — without changing its purpose (hand the user off to the real CJP movement and independent journalists) or its no-backend constraint. Content and structure decisions below were made through visual brainstorming (mockup comparisons); see the summary of choices in "Design decisions" below.

## Goals

- Replace the plain bullet-list "Learn more" section with an editorial-feed-style gallery: one larger hero video tile + a grid of supporting tiles (video thumbnails and non-video source cards blended together).
- Replace flat text share buttons with a richer share flow that matches how sharing actually works today (native OS share sheet as the primary path).
- Bring full-color brand icons (YouTube, WhatsApp, Facebook, Instagram, and per-source marks) into the panel, and give the CTA/Share buttons the same tactile, soft-skeuomorphic chrome already used by the HUD's mode buttons.
- Keep the panel static, client-only, no new backend — same constraint as the original spec.

## Non-goals

- **Live visitor/community counter.** Considered and declined again: a real live counter needs presence/realtime backend infra, which breaks this feature's no-backend scope, and a small self-reported number could undercut credibility next to CJP's own real ~41-43k Swarm count. The CTA continues to hand off to CJP's own tracker rather than duplicating it.
- **Live-fetched "latest video per channel."** Would require the YouTube Data API (a key + a server-side call, since the key can't be exposed client-side) — out of scope for a no-backend feature. Videos are curated and static instead (see Content dependencies).
- **Reddit as a fallback share button.** Dropped in favor of WhatsApp + Facebook + Instagram, which better matches this audience (India-focused; WhatsApp dominant, Reddit niche here). Reddit sharing is still possible via the native OS share sheet where supported.
- **Renaming the button, changing panel trigger, or touching `Engine.ts`/`ForceField.ts`.** Unchanged from the original spec.

## Design decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Overall layout | Editorial Feed: one hero tile + grid below, not an even grid or horizontal rail |
| Learn More / video relationship | Blended into one grid — text sources (Newslaundry, Voice of the Swarm, Andhbhakt) get icon-styled cards inline with video thumbnail tiles, not a separate section |
| Video content sourcing | Curated specific videos (real `{videoId, title, channel}`), not channel-level cards or a live API fetch |
| Icon style | Full-color brand marks throughout (not the HUD's custom outline language) — icons are the one place this panel intentionally diverges from ADR 004's icon system, because brand recognizability matters more here than visual consistency |
| Share strategy | One primary "Share" button using `navigator.share` (covers WhatsApp/Instagram/everything on supported mobile browsers) with a compact icon-row fallback for browsers without it |
| Fallback share platforms | WhatsApp + Facebook (direct URL) + Instagram (copy-link + open Instagram, since Instagram has no share-URL API) |
| Live counter | None — declined again, see Non-goals |
| Button chrome | Soft-skeuomorphic: gradient fill + bottom "lower shadow" ledge, matching `tokens.ui.active`/`tokens.ui.attack` already used by HUD mode buttons |

## Design

### Panel content, in order

1. **Honest note.** Unchanged — plain static text.
2. **Join the Swarm CTA.** Soft-skeuomorphic button (gradient fill, lower-shadow ledge — reuse the visual pattern from `tokens.ui.attack` in `src/config/visualTokens.json`), full-color icon, links to `JOIN_URL`. No counter/subtext.
3. **Learn More gallery.** One hero tile (largest curated video: real YouTube thumbnail via `https://img.youtube.com/vi/<id>/hqdefault.jpg`, title, channel name) followed by a grid of remaining tiles. Grid tiles are one of two kinds, visually consistent (same card shape, radius, hover state) but distinguishable by icon:
   - **Video tile**: YouTube thumbnail image, full-color YouTube play badge overlay, title + channel caption.
   - **Source tile** (Newslaundry, Voice of the Swarm, Andhbhakt): full-color brand/site icon on a solid card background, source name.
   All tiles are `<a>` elements opening the underlying URL in a new tab — clicking a video tile opens the YouTube video directly (`https://www.youtube.com/watch?v=<id>`), not an in-panel player (no embed, no autoplay, no iframe — keeps this static/no-tracking).
4. **Share.** One primary "Share" button (same skeuomorphic chrome as the CTA) calling `navigator.share({ title, text, url })` when available. When `navigator.share` is unavailable, the button is replaced by (or reveals) a compact row of three icon-only fallback buttons:
   - **WhatsApp** — `buildWhatsAppShareUrl` (existing, unchanged).
   - **Facebook** — `buildFacebookShareUrl` (existing, unchanged).
   - **Instagram** — new action (not a URL builder, since Instagram has no share-by-URL API): copies the share link to the clipboard via `navigator.clipboard.writeText`, then opens Instagram — `instagram://story-camera` on mobile (falling back to `https://instagram.com` if the app isn't installed/the deep link fails to trigger app-switch within a short timeout), or `https://instagram.com` directly on desktop — and shows a short "Link copied — paste it into your story!" toast (reuse the existing `showCopiedFeedback`-style transient-text pattern already in `ProtestPanel.ts`).
   Reddit's share function (`buildRedditShareUrl`) is no longer called from the panel; the function in `shareLinks.ts` can stay (still tested, still valid) or be removed — implementation should check for other callers before removing.

### Visual language

- Full-color brand icons for: YouTube (video tiles), WhatsApp, Facebook, Instagram, and per-source marks for Newslaundry/Voice of the Swarm/Andhbhakt (a distinct icon or wordmark-derived glyph per source, since these aren't globally recognized "brand" icons the way social platforms are — a simple monogram or existing favicon-derived glyph is sufficient).
- This is a deliberate, scoped exception to the HUD's outline-icon system (ADR 004 covers HUD *controls*; this panel's content icons are brand marks representing external platforms/publishers, not app-native actions) — no change to `Hud.ts`'s own icon set.
- Gallery tiles: consistent card radius/shadow with the panel's existing glass aesthetic (`--protest-glass-bg`, `--protest-glass-border`), thumbnails `object-fit: cover`, hover state (subtle scale/brightness) for affordance.
- CTA and primary Share button share one visual component/class so they read as the two "big" actions in the panel; fallback share icons are visually smaller/secondary, appearing only when `navigator.share` is unavailable.

### Data flow

Unchanged from the original spec: everything is static, bundled configuration; no backend calls. New addition: a static curated-videos array (see Content dependencies) replacing/extending the current `LEARN_MORE_LINKS` array, with video entries carrying `{ videoId, title, channel }` and source entries carrying `{ href, label, icon }`.

### Error handling

- `navigator.share` unsupported, or the user cancels the OS share sheet: falls back to the icon row — not an error, normal flow (unchanged behavior from original spec, now applied to the redesigned single-button entry point).
- Instagram deep link fails to open the app (not installed): falls back to `https://instagram.com` in a new tab; the link is already on the clipboard either way, so the user can still complete the share manually.
- A video thumbnail image fails to load (deleted video, network issue): `<img>` `onerror` falls back to a plain icon+title card (same visual treatment as a source tile) rather than a broken-image icon.
- External link failures (CJP site, journalist pages, YouTube): ordinary browser behavior, no in-app handling, same as original spec.
- Panel remains dismissible (close button, click-outside, Escape) at any point with no side effects — nothing tracked or persisted.

### Testing

- Unit: gallery tile rendering (video vs. source tile branching), thumbnail `onerror` fallback, `buildInstagramShareAction`-equivalent helper (clipboard write + deep-link/fallback-URL branching, mocked), existing WhatsApp/Facebook URL builder tests (unchanged), `navigator.share` availability branching now driving the single-button vs. fallback-row render (mocked).
- Manual (required — touches `hud/`): `npm run dev`, open the panel, verify hero + grid render with real thumbnails once content is supplied, verify each tile opens the correct external URL, verify Share button opens the native sheet on a mobile viewport and the fallback icon row on desktop, verify Instagram fallback copies the link and opens Instagram, verify broken-thumbnail fallback (temporarily point a tile at an invalid video ID), verify visual style (glass aesthetic, skeuomorphic buttons) matches the rest of the HUD.

## Content dependencies before implementation

Same pattern as the original spec — these are content decisions, not engineering unknowns:

- Final curated video list: specific YouTube video IDs + titles for each featured channel (Sarthak Goswami, Unfiltered by Samdish, **Jist News Media**, The Deshbhakt, Being Honest, Ravish Kumar, and any others to include) and which one is the hero.
- Confirm which non-video sources stay as source tiles (Newslaundry, Voice of the Swarm/CJP, Andhbhakt) and whether each needs a distinct icon/monogram supplied or generated.
- Confirm final share message text (can reuse existing `SHARE_MESSAGE`, or update to match the redesigned panel's tone).
