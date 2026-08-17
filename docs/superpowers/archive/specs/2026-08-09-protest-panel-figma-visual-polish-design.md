# Protest Panel — Figma-Accurate Visual Polish

## Context

The [menu-driven redesign](2026-08-09-protest-panel-menu-redesign-design.md) shipped the right structure (main menu + 4 sub-screens, navigation, footer) but was implemented from a rough screenshot, not the real design. The user flagged that spacing, fonts, sizes, alignment, icons, and the Share button treatment are all off, and pointed at 5 exact Figma frames (`fun-satire`, nodes `327:6254`–`327:6258`). This spec captures the exact values pulled via Figma's `get_design_context` (not eyeballed) so the visual layer can be corrected precisely. **No structural/behavioral change** — screen model, navigation, content, and copy are all unchanged from the menu-redesign spec except the Title/Copy split noted below.

## Design tokens (from Figma, verified against this project's existing token system)

- **Fonts**: `Krub` (new — not yet loaded in this project; add via Google Fonts `@import`, weights Medium/Bold used), `Inter` (already loaded, `uiFamily` in `visualTokens.json`), `Fraunces` (already loaded, `displayFamily`), `Bungee` (already loaded, `attackFamily`).
- **Panel**: width `300px` (was `340px`), padding `16px` (was `24px 20px`), border-radius `12px` (was `20px`). Background/border/blur unchanged (`rgba(255,255,255,0.7)` / white border / 30px blur — these already matched).
- **Screen content gap**: `24px` between the back-button-row and the screen's content block (main menu and sub-screens both use this).
- **Section label** (small uppercase caps like "OTHER RESOURCES", "ABOUT THIS PROJECT", "SUPPORT INDEPENDENT MEDIA", "HOW TO BE A MORE INFORMED CITIZEN"): `Inter Regular`, `10px`, uppercase, black. "QUICK LINKS" label specifically: `Inter Medium` (500), `10px`, uppercase.
- **Arrow icon**: ONE reusable glyph (a simple right-pointing arrow), reproduced as a single inline SVG path (exact path data below), rotated per use via CSS `transform: rotate(...)`:
  - Back button ("← Menu"): 24px square icon box, `rotate(180deg)` (points left).
  - Quick-link diagonal arrows: 18px square icon box, `rotate(-45deg)` (points up-right, ↗).
  - SVG path (viewBox `0 0 13.5 11.0459`, fill black — scale/recolor via `currentColor` if needed):
    `M0.75 4.77297C0.335786 4.77297 0 5.10876 0 5.52297C0 5.93718 0.335786 6.27297 0.75 6.27297V5.52297V4.77297ZM13.2803 6.0533C13.5732 5.76041 13.5732 5.28553 13.2803 4.99264L8.50736 0.21967C8.21447 -0.0732231 7.73959 -0.0732231 7.4467 0.21967C7.15381 0.512564 7.15381 0.987437 7.4467 1.28033L11.6893 5.52297L7.4467 9.76561C7.15381 10.0585 7.15381 10.5334 7.4467 10.8263C7.73959 11.1192 8.21447 11.1192 8.50736 10.8263L13.2803 6.0533ZM0.75 5.52297V6.27297H12.75V5.52297V4.77297H0.75V5.52297Z`

## Screen-by-screen changes

### Back button (all 4 sub-screens)

- Row: `flex`, `gap: 2px`, `align-items: center`.
- Icon (24px box, arrow rotated 180deg) then text "Menu" — `Krub Medium`, `14px`, black. (Current text "← Menu" as a single string is replaced by icon + "Menu" text, matching Figma exactly — drop the literal `←` character.)

### About This Project screen

- Content wrapped with `padding: 0 8px` (horizontal only).
- Section label "ABOUT THIS PROJECT" (see label style above).
- Paragraphs: `Krub Medium`, `16px`, black, `gap: 12px` between them (not the current smaller/tighter spacing).

### How to Be a More Informed Citizen screen

