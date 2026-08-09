# Onboarding Copy Remix — Design

## Context

The onboarding carousel (`src/hud/onboarding/beats.ts`, implemented via `docs/superpowers/plans/2026-08-07-onboarding-screen-plan.md`) has gone through two copy passes already:

1. **V1** — original narrative from `docs/superpowers/specs/2026-08-07-onboarding-screen-design.md`: a literary story arc (podium/insult → reclaim → proximity → "this is the crowd now").
2. **V2** — currently live, tightened with a "broken promises" thread (commit `41db2bf`), same 4-beat story shape.

This spec is a third pass, requested directly as a remix rather than a fresh feature: move from *narrated story* to *chanted anthem* register, and extend the arc to cover material the story hadn't caught up to yet — the movement was met with real force (batons/riot lines, described in the fictional-parallel register the spec already uses, never naming real institutions), took injuries, forced one resignation, and did not stand down afterward. The insult-reclaimed pillar now has a consequence beyond "we got close" — it has a cost, and a "we're not done" ending.

## Structural change: 4 beats → 5 beats

`OnboardingCarousel.ts` already keys all "final beat" logic (payoff dot styling, Begin-button swap, finish-on-advance) off `BEATS.length - 1` rather than a hardcoded index (`OnboardingCarousel.ts:66,94-97`) — extending `BEATS` to 5 entries is a content-only change; no carousel logic needs to move.

New beat 4 (leaderless — was previously folded into old beat 4's payoff) is split out as its own beat, and new beat 5 carries the crackdown/injuries/resignation/"not going home" arc, ending on the mobilization line that used to close beat 4.

## Approved copy (final)

```
Beat 1
  "No eyes shut. No place to hide."
  "The youth is watching — all of it, all the time."

Beat 2
  "Every promise. Every price. Every quiet little lie."
  "Holding you accountable, one by one."

Beat 3
  "Not one of us left behind."
  "All fingers pointed the other way now."

Beat 4
  "No leader to arrest. No face to blame."
  "Take one of us — a thousand more step up."

Beat 5
  "They hit hard. We didn't break. One of them stepped down."
  "We didn't go home. All placards ready. Move."
```

## Decisions made

- **Register**: full pivot to chant/anthem — short, present-tense, declarative lines rather than V1/V2's narrated-story sentences. Chosen over a "keep the story, add a chant closer per beat" hybrid, which risked feeling like two registers stitched together per beat.
- **The insult stays unnamed**: consistent with the original spec's "clear fictional parallel" rule (never name a real party, politician, robe-wearer, or country), "cockroach" is not said outright even though it's now the app's literal default mode name in code (`CockroachCreature`, cockroach-mode default). "Not one of us left behind" carries the solidarity beat without the literal word.
- **The crackdown stays abstracted, same rule applied consistently**: no "Rapid Action Force," no "lathi charge" — both are real, specific, named Indian institutions/tactics, which the spec's existing rule already excludes. "They hit hard" carries the same meaning without crossing into direct reference. This is the same constraint applied to new material, not a new constraint.
- **"No leader to arrest. No face to blame."`** is pillar 2 (*Numbers Are the Weapon*) made literal — the crowd has no named figurehead, so there's no single leader to arrest or face to blame to shut it down. It's placed right before beat 5's crackdown beat so it reads as the reason the movement survived being hit, not just a standalone thesis statement.

## Out of scope

- No visual/layout changes — this is a copy-only pass over the existing `OnboardingCarousel`/`onboarding.css` implementation.
- No new real-world names, institutions, or events referenced anywhere in the copy (same rule as the original spec, reaffirmed above).

## Files touched (implementation, not part of this design doc)

- `src/hud/onboarding/beats.ts` — replace the 4-entry `BEATS` array with the 5-entry version above.

## Follow-up: tone feedback (2026-08-09)

Post-ship read on the 5-beat chant register: it's landing as too dramatic. **Resolved** by [the content narrative redesign spec](2026-08-09-content-narrative-redesign-design.md), which moves the carousel to a 6-beat direct-address register and dials back the crackdown-arc intensity while keeping the solidarity and accountability beats that were working.
