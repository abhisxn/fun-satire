# Onboarding Screen — Design

## Context

The app currently drops visitors straight into the eyes-mode crowd with the full HUD (mode buttons, power buttons, filter panel) mounted immediately (`main.ts:37-40`). There is no framing for what the crowd is, why it surrounds the cursor, or what the game is satirizing. This spec adds a narrative onboarding screen — a short card carousel shown before the HUD appears — that establishes the story and eases the player into the first interaction.

The narrative is a fictionalized parallel to the real 2026 Indian Gen Z protest movement: a dismissive "cockroach" remark from a figure of authority was reclaimed as an identity by a youth-led satirical movement (the Cockroach Janta Party), which grew into mass protests and forced institutional accountability. This project's own prior spec already frames the crowd this way: *"the crowd represents us, the protestors, wanting change"* (`docs/superpowers/specs/2026-08-07-protest-mode-live-participation-design.md`). This onboarding screen makes that framing explicit for a first-time player, without naming any real party, official, or country — see "Reference level" below.

## Reference level: clear fictional parallel

The copy uses the same shape as the real events — an insult reclaimed, a crowd surrounding a symbol of power, proximity replacing distance — but never names a real party, politician, robe-wearer, or country. Anyone familiar with the real movement will recognize it; no one is named or depicted.

## Story pillars

These three pillars anchor the onboarding copy and should inform any future writing/art touching the crowd's framing (Protest Mode copy, gallery sticker flavor text, etc.):

1. **The Insult, Reclaimed** — Power called the crowd something small and dismissible. The crowd didn't flinch — it took the word and wore it. Nothing in the game apologizes for what the crowd is now called.
2. **Numbers Are the Weapon** — No named hero, no single avatar with a face. The crowd's power *is* that it has no center — it can't be isolated, arrested, or bought off one at a time.
3. **The Watched Become the Watchers** — Power is used to looking at the crowd from a safe distance — cameras, headlines, a podium. The premise flips that: the crowd surrounds power and looks back. Proximity, not distance, is the threat.

## Narrative beats (carousel copy)

Four beats, each its own carousel screen:

**Beat 1**
> Someone with a podium and a title looked down at all of us and picked a word.
> Small. Disposable. Something you step on.

**Beat 2**
> We didn't argue. We didn't ask for the word back.
> We just... kept it. Turned out it fit better than they meant it to.

**Beat 3**
> They're used to being watched from a distance — a podium, a headline, a screen.
> Not from this close. Not surrounded.

**Beat 4** *(implicit mechanics hint, no explicit tutorial list)*
> This is the crowd now. It doesn't have a face — it has thousands.
> Move. They'll notice.

## Screen & interaction design

- **Layout:** a single card, centered on screen, over the live default eyes-mode `CreatureGrid` — the crowd behind the card is the real, running scene (cursor-reactive, not a static image or illustration). This reinforces that the game has already started; the card is commentary layered on top of it, not a separate splash screen.
- **Card visual treatment:** reuses `.sticker-card`'s existing visual language from `src/hud/galleryPanel.css` (white background, `12px` border-radius, drop-shadow on the container) but sized as a wide text card, not the gallery grid's 1:1 aspect ratio. The card is a plain, non-interactive positioned `div` — explicitly **not** a `StickerOverlay` (no drag handlers, no resize handle).
- **Progress indicator:** small dot row, one dot per beat. Beats 1-3 show a neutral filled/unfilled dot state; on beat 4 the active dot switches to the "attack" orange gradient (`UI_TOKENS.ui.attack`) to visually flag it as the payoff/final step.
- **Navigation button:** beats 1-3 show a neutral "Next →" button; beat 4 replaces it with a visually distinct "Begin" button using the existing attack-button gradient treatment (`UI_TOKENS.ui.attack.gradientStart/gradientEnd/border/lowerShadow`), signaling it's the action that ends onboarding rather than just advancing a beat.
- **Skip:** a small, low-emphasis "Skip intro" text link is present on every beat (e.g. top-right of the card), letting a player jump straight into the game at any point. Clicking it triggers the same exit sequence as completing beat 4 (see below).
- **Repeat visits:** the onboarding screen is shown on every visit — no localStorage flag suppresses it on return. The narrative framing is considered part of the experience each time, not a one-time tutorial.
- **Background crowd during onboarding:** the eyes-mode crowd behind the card remains fully live and reactive to the cursor throughout — not frozen. This is a deliberate choice: the crowd already behaving normally underneath the card is itself part of the pitch ("this is the real game, and it's already watching you").
- **Motion:** beat-to-beat transitions and the card's own entrance use the existing `EASE.fade` (`cubic-bezier(0.4, 0, 0.2, 1)`) at `DURATION.base` (200ms) from `src/config/tokens.ts` — no new easing curves introduced.

## Exit sequence (onboarding → game)

Triggered identically by completing beat 4's "Begin" or clicking "Skip intro" from any beat:

1. The onboarding card exits via the existing `spawnPoof(cx, cy)` (`src/creatures/poofEffect.ts`), using the card's own center coordinates.
2. Once the poof completes, a random entry is picked from the existing `STICKERS` roster (`src/hud/GalleryPanel.ts:11-33`) and spawned via `StickerOverlay` at that same center position — the card visually "becomes" the sticker rather than the sticker appearing at an unrelated location.
3. Only after this sequence completes does `Hud` mount (the code currently at `main.ts:37-40`, gated behind an onboarding-complete callback/promise instead of running unconditionally at startup) — mode buttons, power buttons, and the filter panel become visible for the first time at this point, not before.

## Out of scope

- No new illustrated/canvas artwork for the onboarding card itself — it is a DOM card using existing CSS treatments, consistent with the finding that no paper-cut/jagged-edge rendering utility currently exists in the codebase (despite being referenced aspirationally in some docs).
- No localStorage-based "seen it once" suppression — every visit shows the carousel (see "Repeat visits" above).
- No mechanics tutorial beyond the single implicit hint line in beat 4 — mode/power controls are learned by using the HUD once it appears, not explained on the onboarding screen.
- No real-world names, parties, or officials referenced anywhere in the copy.

## Testing

- Unit: carousel beat-advance logic (Next/Begin/Skip all reach the same exit sequence), progress-dot active-state per beat, exit sequence ordering (poof completes before sticker spawn, sticker spawn completes before `Hud` mount).
- Manual (required — this touches `hud/` and `effects/` per project convention): `npm run dev`, verify the card renders over a live reactive crowd, click through all 4 beats and separately test "Skip intro" from beat 1, confirm the poof → sticker-at-same-spot → HUD-appears sequence reads correctly, and confirm the onboarding screen reappears on a hard reload.
