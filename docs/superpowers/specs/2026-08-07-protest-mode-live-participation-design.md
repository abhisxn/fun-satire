# Protest Mode — Live Phone-Join Participation — Design

## Context

This app's crowd (eyes, cockroaches, pointed fingers) is political satire: the crowd represents us, the protestors, wanting change. The HUD already has a "Protest" button (`buildAttackBtn()`, `src/hud/Hud.ts:217-240`) exposing `onAttackPress`/`onAttackRelease` callbacks — currently unwired to anything. The canvas-based power system this button historically triggered (laserBurn/bugEat/electricBurn, `EffectSystem.ts`, `Renderer.ts`, `PowerController.ts`) was removed in the July 29, 2026 DOM-first re-architecture (`docs/superpowers/plans/2026-07-29-dom-first-simplification.md:16-24`) and no longer exists.

Rather than rebuild a destroy/attack mechanic, this spec turns the Protest button into a live participation feature: viewers become the crowd, in real time, from their own phones.

## Goals

- Make the crowd literally grow with real people, not just watch NPCs.
- Zero install, zero sign-in friction — scan a QR code and you're in within seconds.
- Ship without a permanent backend/database — sessions are ephemeral by design.

## Non-goals (deferred)

- Instagram (or any) sign-in / persistent identity — dropped for v1 in favor of zero-friction anonymous entry. May revisit later if a personal-record/leaderboard feature is wanted.
- A global, persistent shared crowd across all site visitors — out of scope; see "Session model" below.
- The earlier "shareable moment" static-card idea (screenshot + editable caption + local counter) — a separate, independent, lower-effort feature that could still ship on its own; not part of this spec.
- Manual host approval queue for placards — v1 uses an automatic filter only.

## Session model

Each desktop tab that enters Protest Mode opens its own room. Only phones that scan that tab's specific QR code join that room's crowd. The room lives only as long as the desktop tab stays open — closing or reloading the tab ends the room and invalidates the QR code. No database, no cross-session persistence. This keeps moderation exposure small (each room has a small, transient audience) and avoids building account/storage infrastructure for a first version.

## Architecture

**New dependency: a WebSocket relay room service (PartyKit).** PartyKit's model — one ephemeral room, one host, N joiners, room disappears when the host disconnects — matches this feature's session model exactly. It deploys independently of the existing static/Vite deploy on Vercel (`vercel.json`), so it doesn't conflict with or complicate the current build/deploy pipeline.

Why not WebRTC peer-to-peer instead: it would avoid the new backend dependency, but NAT traversal is unreliable without a TURN server (some phones simply fail to connect), and the profanity filter would have to run client-side in the desktop browser, which is trivially bypassable. Running the filter server-side in the PartyKit room handler is worth the small added infra.

```
Desktop tab (Protest Mode)          PartyKit room                Phone (joiner)
──────────────────────────          ─────────────                ──────────────
1. Enter Protest Mode        ──►  create/join room
2. Render QR (room URL)
                                                          3. Scan QR ──► open join page
                                                          4. Pick creature type
                                                          5. Type placard (≤60 chars)
                                                          6. Submit          ──►
                                     7. Run profanity/slur filter
                                        ├─ reject ──► inline error back to phone
                                        └─ accept ──► broadcast to room host
8. Spawn avatar in live crowd ◄──
   (creature type + glow highlight
    + plain text label, positioned
    among existing NPC crowd)
```

## Components

**Desktop: Protest Mode entry point.** Wiring `onAttackPress` (`src/hud/Hud.ts:151-157`) in `main.ts` to: create a PartyKit room, render a QR code for its join URL (client-side QR generation, e.g. the `qrcode` npm package), and open a WebSocket connection as room host. The existing procedural NPC crowd (eyes/cockroaches/pointedFinger/cockroach modes) keeps running unmodified as background filler — Protest Mode is additive, not a replacement mode.

**Mobile: join page.** A query-param view within the existing Vite SPA (e.g. `?join=<roomId>`), not a separate app or deploy. Renders: creature-type picker (eye/cockroach/finger), a short text input (≤60 chars) for the placard, and a submit button. No sign-in. On submit, connects to the PartyKit room and sends the payload; shows either a confirmation ("you're in the crowd") or an inline rejection message if the filter blocks the text.

**PartyKit room handler.** Runs the profanity/slur filter on incoming placard text before relaying to the host. Rejects with an error message back to the submitting phone on failure. Enforces a participant cap of ~150 concurrent live avatars per room — once the cap is reached, the oldest participant avatar is retired (faded out on desktop) to make room for the newest.

**Desktop: participant avatar pop-in.** On receiving an accepted submission, spawns a new creature of the chosen type into the live DOM crowd, visually distinguished from NPCs by a glow/highlight treatment plus a plain small text label showing their placard (not a banner/speech-bubble — a simple label). Positioned among the existing crowd using the same layout logic as NPC creatures.

## Error handling

- **Filter rejects placard text**: inline error on the phone join page; user can edit and resubmit. No content ever reaches the desktop crowd.
- **PartyKit connection drops (host)**: Protest Mode exits gracefully, QR code is invalidated, any already-spawned participant avatars remain in the crowd as ordinary NPCs (glow removed) rather than disappearing abruptly.
- **PartyKit connection drops (phone, mid-submit)**: submit button shows a retry state; no partial/duplicate avatars are spawned.
- **Room at participant cap**: new joiners are still accepted, but the oldest existing participant avatar is retired first — no submission is ever silently dropped.

## Testing

- Unit: profanity/filter function (accept/reject cases), participant-cap eviction logic (oldest-first), QR/room-URL construction.
- Unit: mobile join-page component (creature picker, text input validation, submit/error states) with mocked room connection.
- Manual (required — this touches `hud/` and the live crowd rendering per project convention): run `npm run dev`, open Protest Mode, scan the QR from an actual phone, submit a placard, verify pop-in glow/label rendering and cap/eviction behavior with multiple simultaneous joiners.

## Open questions for implementation planning

- Exact profanity/slur filter library or word-list source.
- Exact QR/join-URL format and how the desktop tab's PartyKit room ID is generated (random slug, length, collision handling).
- Visual spec for the glow/highlight treatment and label typography (hand off to a visual design pass, consistent with the paper-cut aesthetic in ADR 004).
