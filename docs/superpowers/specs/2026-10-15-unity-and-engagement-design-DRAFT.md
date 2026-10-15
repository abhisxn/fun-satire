# Unity-gated force and engagement redesign (DRAFT)

> Status: **draft for owner review**. Nothing here is built. It resumes and narrows [2026-10-09-gameplay-arc-and-lure-PARKED.md](2026-10-09-gameplay-arc-and-lure-PARKED.md): that note's open questions (its section 10) are answered here where the owner has decided, and left open otherwise.

## 1. Intent

The game is about accountability. The crowd is the public. The target is an institution and its representative, shown as accountable, not as a cartoon evil. Satire comes from the stonewalling ("no chance", "mistakes were made"), not from villainy.

Core idea (owner): **force works on a scattered crowd and fails on a united one.** When people drag, hold the target to account and protest alone, force shuts them down. When the crowd comes together as one power, force stops working.

Real-world grounding: the Oct 2026 "vote chori" protests at Jantar Mantar. Fragmented groups were stopped, detained or denied permission. Joint action ("different banners, one cause") raised the cost of force. See the sibling timeline session (ses_ec0be23cfffedwzr6tJZPW6RTg). Its dates and numbers were not cross-checked and must be verified before any appears in the game.

## 2. Roles

| Thing | Role |
|---|---|
| Draggable sticker (the figure) | The accountable target. Stonewalls, deflects, and its security units use force. Loses composure as unity rises. |
| Creatures | The public. Each is a person (see section 7). |
| Player | The observer whose attention and dragging pull the crowd together. |
| Security units (police/RAF) | The force. They are the system's reflex, not the enemy character. |

## 3. Core loop: unity gates force

