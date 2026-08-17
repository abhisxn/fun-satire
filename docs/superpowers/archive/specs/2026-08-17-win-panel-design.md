# Win panel

## Problem

Right now `onProtestWin` (wired in `main.ts`) only has a mechanical payoff: the sticker
locks to its shrunk floor scale and the avatar's repel radius widens. There's no moment
that names what just happened, ties it back to the game's real theme (numbers/unity beat
a raid), or gives the player an obvious next action. Winning currently looks identical to
just... stopping.

## Goals

- On a full-power win, surface a floating panel that states the win in the app's existing
  voice (declarative, plural "we/us", no-leader-to-blame — see `MENU_COPY`/`SHARE_MESSAGE`
  in `MenuPanel.ts`), with enough copy variety that repeat wins don't feel canned.
- Give the player one clear next action (`next random sticker`) that flows directly into
  another round without extra clicks through the gallery.
- Give the player a share action reusing the app's existing share channels, so a win is a
  natural moment to invite someone else in — consistent with `SHARE_PROMPT`'s framing
  ("Gutter Generation only grows when you share it").
- Never block or pause the crowd/physics underneath — the panel is a HUD overlay, not a modal
  checkpoint.

## Non-goals

- No URL-shortening / link-shortener integration. `Copy link` copies the plain site URL to
  the clipboard — no new backend, no third-party account, no billing. (Considered and
  explicitly deferred during brainstorming: this app is a static Vite/TS site with no
  serverless functions today, and a real shortener would require provisioning one just for
  this cosmetic feature.)
- No change to `RaidController`'s win detection, power bands, or the existing
  `lockSqueeze()`/repel-radius logic in `main.ts`'s `onProtestWin` — this only adds a panel
  after that logic runs.
- No persistence of which copy variation was last shown — plain random pick each time,
  repeats allowed.

## Design

### Trigger & timing

In `main.ts`'s existing `onProtestWin` callback, after the current sticker-lock/repel-radius
block runs, `setTimeout(() => winPanel.show(), 1500)` — a short victory beat so the player
sees the crowd settle around the shrunk sticker before the panel appears. If the player
starts a new raid before the timer fires (`raidController` leaves `idle`), the scheduled
show is cancelled — the panel should never pop up over an already-restarted raid.

### `src/hud/winCopy.ts`

A plain data module, mirroring the shape of `menuContent.ts`'s exported constants:

```ts
export interface WinCopyVariant {
  readonly title: string;
  readonly copy: string;
}

export const WIN_COPY_VARIANTS: readonly WinCopyVariant[] = [ /* 8 entries, see below */ ];

export function pickWinCopy(rng: () => number = Math.random): WinCopyVariant {
  return WIN_COPY_VARIANTS[Math.floor(rng() * WIN_COPY_VARIANTS.length)]!;
}
```

Eight variants, each in the existing app voice, covering the theme with two beats getting a
second phrasing:

1. **"Can't arrest a crowd"** — "No leader to grab, no face to jail. Just thousands of us, and we're not going anywhere."
2. **"Strength in numbers"** — "One eye watching is easy to ignore. A thousand isn't. That's the whole trick."
3. **"This is what winning looks like"** — "You didn't wait for permission. You showed up, and up, and up — until they had no move left."
4. **"Heard. Loud."** — "Every voice you add pushes further than the last. Nobody's whispering into a raid this size."
5. **"Accountability, delivered"** — "They don't answer to statements. They answer to pressure. You just applied it."
6. **"Keep them in check"** — "Every raid they send, every sticker they slap on — the crowd just gets bigger. That's the deal now."
7. **"They ran"** — "One more sticker down. Every one you send in makes it easier for the next. That's not luck — that's numbers."
8. **"We don't stop"** — "This one's cleared. There's always another. Bring the next one in."

### `src/hud/WinPanel.ts` + `winPanel.css`

A HUD-glass card built on the shared tokens in `hudGlass.css` (same approach as
`GalleryPanel`/`MenuPanel`/`FilterPanel`), applying `high-end-visual-design` and
`frontend-design` polish (spacing rhythm, type scale, motion easing) consistent with those
existing panels rather than introducing a new visual language.

- `position: fixed`, top-center, `z-index` above the HUD toolbar but layered so it never
  intercepts pointer events outside its own bounds (`pointer-events: none` on a full-viewport
  wrapper, `pointer-events: auto` only on the card itself — same pattern as
  `.menu-panel-overlay`/`.menu-panel`).
- Contents, top to bottom: close (×) button top-right of the card; title (`WinCopyVariant.title`);
  copy (`WinCopyVariant.copy`); a primary **"Next random sticker"** button; a share row.
- Share row reuses `shareLinks.ts`'s `buildWhatsAppShareUrl`/`buildFacebookShareUrl`/
  `buildInstagramDeepLink`/`buildInstagramWebUrl` and the native-`navigator.share` fallback
  pattern already in `MenuPanel.ts`, plus one additional **"Copy link"** button
  (`navigator.clipboard.writeText(url)`, with a brief label swap to "Copied" as feedback,
  reverting after ~1.5s — no toast component needed).
- Entrance/exit: fade + slight scale/translate transition using `--menu-ease-spring-panel`
  (already defined in `menuPanel.css`) or an equivalent local token, matching the spring feel
  of the existing panels.
- Auto-dismiss: an internal timer fires `hide()` after ~7s if the panel hasn't already been
  closed. Any user interaction with the panel does **not** reset the timer (keeps the
  behavior simple/predictable) — it either gets acted on or it fades.
- Public API (mirroring `GalleryPanel`'s shape): `attachTo(container)`, `show(variant?)`,
  `hide()`, `onNextSticker(cb)`, `isPanelOpen()`.

### Wiring in `main.ts`

- Instantiate `WinPanel` once, alongside the other HUD panels in `mountPostOnboarding()`
  (it needs `document.body` or `hud-root`, and the share URL).
- `onProtestWin`'s existing body gets the `setTimeout` call described above, calling
  `winPanel.show()` (which internally calls `pickWinCopy()`).
- `winPanel.onNextSticker(() => { ... })`: picks a random def from `getFaceStickerDefs()`
  (same lookup already used for the onboarding-complete sticker at `main.ts:345-346`),
  constructs a `StickerOverlay` the same way `galleryPanel.onStickerSelect` does
  (`main.ts:270-282`), and calls the existing `replaceOverlay()` — reusing the poof-out/
  poof-in transition already in place. The panel closes itself once this fires.
- Cancel the pending `setTimeout` (via a stored token, cleared) if a new raid starts
  (`raidController`'s state leaves `idle`) before the panel has shown, per the Trigger
  section above.

## Testing

- `tests/unit/winCopy.test.ts`: all 8 variants have non-empty `title`/`copy`; `pickWinCopy`
  with a stubbed `rng` returns the expected variant at each boundary (0, near-1).
- `tests/unit/winPanel.test.ts`: `attachTo` mounts hidden; `show()` makes it visible and
  renders the passed/picked variant's title+copy; close (×) hides it; `onNextSticker`
  fires and the panel hides; copy-link button calls `navigator.clipboard.writeText` with the
  expected URL (mock `navigator.clipboard`); auto-dismiss fires `hide()` after the timer
  (use fake timers).
- Manual: after `npm run dev`, trigger a full-power win, confirm the panel appears after the
  victory beat, doesn't block crowd interaction, "Next random sticker" swaps the sticker with
  the existing poof transition, share icons/copy-link work, close and auto-dismiss both work,
  and starting a new raid before the panel would've shown suppresses it.
