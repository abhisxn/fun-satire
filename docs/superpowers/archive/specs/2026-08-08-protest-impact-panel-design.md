# Protest Impact Panel — Design

## Context

The crowd in this app (eyes, cockroaches, pointed fingers) represents us — protestors wanting change. The HUD's "Protest" button (`buildAttackBtn()`, `src/hud/Hud.ts:217-240`) exposes `onAttackPress`/`onAttackRelease` callbacks that are currently unwired to anything.

This app is thematically connected to a real Indian protest movement: the Cockroach Janta Party (CJP), founded 16 May 2026. `thecockroachjantaparty.org.in` is an independent, supporter-run commentary site about that movement (explicitly not the official movement site, which is `cockroachjantaparty.org`) — run by one developer, funded by voluntary contributions. It has a real community ("the Swarm," ~41-43k signups), a live signup tracker, a crowdsourced civic-issue board ("Voice of the Swarm"), and its own news/journal content.

The framing for this feature is honesty, not authority: this app is a toy made by one person ("a vibe coder"); the real work — organizing, reporting, tracking — is already being done by the CJP site and by independent journalists (e.g. Sarthak Goswami, Unfiltered by Samdish, Newslaundry, Ravish Kumar, Akash Banerjee/Desh Bhakt). The Protest button's job is to hand the user off to that real work, not to pretend to be it.

This spec targets same-day shippability: static content and external links only, no new backend.

## Goals

- After playing with the crowd, give the user one concrete, real action to take and credible places to learn more — framed honestly, not as a lecture.
- Ship today: no new backend/infra, no accounts, no data storage.
- Share happens as the last step, after the real content — not as the entry point. (Share-first tends to be performative; share-after-action is what actually amplifies something real — this ordering is intentional, based on research on Gen Z digital-activism patterns done earlier in this design process.)

## Non-goals (deferred to separate, later specs)

- **Protest Mode** (QR-code live crowd join, phones spawning avatars into the crowd) — already speced separately in [2026-08-07-protest-mode-live-participation-design.md](2026-08-07-protest-mode-live-participation-design.md). Needs a realtime backend (PartyKit) and a moderation plan; explicitly not part of today's build. This spec (`Protest Impact Panel`) is what the Protest button actually does today; Protest Mode remains a future direction, not layered into this flow.
- **Personalized QR/referral attribution** (unique per-user link, "you brought N people") — needs backend work (unique ID generation, join tracking); deferred.
- **A custom in-app community counter** ("X people opened this panel") — deliberately dropped in favor of linking straight to CJP's own real, live Swarm tracker rather than building a competing/duplicate metric.
- **An in-app hosted live protest-news feed** — deliberately avoided. Hosting an ongoing feed of "what's happening" makes this app an editorial source with real accuracy/legal exposure, indefinitely. Instead, the app hands off to CJP's own content and named independent journalists, who already do that job.
- **A separate persistent "Share" control in the HUD** — share lives only inside the panel, as its last step, not as a competing standalone action.
- **Renaming the button** — stays labeled "Protest" for now.

## Design

### Trigger

Clicking the existing "Protest" button (`onAttackPress`, `src/hud/Hud.ts:151-157`) opens the Impact Panel as a DOM overlay. This follows the HUD's existing pattern — a single consolidated DOM component (ADR 004) — rather than introducing a new rendering approach.

### Panel content, in this order

1. **Honest note.** Short, first-person, static text: this is a toy made by one person; there's a real movement behind it. Exact wording to be supplied by the app's author before implementation.
2. **Join the Swarm.** The one concrete call to action: a prominent link out to `thecockroachjantaparty.org.in`'s real signup flow. No in-app signup form, no duplicate counter — the CJP site shows its own live tracker once the user lands there.
3. **Learn more.** A short, curated, static list of links: independent journalists (Sarthak Goswami, Unfiltered by Samdish, Newslaundry, Ravish Kumar, Akash Banerjee/Desh Bhakt) and/or CJP's own news/issue-board content. Exact final URL list to be supplied by the app's author before implementation.
4. **Share.** Appears last. WhatsApp, Facebook, and Reddit each support direct share-URL links with no API keys or backend (`wa.me/?text=`, `facebook.com/sharer/sharer.php?u=`, `reddit.com/submit?url=&title=`). Instagram has no equivalent web-share URL, so this uses the native Web Share API (`navigator.share`, including a file/image where the platform supports it) so Instagram appears in the OS share sheet on mobile; where `navigator.share` is unavailable (most desktop browsers), falls back to a "download image" action plus a copyable link.

### Data flow

No backend calls anywhere in this feature. All panel content (note text, link list) is static, bundled configuration. Outbound navigation (CJP link, journalist links, platform share links) are plain external navigations (`<a href>` / `window.open`). Share buttons construct their target URL client-side from a fixed share message + app link, or invoke the native share sheet directly. Nothing is submitted to or read from any server.

### Error handling

- `navigator.share` unsupported, or the user cancels the OS share sheet: falls back to the download-image + copyable-link state — no error surfaced to the user, this is normal flow, not a failure.
- An external link (CJP site, a journalist's page) fails to load in the new tab: ordinary browser behavior; this app has no responsibility or handling for it.
- The panel is dismissible (close button and click-outside-to-close) at any point with no side effects — nothing is tracked, submitted, or persisted server-side, so there's nothing to roll back.

### Testing

- Unit: panel DOM construction; share-URL builder functions for WhatsApp/Facebook/Reddit given a fixed message and link; `navigator.share` availability branching (mocked) covering both the native-share and fallback-download paths.
- Manual (required — this touches `hud/` per project convention): `npm run dev`, open the panel from the Protest button, verify the CJP link and each journalist link open correctly, verify each share button produces the correct target URL/behavior on both a mobile viewport (native share sheet) and desktop (fallback), and verify the panel's visual style matches the HUD's existing paper-cut aesthetic (ADR 004).

## Content dependencies before implementation

These are content decisions, not engineering unknowns — implementation can begin once they're supplied:

- Final wording of the honest note.
- Final curated link list for "Learn more" (which journalist channels, and whether to include specific CJP news/issue-board pages vs. just the CJP homepage).
- Confirm the exact CJP signup URL to link "Join the Swarm" to.
