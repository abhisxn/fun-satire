# Gameplay: arc, roles and lure loop (PARKED, brainstorm in progress)

> Status: **parked**. Nothing here is decided or scheduled. It records the brainstorm of 2026-10-09 so we can resume without re-deriving it. Improvement work that does not depend on gameplay lives in [../plans/2026-10-09-polish-performance-time-of-day.md](../plans/2026-10-09-polish-performance-time-of-day.md).

## 1. Intent (from the owner)

The game shows the power of unity: one person starts, the crowd slowly joins, and it ripples into a full revolution.

Arc: **Single person -> Small protest -> Big protest -> Nation-wide revolution.**

## 2. Roles (settled)

| Thing | Role |
|---|---|
| Draggable avatar / sticker ("Tax Tai" and the other stickers) | The **villain** (the oppressor) |
| Creatures (eyes, pointed fingers, cockroaches, placards) | **Us**, the public |
| The player | The **narrator / witness** who motivates the creatures to protest the villain |
| One highlighted creature (different colour) | "The user" creature, the narrator's proxy inside the crowd |
| Guide / mentor NPC | Speaks in blurbs telling the player what to do next. Example: "Hurry! We must collect powers to gain more strength" |

Roles were corrected twice in the brainstorm. Earlier notes that treated the avatar as the protagonist were wrong and are discarded.

## 3. Figma references

File `oPAdd7oWLQVMTP1v6pJOW0` (fun-satire).

- Node `497:6112`: the same screen at day, dusk and night (palette studies). Used by the time-of-day plan, not by gameplay.
- Node `497:6113`: five-frame gameplay storyboard.
  1. Villain at centre. The bait word "tax" appears bottom-left.
  2. Villain walks to the word.
  3. A new bait word appears top-right.
  4. Villain walks there. A coin is left behind where it was, next to the highlighted eye.
  5. The highlighted eye collects the coin and more eyes appear: the crowd grows.

## 4. Option 1: lure loop (owner's proposal)

- Bait words appear: more tax, more power, more scams, more ribbon cutting, more chori, more jumla.
- The villain moves toward each word automatically. When it leaves, it leaves power/coins behind.
- The highlighted creature collects them. Each collection makes more creatures join. Repeat until we are many.
- NPC mentor blurbs explain what to do.

### Assessment

Strengths:
- Fits the narrator role. The satire is the villain's greed and distractibility.
- The loop is the ripple: one person collects, others join.

Risks:
- It can degrade into a generic coin collector with the satire as paint.
- A passive, scripted villain has no tension.

### Candidate improvements (not agreed)

1. **Villain attention as the threat.** The coin drops where the bait was. It is only safe to grab while the villain looks at the next bait. If the villain notices the highlighted creature, it gets shooed away. Rhythm: bait, distraction, dash. Reuses the existing repel physics.
2. **Narrator places the bait** (variant of Option 1). The player drops words to steer the villain away from the crowd while the crowd collects. Makes "motivating the creatures" literal and gives the narrator real agency. Needs owner approval.
3. **Collectible naming.** The mentor blurb calls the coins "powers", which is what we collect. An alternative with more meaning is "receipts" (proof of what they did). Optional.

## 5. Option 2: drag the villain (owner's proposal)

Same loop, but the player drags the villain at the centre. The villain gets angry, shakes, and sends raids.

### Assessment

- It is the current physics toy, and it is fun, but it makes the player the villain's handler, which fights the narrator role.
- Suggested home: a **sandbox mode**, or the **finale**: with a huge crowd the lure stops working, the villain gets angry and raids, and the unison moment pays off.

## 6. Stage idea (from the arc)

Name stages by what happens, not "Stage N".

| Stage | Crowd | Likely clear condition |
|---|---|---|
| One person | A few indifferent eyes | First creature joins |
| Small protest | Tens | Roughly a quarter converted |
| Big protest | Hundreds, first raid | Roughly 60% converted and hold through a raid |
| Nation-wide | Placards lead, other squares answer from screen edges | Final unison release |

Percentages are placeholders.

### Conversion ladder (idea only, unconfirmed)

The four creature modes as one person's journey: **eyes** (sees) -> **pointed finger** (names the villain) -> **cockroach** (joins, moves) -> **placard** (speaks). Today the modes are four whole-crowd skins swapped by `grid.switchMode()`, which clears and respawns the crowd. A ladder would need the four to coexist (four `EntityPool`s running at once), which touches `CreatureGrid`'s core loop and needs a deliberate review.

### Win and lose (idea only)

- Win: crowd ready plus a well-timed unison release. The villain is cut down to its floor size and locked.
- Lose: a setback, not game over. Raids and misses push people down a rung but never below the existing 25% core (`RAID_FLOOR_FRACTION`). A momentum bar could send a failed run back to the start of the previous stage, keeping unlocks.

## 7. Open: Protest button and strength meter

Undecided. Ideas on the table:

- Reframe the meter as "the moment" (crowd rhythm, unison) instead of "strength".
- Make it visible at rest with a drawn target band, name it for what it does, add hit-stop and a verdict stamp ("Too early", "Close", "Now") on release.
- The current win window is about 175 ms around the peak, once every 2.2 s (`FULL_POWER_THRESHOLD` 0.92, `CHARGE_SWEEP_HALF_PERIOD_MS` 1100). Widen it early and tighten it across stages.
- Offer tap-to-stop as an accessibility alternative to hold-and-release.
- Possible placement: the finale beat of Option 2 (see section 5).
- The deferred drag-vs-charge deadzone UX item from v1 (see memory note `project_subject_v2_followup`) belongs in this redesign. Ask what felt wrong before redesigning.

## 8. Avatar inflate

Existing behaviour: the villain swells in 4 discrete tiers as security units grow (`StickerOverlay.setScaleForRaidSize`). A full-power release locks it to `SQUEEZE_MIN_SCALE` (0.55).

Readability problem: players cannot tell what causes the swelling or the shrink. Ideas: tie each tier to a visible face tell and to the security units feeding it; show our conversion as the counterweight that squeezes it back; replace the 1 s ease-in-out tween with squash, overshoot and settle on the way up, and a slow exhale on the way down. If the lure loop wins, inflate may need to be re-derived from the villain's attention or power instead of raid size.

## 9. Content guardrails

- Bait words stay about policies and behaviours, not named people. The stickers are recognisable caricatures, so the word list is where the real-names policy can slip. Hard line: no specific living person is ever named.
- Institutions stay generic. Real places and events may be named (see `ABOUT.md`).
- Smoke or tear gas imagery relates to the real event. If used, tie it to raids and handle it with care.
- Intro copy for this arc: 4 short beats (one per stage) plus in-game coaching. Draft only through /write after an outline is confirmed.

## 10. Resume checklist

1. Decide Option 1, Option 2 or the hybrid (sandbox or finale).
2. Decide whether the narrator places bait or only watches it arrive.
3. Decide the fate of the Protest button and the meter.
4. Decide whether the conversion ladder replaces the four-skin mode picker.
5. Then write the real spec from this note and plan the stages.
