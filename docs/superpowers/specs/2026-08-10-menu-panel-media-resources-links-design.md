# Menu Panel — Media & Resources Links

## Context

`src/hud/menuContent.ts` holds `HERO_VIDEO` and `GALLERY_ENTRIES`, the static data behind the menu panel's "Support Independent Media" and "Other Resources" sub-screens (`src/hud/MenuPanel.ts`). Six of the seven video entries are still unresolved placeholders (`REPLACE_ME_SARTHAK_GOSWAMI`, `REPLACE_ME_UNFILTERED_SAMDISH`, `REPLACE_ME_JIST_NEWS_MEDIA`, `REPLACE_ME_DESHBHAKT`, `REPLACE_ME_BEING_HONEST`, `REPLACE_ME_RAVISH_KUMAR`), flagged since the [visual redesign](2026-08-09-protest-panel-visual-redesign-design.md) as a pre-existing content dependency. The user supplied 17 real YouTube links to resolve this, plus asked for additional "Other Resources" entries related to the project.

## Goals

- Replace the placeholder video entries in `menuContent.ts` with 17 real videos (real `videoId`/`title`/`channel`), resolved via YouTube's public oEmbed endpoint (no API key required).
- Drop the `HERO_VIDEO` concept — the current renderer (`MenuPanel.buildMediaScreen`) already treats it as just the first item in a flat list with no distinct styling, so a dedicated hero slot adds a concept without a visual payoff.
- Randomize video order on every visit to "Support Independent Media" (not a single fixed shuffle baked into source).
- Add 5 new entries to "Other Resources": two outlets that appear among the 17 videos but aren't otherwise represented (Jist, Brut India), and three civic-accountability tools that back the existing "How to Be a More Informed Citizen" tips (MyNeta, RTI Online, ECI Voter Services).

## Non-goals

- **No change to the "Independent Outlets" vs "Videos" grouping logic, share mechanics, or any other menu screen.** Only `menuContent.ts`'s data and `MenuPanel.buildMediaScreen`'s render call are touched.
- **No new UI chrome.** New source entries render through the existing `buildSourceTile`; no new tile variant, subheading, or category grouping is introduced.
- **No alphabetical or curated fixed order for "Other Resources."** Only the video list is randomized per this spec; the 8 resource entries are ordered by hand (grouped: outlets, movement-specific, civic tools) as authored below.
- **Not adding every channel represented in the 17 videos as its own resource entry.** Only Jist and Brut India, per explicit user selection — Newslaundry is already listed, and Sarthak Documentaries / Unfiltered by Samdish / Ravish Kumar Official / The Deshbhakt / Being Honest / The Wire are not added as separate resource entries in this pass.

## Design

### Video list — `GALLERY_ENTRIES` (video-kind entries), replacing `HERO_VIDEO` + the 6 placeholders

All 17 resolved via `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={id}&format=json` (`title` and `author_name` fields):

| videoId | title | channel |
|---|---|---|
| `0j0vUAo52PM` | Reality of 20th July Protest | Sarthak Documentaries |
| `DEsAc_NP1DM` | Vo Bheed Chahti Kya Thi? Sun Lo | Unfiltered by Samdish |
| `6MTXCAaOy3o` | This is How It Went Down on the 20th | Unfiltered by Samdish |
| `QXGWiMxELE8` | The Night That Changed CJP's Jantar Mantar Protest ft. Sonal | Jist |
| `bKGmZI2CCgk` | What is CJP's Next Step After Jantar Mantar Protest? ft. Pragati | Jist |
| `RFWOnRBIyTw` | The Night Cockroaches Refused to Sleep — NL's Jantar Mantar Ground Report | Newslaundry |
| `Sg31DwsPCps` | Jharkhand Vs Jantar Mantar — Good protester vs bad protester (TV Newsance 349) | Newslaundry |
| `ie2EZQ6yxUw` | How CJP Won at Jantar Mantar — Vibe Check with Abhinandan Sekhri | Newslaundry |
| `1-f2Kgv0UnQ` | डरी हुई, मरी हुई जनता नहीं है, जंतर मंतर पर हज़ारों की संख्या में पहुंचे लोग | Ravish Kumar Official |
| `d-bxa264z60` | सोनम वांगचुक को ले गई पुलिस, अभिजीत दीपके का अनशन शुरू, जंतर-मंतर पर भारी भीड़ #cjp | Ravish Kumar Official |
| `lQn6I0VBeKI` | The Many Revolts Of India — What's Fueling The Wave Of Protests Across The Nation? | The Deshbhakt |
| `b2VAqkLX1S8` | Pt.9 — Police Crush Protestors, Can CJP Still Win Now? | The Deshbhakt |
| `C8lw803JwQ8` | CJP Protest: 10 States Join Cockroaches, Going Global | Being Honest |
| `TfTmxq2KOwA` | CJP Protest: Modi Govt. on the Back Foot? Students Beaten! Lathi Charge & Tear Gas! | Being Honest |
| `tweydqL91M4` | What is keeping the Jantar Mantar protest going? | Brut India |
| `NIQL_LWOYE0` | What Went Wrong at CJP's Jantar Mantar Protest ft. Medha | Jist |
| `aM36ooXVhPI` | 20 July 2026 Student Protest in Delhi: A Blow by Blow Account | The Wire |

