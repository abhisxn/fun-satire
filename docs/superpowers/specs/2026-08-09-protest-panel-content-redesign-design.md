# Protest Panel — Content & Narrative Redesign

## Context

The [visual redesign](2026-08-09-protest-panel-visual-redesign-design.md) shipped a gallery, richer buttons, and a native-share flow for `src/hud/ProtestPanel.ts`. Reviewing it in the browser surfaced content problems the visual pass didn't touch: the panel breaks the fourth wall ("I made this as a toy"), the "Join the Swarm" CTA reads as an off-site branded ask disconnected from the rest of the panel, and there's no bridge between the panel's tone and the language already established elsewhere in the app (site title, onboarding). This spec revises the panel's *content and structure* — not its share mechanics, which are unchanged.

## Goals

- Remove the "Join the Swarm" CTA entirely — no off-site hand-off to the movement's own site anywhere in the panel.
- Replace the opening note so it stops breaking the fourth wall ("I made this...") and instead echoes language already established in the site title (`index.html`: "A crowd that watches back") and the onboarding carousel's closing beat (`src/hud/onboarding/beats.ts`: "No leader to arrest. No face to blame. Just thousands, done waiting.") — a copy-only callback, no new UI element needed to make the connection.
- Add a "How to Be a More Informed Citizen" section: 7 short, concrete tips covering fact-checking, following independent reporters, cross-checking claims, voting for local representatives (not one face), questioning those in power, staying united against propaganda, and sustained attention.
- Fold the existing gallery into this section as "here's who to follow" — no separate "Learn more" heading.
- Change the gallery layout from hero+grid to a single-column list, split into two labeled subgroups: "Videos" and "Independent Outlets".
- Add a panel-scoped footer: `© thatguyabhishek`.

## Non-goals

- **Share section mechanics.** `buildShareSection`, `handleNativeShare`, `handleInstagramShare`, the fallback icon row — all unchanged from the visual redesign. Only its position in the panel (now after the informed-citizen section, still last) is affected.
- **Touching onboarding, `Hud.ts`, `index.html`, or any file outside `src/hud/`.** The "connective thread" the user asked for is achieved by making the panel's copy consistent with what already exists elsewhere — not by adding new cross-references, links, or UI in those other places.
- **Any reference to the specific real-world movement or its site.** Dropped completely per explicit decision — no text link, no button, no org name.
- **Formal test coverage for this pass.** Existing tests (`protestPanel.test.ts`) will need updating to stop failing (removed Join section, changed gallery DOM shape) as a mechanical consequence of the edit, but this spec does not require new tests to be written for the new content.

## Design

### Panel content, in order

1. **Opening note** (replaces `HONEST_NOTE`):
   > "A crowd that watches back. No leader to arrest. No face to blame — just people, staying informed and staying loud."

2. **"How to Be a More Informed Citizen"** — heading, followed by 7 tips rendered as a plain list (reuse existing text styling, no new icons per tip — matches the panel's established restraint on visual complexity):
   1. "Check before you share — a screenshot isn't a source."
   2. "Follow reporters directly. Algorithms bury the ones that matter."
   3. "Cross-check big claims against more than one outlet."
   4. "Vote for your local representative — not just one face on a poster."
   5. "Question those in power. Accountability doesn't end at the ballot box."
   6. "Stay united — division is the easiest propaganda to sell."
   7. "Show up, keep showing up. Attention is what keeps power honest."

   Directly below the tips, two labeled subgroups render the existing gallery content as a single column (no hero tile, no grid):
   - **"Videos"** — each `GALLERY_ENTRIES` video entry (plus what was `HERO_VIDEO`, now just another item in the list) as a `protest-tile--video` row.
   - **"Independent Outlets"** — each `GALLERY_ENTRIES` source entry as a `protest-tile--source` row.

3. **Share** — unchanged component, unchanged copy (`SHARE_MESSAGE`), now the panel's only rich/CTA-styled button.

4. **Footer** — `© thatguyabhishek`, small/muted text, panel-scoped.

### Removed entirely

- `buildJoinSection`, `JOIN_URL`, the 🪳 "Join the Swarm" button and its CSS (`.protest-join`, `.protest-join-link` — but keep `.protest-rich-btn` itself, since Share still uses it).
- `HONEST_NOTE` constant (replaced with new copy, same constant name reused or renamed — implementer's call).
- Hero-tile distinction: `HERO_VIDEO` is still imported from `protestContent.ts` (module unchanged) but rendered as a plain `protest-tile--video` row like every other video, not via the `isHero` branch. The `buildVideoTile(entry, isHero)` signature and `.protest-tile--hero` CSS class can be dropped once nothing sets `isHero: true`.
- `.protest-gallery-grid` CSS (multi-column grid) — replaced by a single-column list layout.

### Data flow

Unchanged from the visual redesign: `protestContent.ts`'s `GALLERY_ENTRIES`/`HERO_VIDEO` stay as the static data source. Only `ProtestPanel.ts`'s rendering of that data changes (flat list instead of hero+grid), and nothing new is added to `protestContent.ts`.

### Error handling

Unchanged from the visual redesign — thumbnail `onerror` fallback (`replaceWithFallbackCard`) still applies to video tiles in their new single-column position.

## Content dependencies

None — all copy is fully specified above, no placeholder text, no outstanding video ID decisions (those were already flagged as a pre-existing follow-up in the visual redesign spec, unaffected by this pass).
