# Protest Panel — Menu-Driven Redesign

## Context

The [content redesign](2026-08-09-protest-panel-content-redesign-design.md) fixed the panel's tone and dropped the off-site "Join" CTA, but left everything as one long scrolling section (note, tips, two labeled gallery lists, share, footer). A Figma mockup (`fun-satire`, node `327:6259`) proposes restructuring the panel into a main menu plus four focused sub-screens, each reachable via a Quick Link and returning via a "← Menu" back button. This spec covers that navigational and structural redesign — content that already exists (tips, gallery data, share mechanics) is relocated, not rewritten, except where noted below.

## Goals

- Replace the single scrolling panel with a main menu screen + four sub-screens, navigated in-place (no page reload, no new overlay).
- Main menu: opening note, four Quick Links, a share-prompt line, the Share button, and the footer.
- Sub-screens (each: back arrow + heading + content + footer):
  - **About This Project** — new copy (below), replacing the mockup's placeholder repeated text.
  - **How to Be a More Informed Citizen** — the existing 7 tips, unchanged, moved to its own screen.
  - **Support Independent Media** — the existing video tiles (previously the "Videos" list), unchanged tile rendering.
  - **Other Resources** — the existing source/outlet tiles (previously the "Independent Outlets" list), unchanged tile rendering.
- Footer (`© thatguyabhishek`) appears on all five screens (main menu + 4 sub-screens).
- Share button/flow stays main-menu-only; unchanged mechanics (native share / fallback row / Instagram flow).
- Escape and click-outside always close the whole panel, regardless of which screen is showing — no intermediate "back to menu" step.
- Navigation between screens is an instant content swap, no transition animation.

## Non-goals

- **Rewriting tip text, gallery data, or share mechanics.** All content-redesign work stays as-is; this spec only relocates it into sub-screens.
- **Transition animations between screens.** Explicitly declined — instant swap only.
- **Share button on sub-screens.** Explicitly declined — Share stays a main-menu-only action.
- **Any change to onboarding, `Hud.ts`, `index.html`, or files outside `src/hud/`.**

## Design

### Screen model

`ProtestPanel` gains a `screen` field: `"menu" | "about" | "informed" | "media" | "resources"`, defaulting to `"menu"`. A `navigateTo(screen)` method rebuilds and swaps the contents of a persistent `.protest-panel-body` container. The footer is a sibling of `.protest-panel-body` (appended once in the constructor after it), so it survives every `navigateTo()` call unchanged. Opening the panel (`open()`) does not reset `screen` — reopening the panel resumes wherever the user left off within the same session; `destroy()`/reconstruction is the only way `screen` resets to `"menu"` (matches how the panel is otherwise stateless between opens).

### Main menu screen content, in order

1. **Opening note** — unchanged: *"A crowd that watches back. No leader to arrest. No face to blame — just people, staying informed and staying loud."*
2. **Quick Links** — four buttons (not links; internal navigation, no `href`), each calling `navigateTo()`:
   - "About Project" → `"about"`
   - "How to Be a Better Citizen" → `"informed"`
   - "Support Independent Media" → `"media"`
   - "Other Resources" → `"resources"`
3. **Share prompt** — new line, replacing the mockup's duplicated note text: *"A crowd only grows if someone passes it on."*
4. **Share button** — existing `buildPrimaryShareButton()`/`buildFallbackShareRow()` logic, unchanged, still branching on `this.nativeShare`.
5. **Footer** — see below.

### Sub-screen content

Each sub-screen is built by a shared `buildSubScreen(heading, contentEl)` helper that prepends a back button (`"← Menu"`, calls `navigateTo("menu")`) and the heading, then appends the passed content element.

- **About This Project** (heading: "About This Project"):
  > "This is a satirical toy. You are the crowd — eyes, cockroaches, fingers, placards — surrounding whoever you place on screen. The faces you drag in? Those are the ones in power."
  >
  > "Underneath the mechanics is a real idea: power behaves differently when it knows it's being watched. A leaderless crowd is harder to arrest, harder to silence, and harder to ignore."
  >
  > "Nothing here tracks you, stores what you do, or sends your data anywhere. It's just a browser, a cursor, and a crowd that doesn't look away."

  Rendered as three `<p>` elements.

- **How to Be a More Informed Citizen** (heading: "How to Be a More Informed Citizen"): the existing `INFORMED_CITIZEN_TIPS` list (`.protest-tips` `<ul>`), unchanged content and rendering, just without the gallery lists that used to follow it in the same section.

- **Support Independent Media** (heading: "Support Independent Media"): the existing video tiles (`HERO_VIDEO` + video-kind `GALLERY_ENTRIES`), rendered via the unchanged `buildVideoTile()`, in a `.protest-gallery-list` container. No "Videos" label needed — the screen heading serves that role now.

- **Other Resources** (heading: "Other Resources"): the existing source-kind `GALLERY_ENTRIES`, rendered via the unchanged `buildSourceTile()`, in a `.protest-gallery-list` container. No "Independent Outlets" label needed — the screen heading serves that role now.

### Footer

`buildFooter()` is unchanged (`© thatguyabhishek`) but is now appended once, outside `.protest-panel-body`, so it renders identically on every screen without being rebuilt on navigation.

### Removed / relocated from the current implementation

- `buildInformedCitizenSection()` is split apart: `INFORMED_CITIZEN_TIPS` rendering, video-list rendering, and source-list rendering become three independent screen-content builders instead of one combined section.
- `.protest-gallery-label` ("Videos"/"Independent Outlets" headings) is dropped — the sub-screen heading replaces that role.
- The panel's constructor no longer appends all sections unconditionally; it renders the menu screen into `.protest-panel-body` and appends the footer once.

### Error handling

Unchanged: video thumbnail `onerror` fallback (`replaceWithFallbackCard`) still applies on the "Support Independent Media" screen exactly as it did in the combined gallery list.

## Content dependencies

None — all copy (About paragraphs, share prompt, Quick Link labels, screen headings) is fully specified above.

## Superseded (2026-08-10)

The "About This Project" paragraphs (§Design, Sub-screen content) were rewritten by [the content narrative redesign spec](2026-08-09-content-narrative-redesign-design.md#addendum-reconciled-with-the-concurrent-menu-panel-redesign-2026-08-10) — now 5 paragraphs including real-place references (Jantar Mantar, the capital), replacing the 3 paragraphs specified here. The Informed Citizen screen's tip *content* also grew to 8 tips plus an intro line (same spec); the screen model, navigation, and everything else in this doc (media/resources screens, footer, back-button behavior) is unaffected.
