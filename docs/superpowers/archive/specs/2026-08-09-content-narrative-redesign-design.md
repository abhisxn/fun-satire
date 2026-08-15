# Content Narrative Redesign — Design

## Context

Follow-up to [the onboarding copy remix spec](2026-08-09-onboarding-copy-remix-design.md), whose closing note flagged the 5-beat chant register as "too dramatic" and left a fourth pass undesigned. The user came back with a much fuller narrative brief covering the real movement this app is an ode to (solidarity across state/religion/caste, independent journalists, remote supporters, humor as a response to force, one resignation) and asked for a coordinated redesign across four surfaces: the onboarding carousel, the in-repo `ABOUT.md` "about" copy, its "responsible citizen" copy, and the in-app share line.

This spec resolves that follow-up and supersedes its "not yet designed" status.

## Decisions

**Real-world reference policy** (tightened from the original spec's blanket "never name anything real"):
- **Real places/events are fine** — e.g. "Jantar Mantar," "the capital." This app is explicitly an ode to a real, still-recent movement, not a fictional parallel one.
- **Institutions and offices stay fictionalized/generic** — no naming a specific court, ministry, or political party. ("CJP" stays, since research showed it's the real movement's own press-given nickname, not an invented parallel — see note below.)
- **No specific living person is ever named**, regardless of role.
- Research (via WebSearch) confirmed "Cockroach Janta Party" / "CJP" is literally how major outlets (CNN, Bloomberg, NPR, Al Jazeera) referred to the real July 2026 Delhi/Jantar Mantar protests over exam-paper-leak irregularities, which ended in a real education minister's resignation. The app's existing "CJP" branding already matches this — it was not, in fact, a fictionalization, and keeping it is consistent with the tightened policy above (real event, generic institution framing, no named individuals).

**Onboarding register**: direct-address, dialed down. Chant/anthem repetition is dropped in favor of plainer declarative lines that still land as confrontational ("You forgot we were watching. We didn't.") without the crackdown-arc intensity that prompted the "too dramatic" feedback.

**Onboarding structure**: 5 beats → 6 beats. `OnboardingCarousel.ts` keys all "final beat" behavior off `BEATS.length - 1` (dot styling, Begin-button swap, finish-on-advance), so this is a content-only change — no carousel logic moves. The extra beat gives the crowd mechanic (drag a sticker in, the crowd surrounds it) its own slot instead of folding it into an emotional beat, and lets the humor-as-response thread ("we laughed back — memes, reels, dance") live inside the crackdown beat rather than needing a beat of its own.

**Content mapping**: no in-app "About" panel exists (only `ProtestPanel`'s one-line `HONEST_NOTE` and the `SHARE_MESSAGE` share text). The "about this project" (~1600 char) and "responsible citizen" (~1000 char) asks map to `ABOUT.md`, which already carries this content at roughly these sizes:
- `## What this is` (954 chars) + `## Why I made it` (613 chars) → merged into one `## About this project` section (~1600 target).
- `## What you can do as a responsible citizen` (464 chars) → expanded to ~1000 chars, same four points with added reasoning per point.
- `## More than a fun game` and `## Key takeaways` stay as separate sections, lightly revised for consistency with the new "About this project" section (not rewritten to a budget).
- `## A note on tone` is removed: it documented the now-resolved "too dramatic" follow-up and would otherwise go stale as a public-facing doc.

**Mechanic tie-in**: explicit, not atmospheric. Both the onboarding (beat 3) and the About copy name the mechanic directly (drag a sticker in, the crowd of eyes/fingers/cockroaches/placards surrounds it) and explicitly connect it to the site name ("That's why we call this Gutter Generation").

**Share line**: replaces `SHARE_MESSAGE` in `src/hud/ProtestPanel.ts` (used to pre-fill WhatsApp/Reddit/native share text), grown from 53 to ~120 chars to carry the mechanic + name callback instead of a generic "come see for yourself."

## Approved copy (final)

### Onboarding — `src/hud/onboarding/beats.ts`

```
Beat 1 — insult reclaimed
  "You called us cockroaches. Gutter generation."
  "We picked the names up. We're still wearing them."

Beat 2 — solidarity
  "Different states. Different faiths. Same square."
  "That's not a mob. That's all of us."

Beat 3 — mechanic + name
  "Drop them in. Watch the crowd close in around them."
  "That's why we call this Gutter Generation."

Beat 4 — accountability
  "Every promise. Every price. Every quiet lie."
  "You forgot we were watching. We didn't."

Beat 5 — crackdown, survived, humor
  "You hit hard. We laughed back — memes, reels, dance."
  "One of you stepped down. We didn't go home."

Beat 6 — closing / mobilize
  "No leader to arrest. No face to blame."
  "Just thousands of us. Move."
```

### `ABOUT.md` — `## About this project` (replaces `## What this is` + `## Why I made it`)

> Gutter Generation is a playful, and dead serious, take on something real: a generation that got called cockroaches and gutter generation, and wore both as badges instead of insults.
>
> For weeks, thousands of us filled Jantar Mantar, in the capital — different states, different faiths, different castes. Turns out none of that mattered as much as we'd been told it would. One voice, one demand: show up, or step down. No single leader. No face to arrest. Just numbers, and numbers don't scare that easily.
>
> Independent journalists stayed on the ground asking the questions officials wouldn't answer. People who couldn't make it sent food, ran errands for those who could, or just refreshed their feed for updates — living the protest through a screen instead of the square. When it turned physical, we didn't disappear. We danced. We memed. We kept showing up. Some of us got hurt doing it. One of them stepped down. Nobody went home.
>
> This app is that story, turned into a toy. Drop a sticker of anyone you want into the crowd, and watch: eyes track them, fingers point, cockroaches swarm, placards go up. Nowhere left to hide, nothing left unwatched. That's why it's called Gutter Generation — the name they used against us is now the thing surrounding you.
>
> I built it to push past what I'd normally do with AI — not a static page, something with real feel: physics, timing, a crowd that actually reacts. Started as a weekend project. The crowd had other plans.

(1,463 chars)

### `ABOUT.md` — `## What you can do as a responsible citizen`

> A protest gets you heard once. What you do after is what keeps you heard.
>
> - **Vote, and vote wisely.** Not for propaganda, not for a face on a poster, not for whoever shouts loudest online. Vote for your local representative, on their actual record — the party's national face isn't who shows up when your street needs fixing.
> - **Make room for discussion, not fights.** Disagreement isn't the enemy; contempt is. You can hold a hard line and still hear someone out — that's how anything actually changes, and how you tell a real debate from a pile-on.
> - **Question authorities and agencies, always.** They exist to serve you, not the other way round. That only stays true if people keep asking, out loud, in public, without waiting for permission.
> - **Get your news from credible, independent sources.** Not outlets that exist to keep you comfortable and distracted. If a story only ever makes you angry at someone else, ask who benefits from that.

(950 chars)

### Share line — `SHARE_MESSAGE` in `src/hud/ProtestPanel.ts`

> "I dropped them into the crowd — eyes, fingers, cockroaches, and placards closed in. This is Gutter Generation. Come try it."

(123 chars)

## Out of scope

- No visual/layout changes to the onboarding carousel or protest panel — copy-only.
- `## More than a fun game` and `## Key takeaways` in `ABOUT.md` get a light consistency pass (removing anything now redundant with the merged About section) but are not rewritten wholesale.
- `HONEST_NOTE` in `ProtestPanel.ts` ("I made this as a toy. There's a real movement behind it.") is unchanged — not part of this brief.

## Files touched

- `src/hud/onboarding/beats.ts` — replace the 5-entry `BEATS` array with the 6-entry version above.
- `tests/unit/onboardingCarousel.test.ts` — update the verbatim-copy test and any beat-count-sensitive text to match 6 beats.
- `ABOUT.md` — merge `What this is` + `Why I made it` into `About this project`; expand `What you can do as a responsible citizen`; remove `A note on tone`; light pass on `More than a fun game` / `Key takeaways` for consistency.
- `src/hud/ProtestPanel.ts` — update `SHARE_MESSAGE`.
- `docs/superpowers/specs/2026-08-09-onboarding-copy-remix-design.md` — mark its tone follow-up as resolved, pointing here.

## Addendum: reconciled with the concurrent menu-panel redesign (2026-08-10)

While this spec's copy was being implemented, a separate parallel effort (`2026-08-09-protest-panel-visual-redesign-design.md` → `-content-redesign-design.md` → `-menu-redesign-design.md`) restructured `ProtestPanel.ts` into `MenuPanel.ts` (+ `menuContent.ts`), detached from the old bottom "Protest" button onto a new top-right `MenuButton`, and merged to `main` as commit `c72a1b0`. That track made its own deliberate content decisions for the panel itself — a fully-specified "About This Project" sub-screen and a 7-tip "How to Be a More Informed Citizen" sub-screen, both **explicitly excluding any reference to the real-world movement** (a stricter stance than this spec's "real places, fictionalized institutions" policy). Both of that track's specs explicitly left `SHARE_MESSAGE` unchanged/open.

Resolution: this spec's onboarding and `ABOUT.md` copy are unaffected (different files). The share-line copy above was re-applied onto the new `src/hud/MenuPanel.ts` (`SHARE_MESSAGE` constant) and `tests/unit/menuPanel.test.ts`, since that's the one slot the other track left for this work to fill.

**Update (2026-08-10, later same session):** the user asked for the `About This Project` / `How to Be a More Informed Citizen` sub-screens to be updated too, and explicitly chose to drop the other track's no-real-reference stance in favor of this spec's policy. `MenuPanel.ts`'s About screen now carries this spec's exact 5-paragraph "About this project" copy verbatim (real places included — "Jantar Mantar," "the capital"). Its Informed screen keeps the other track's 7 tips as a base but merges in this spec's citizen-action content (voting for a local rep on their record, discussion-not-fights, questioning authorities) for 8 tips total, plus a new intro line ("A protest gets you heard once..."). `tests/unit/menuPanel.test.ts` updated to match (5 paragraphs, 8 tips + intro). This supersedes the "explicitly excluding any reference to the real-world movement" decision recorded in `2026-08-09-protest-panel-content-redesign-design.md` and `2026-08-09-protest-panel-menu-redesign-design.md` for these two sub-screens specifically — their other content (gallery/media/resources screens, share mechanics, navigation model) is untouched and still governs.