1. **Unity** is a number from 0 to 1 derived from crowd size, clustering and variety of creature types (decided). The weights are placeholders to tune in playtest.
2. **Force is gated by unity.**
   - Low: raids hit hard, repel and thin the crowd (today's behaviour).
   - Rising: units slow, hesitate, get nudged back.
   - Full: force fails. Units visibly turn pale and retreat (the Pac-Man power-pellet flip). The target is exposed.
3. **Player decision:** protest too early and get crushed, wait too long and the target deflects, release at high unity and win.
4. **Readability:** a visible pressure ring or glow around the crowd, audio that thickens as unity rises, and a clear visual state change when force breaks. Raids get a short telegraph (siren/flicker) so a loss is always the player's fault, never a surprise.

Implementation home: `RaidController` and `raidRules`. `ForceField.ts` and `Engine.ts` stay untouched (load-bearing).

### Protest button (decided: keep)

Hold to charge, release to act. The charge rate scales with unity, so holding alone cannot win. Release wins only at high unity and inside the timing window. Widen the window early and tighten it by stage. Add a tap-to-stop accessibility alternative and a verdict stamp ("Too early", "Close", "Now") with hit-stop on release.

Open: exact unity constants (cluster radius, minimum count, decay, variety weight) need playtest tuning.

## 4. Creatures: one mixed canvas, unlocked in order

Drop the four-skin mode picker (`switchMode`, `MODE_CONFIGS`). All types coexist (four `EntityPool`s at once). This touches `CreatureGrid`'s core loop and needs a deliberate review.

| Order | Creature | Unlock | Role |
|---|---|---|---|
| 1 | Eyes | Free | Bulk. Cheap and fragile, thinned first by raids. |
| 2 | Pointed fingers | Gather eyes into one cluster | Accuse. Pressure bursts when aimed together. |
| 3 | Cockroaches | Survive a raid | Resilient. Raids cannot clear them. |
| 4 | Placards | Win a round | Voice. Highest unity per creature, rare and capped. |

Placement uses a resource (turnout/attention that accrues and comes from tasks), spent to add creatures. A cap on live placards makes choice matter.

Tiers within a type are **symbolic and unnamed**: no party, person or organisation. Cues instead: a crossed-out name list, a ballot box, an empty slip, a wiped fingertip. Wear and colour signal rarity. Placard text stays generic ("Count every vote", "Answer us"). Hints are enough for players to connect the dots.

## 5. Sticker size

- **Remove:** the mid-game 4-tier inflate ladder, the inflate tone, the resize handle's gameplay effect, and the repel-radius tracking that follows the sticker's scale.
- **Keep:** a full-power win deflates the sticker to its floor size and locks it, with the deflate tone. Size changes exactly once, as the payoff.
- Verify scope against `StickerOverlay.setScaleForRaidSize`, `SQUEEZE_MIN_SCALE`, `inflateTone.ts`, `deflateTone.ts` and `main.ts` before cutting.

## 6. Session shape and borrowed arcade lessons

Adopt now (small, high value):

1. The power-pellet flip: visible force retreat at full unity (section 3).
2. A 60 to 90 second round, a score from peak unity or crowd size, and an instant restart.
3. Pattern-based raids with a telegraph, arriving at a learnable rhythm that tightens.
4. Teach on the first screen: a few eyes follow the cursor, a lone unit shows the danger, one line of copy. Shrink the onboarding carousel.

Later, if the core is fun: unity streak multiplier, juice pass (hit-stop, ripple, placard burst), shareable result card (crowd screenshot plus a headline).

Skip: playing as police, extra buttons, a campaign that gates the toy. Do not copy the look or name of *Jantar Mantar Chalo* (mantarjantar.com), a multiplayer top-down game. This game is an ambient crowd toy, not a chase.

## 7. Stages (after the core works)

Short (60 to 90 s), replayable from any unlocked stage, plus a free-play sandbox with everything unlocked. Each stage changes the force tactic, not the goal. Keep the parked note's names-by-event approach.

| Stage | Force tactic | Lesson |
|---|---|---|
| Barricade | Blocks and repels | Gather |
| Permission denied | Thins scattered crowds | Stay together |
| Mass detention | Raids target clusters | Mix creature types, lean on cockroaches |
| Site closed | The target moves | Adapt and chase |

Do not build stages until the unity loop is fun on its own.

## 8. Creatures as real people (echo crowd)

The project has no backend today (Vite plus Google Analytics). Effort tiers:

1. Counter only: "N people stood here today". One serverless endpoint, no identity.
2. **Echo crowd (recommended first):** each visit leaves an anonymous persistent creature, so the canvas starts populated. Bots fill it first.
3. Live presence (realtime cursors): largest cost, only if 2 lands.

Decided: a backend is acceptable. **No logins.** Identity is an anonymous per-browser session id (generated locally, never tied to a person). **Cache first:** the canvas renders immediately from a locally cached crowd snapshot, then syncs with the server in the background, so the game works offline and never waits on the network.

Constraints: no accounts, no IP or location stored, preset slogans only (no free text), rate limits against scripted floods, one creature per session per visit. This is the first backend and needs its own ADR before any code.

## 9. Content guardrails

Carried from the parked note and ABOUT.md: no living person is ever named. Institutions stay generic; real places and events may be named. Two real activists are in judicial custody with active FIRs in the source timeline, so nothing may depict or mock named individuals. A fictional win line is fine as satire but must not read as news ("resigns" has not happened).

## 10. Delivery sequence (one branch per step, each from fresh `main`)

| # | Branch | Scope |
|---|---|---|
| 1 | `refactor/remove-sticker-inflate` | Section 5 |
| 2 | `feat/unity-force-gating` | Section 3 on the current single-type crowd |
| 3 | `feat/mixed-crowd-unlocks` | Section 4 |
| 4 | `feat/round-score-restart` | Section 6 items 2 to 4 |
| 5 | `feat/echo-crowd` | Section 8, after its ADR |
| 6 | `feat/stages` | Section 7 |

Per `AGENTS.md`: run `npm test`, then verify in a browser via `npm run dev` for anything touching `physics/`, `creatures/`, `audio/`, `hud/`. Update `system-architecture.md` ADRs when steps 2, 3 and 5 land.

## 11. Decisions and open questions

Decided (owner, 2026-10-15):
- The figure is **not** called a "villain" anywhere. Code and copy use a neutral term (proposed: "the accountable" in docs, `target` in code).
- Unity is size plus clustering plus variety.
- The Protest hold-and-release button stays (section 3).
- A backend is acceptable for the echo crowd: session-based, cache first, no login.

- Round length is **75 seconds**.
- A loss **resets the stage** (instant restart, unlocks kept). This replaces the parked note's "drop one rung" idea.

Still open:
1. Final name for the target in code (`target` proposed).