These are authored into `GALLERY_ENTRIES` in the table order above (order in source is irrelevant — see shuffle mechanism below). `HERO_VIDEO` and its export are deleted from `menuContent.ts`.

### Shuffle mechanism

A new pure function in `menuContent.ts`:

```ts
export function shuffleVideos(entries: readonly VideoEntry[], rng: () => number = Math.random): VideoEntry[]
```

Standard Fisher-Yates using the injected `rng` (defaults to `Math.random`; tests inject a seeded/fixed function for deterministic assertions). `MenuPanel.buildMediaScreen()` calls `shuffleVideos(GALLERY_ENTRIES.filter(e => e.kind === "video"))` each time it builds the screen — i.e. every time `navigateTo("media")` runs, including re-visits within the same session, not just page load.

### Other Resources — `GALLERY_ENTRIES` (source-kind entries)

Existing 3 (unchanged) + 5 new, in this order:

| label | href | icon |
|---|---|---|
| Newslaundry *(existing)* | `https://www.newslaundry.com/` | `N` |
| Jist | `https://www.youtube.com/@jistnews` | `J` |
| Brut India | `https://www.youtube.com/@BrutIndia` | `B` |
| Voice of the Swarm (CJP) *(existing)* | `https://www.thecockroachjantaparty.org.in/voice` | `🪳` |
| Andhbhakt — PIB vs CAG tracker *(existing)* | `https://andhbhakt.org/` | `🐊` |
| MyNeta — candidate records | `https://www.myneta.info/` | `🗳️` |
| RTI Online — file a request | `https://rtionline.gov.in/` | `📝` |
| ECI Voter Services | `https://voters.eci.gov.in/` | `🪪` |

`buildResourcesScreen()` is unchanged — it already renders every source-kind `GALLERY_ENTRIES` item in array order via `buildSourceTile`.

### Data flow

Unchanged shape: `MenuPanel.ts` still imports `GALLERY_ENTRIES` from `menuContent.ts` and filters by `kind`. The only new export is `shuffleVideos`; `HERO_VIDEO` is removed from both the module and its one import site (`MenuPanel.buildMediaScreen`).

### Error handling

Unchanged — `buildVideoTile`'s thumbnail `onerror` fallback (`replaceWithFallbackCard`) still applies; none of the new entries change that path.

## Content dependencies

None outstanding. All 17 video IDs, titles, and channels were resolved from YouTube's public oEmbed endpoint; all 5 new resource URLs are real, public, non-partisan (fact-check/civic-tools/outlet) destinations, consistent with the real-names policy already governing this app (real orgs/places are fine to name; no specific living person is named by this pass — channel bylines credit outlets/creators the app is promoting, not referencing individuals within the protest narrative).

## Test consequences (mechanical, not new coverage)

- `tests/unit/menuContent.test.ts`: the `"exposes a hero video entry"` test (asserts `HERO_VIDEO` exists) must be removed since the export is deleted. The `"exposes gallery entries mixing video and source kinds"` test keeps passing unchanged (still asserts non-empty, mixed-kind, well-formed entries).
- `tests/unit/menuPanel.test.ts`: the `"renders the hero video among the video tiles..."` test in the `support independent media screen` describe block references `HERO_VIDEO` directly and the `+ 1` hero count — needs updating to assert against the new video count (17) with no hero-specific assertion. The `"other resources screen"` describe block's source-entry-count assertion needs updating for the new count (8, was 3).
- No new test coverage is required for the shuffle behavior beyond what's naturally exercised (e.g. asserting `shuffleVideos` returns the same set of entries in some order, and is a pure function of its input + injected rng) — this is a nice-to-have the implementation plan can decide on, not a hard requirement of this spec.