- Section label "HOW TO BE A MORE INFORMED CITIZEN".
- Tips: `<ul>` with disc bullets (native list-style, not custom), `Krub Medium`, `14px`, `gap`/`margin-bottom: 12px` between items, left indent `~21px` (native `list-style: disc` + padding-left is fine — don't hand-roll bullet characters).

### Support Independent Media screen

- Section label "SUPPORT INDEPENDENT MEDIA".
- Tiles: single column, `gap: 12px` (was `8px`), each tile `background: white` (solid, not translucent), `border-radius: 12px`, `overflow: hidden`. Thumbnail image area unchanged (real YouTube thumbnails, existing `object-fit: cover`, existing `onerror` fallback — Figma shows a gray placeholder only because it's a static mock). Caption: `padding: 8px 16px`, `gap: 4px`; title `Krub Bold 12px`, channel `Krub Medium 12px`. Existing YouTube play badge overlay (`SVG_YOUTUBE_PLAY`) stays — Figma's mock simply doesn't render it since there's no real thumbnail in the mock.

### Other Resources screen

- Section label "OTHER RESOURCES".
- Tiles: single column, `gap: 12px`, each tile `height: 76px`, `background: white`, `border-radius: 12px`, centered content, label `Krub Bold 12px`, centered text (not left-aligned icon+label row as currently implemented — Figma's outlet tiles are plain centered white cards with just the name, no icon glyph shown). Drop the `.protest-tile-icon` emoji/icon rendering on this screen's tiles — Figma shows text-only centered cards.

### Main menu screen

- Top block: `padding: 8px`, `gap: 16px`, containing:
  - **Title**: `Fraunces` (display family), `24px`, regular weight — text: `"A crowd that watches back."`
  - **Copy**: `Krub Medium`, `16px` — text: `"No leader to arrest. No face to blame — just people, staying informed and staying loud."`
- Then a `24px` gap, then:
  - **Quick Links** block: label "QUICK LINKS" (Inter Medium 10px uppercase), `gap: 8px` between the label and buttons and between buttons.
    - Each quick-link button: `background: white`, `border: 1px solid rgba(56,51,47,0.1)`, `border-radius: 12px`, `padding: 16px`, `display: flex`, `gap: 2px`, `align-items: center` (label text immediately followed by the diagonal arrow icon, both left-aligned — NOT spread to opposite ends of the button). Label: `Krub Medium`, `14px`, black.
  - **Share card**: a separate `background: white`, `border-radius: 12px`, `padding: 16px`, `gap: 16px` (vertical) container holding:
    1. The share-prompt text (`Krub Medium`, `14px`, black) — reuse the already-approved copy: `"A crowd only grows if someone passes it on."`
    2. The Share button — **reuse this project's existing `.hud-attack` visual treatment exactly** (same tokens: gradient `#de7666`→`#e9975d`, border `#a74333`, shadow `0px 4px 0px #b75040`, height `39px`, `border-radius: 12px`, `Bungee` font, `16px`, uppercase, white text) rather than the old `.protest-rich-btn` orange gradient, which does not match. The share button's click behavior (native share vs. fallback icon row) is UNCHANGED — only its visual chrome changes. If `navigator.share` is unavailable and the fallback icon row renders instead of the single button, the fallback row still lives inside this same white card.
  - **Layout requirement — Share card pinned to bottom**: per the user's explicit instruction, the Share card (together with the footer below it) should be pinned at the bottom of the panel, not simply flow immediately after the Quick Links list. Implementation approach: make `.protest-menu` a flex column where the top text block and Quick Links flow normally, but the Share card is pushed down via `margin-top: auto` (flex) so it — and the footer after it — always sit at the panel's bottom edge regardless of how much Quick Links/note content there is above. On short content this leaves a gap between Quick Links and Share; that's correct per the design intent (Figma's fixed-height frame shows exactly this — a visible gap above the Share card).

## Non-goals

- No change to navigation logic, `screen` state, footer persistence across screens, Escape/click-outside behavior, or any copy/content beyond the Title/Copy split above.
- No change to `protestContent.ts`, `shareLinks.ts`, or the actual share mechanics (native share, Instagram flow, fallback row logic).
- Not pinning Share-card-to-bottom on sub-screens — Figma's sub-screen frames show normal top-down flow with no bottom-pinned element (only the main menu pins Share+footer).

## Content dependencies

None — all text is either already-approved copy or pulled verbatim from the Figma frames.
