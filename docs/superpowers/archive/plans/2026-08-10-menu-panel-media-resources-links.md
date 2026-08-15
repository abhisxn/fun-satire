# Menu Panel Media & Resources Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6 placeholder "Support Independent Media" video entries with 17 real, oEmbed-verified YouTube videos that reshuffle on every visit, and add 5 new "Other Resources" entries (Jist, Brut India, MyNeta, RTI Online, ECI Voter Services).

**Architecture:** All content lives in `src/hud/menuContent.ts` as the `GALLERY_ENTRIES` array (mixed `video`/`source` kind), consumed by `src/hud/MenuPanel.ts`'s `buildMediaScreen()` and `buildResourcesScreen()`. This plan adds one new pure function (`shuffleVideos`, Fisher-Yates) to `menuContent.ts`, replaces/extends the static data, removes the now-unused `HERO_VIDEO` concept, and updates the two test files that reference it.

**Tech Stack:** TypeScript, Vite, Vitest (`happy-dom` environment for DOM tests).

**Spec:** [docs/superpowers/specs/2026-08-10-menu-panel-media-resources-links-design.md](../specs/2026-08-10-menu-panel-media-resources-links-design.md)

---

### Task 1: Add `shuffleVideos` pure function

**Files:**
- Modify: `src/hud/menuContent.ts` (add after `buildYouTubeWatchUrl`, currently lines 21-23)
- Test: `tests/unit/menuContent.test.ts`

- [ ] **Step 1: Write the failing test**

Modify the top of `tests/unit/menuContent.test.ts` to import `shuffleVideos` and the `VideoEntry` type:

```ts
import { describe, it, expect } from "vitest";
import {
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  shuffleVideos,
  HERO_VIDEO,
  GALLERY_ENTRIES,
  type VideoEntry,
} from "../../src/hud/menuContent";
```

Add this new `describe` block at the end of the file, inside the outer `describe("hud/menuContent", ...)` block (after the existing `"exposes gallery entries..."` test, before its closing `});`):

```ts
  describe("shuffleVideos", () => {
    const A: VideoEntry = { kind: "video", videoId: "aaa", title: "A", channel: "Chan A" };
    const B: VideoEntry = { kind: "video", videoId: "bbb", title: "B", channel: "Chan B" };
    const C: VideoEntry = { kind: "video", videoId: "ccc", title: "C", channel: "Chan C" };
    const entries: VideoEntry[] = [A, B, C];

    it("returns a permutation of the input without mutating it", () => {
      const original = [...entries];
      const result = shuffleVideos(entries, () => 0);

      expect(result).not.toBe(entries);
      expect(entries).toEqual(original);
      const byId = (x: VideoEntry, y: VideoEntry) => x.videoId.localeCompare(y.videoId);
      expect([...result].sort(byId)).toEqual([...entries].sort(byId));
    });

    it("shuffles deterministically for a given rng (Fisher-Yates)", () => {
      const result = shuffleVideos(entries, () => 0);
      expect(result).toEqual([B, C, A]);
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/menuContent.test.ts`
Expected: FAIL — `shuffleVideos` is not exported from `menuContent.ts` yet, so the import resolves to `undefined` and calling it throws (`shuffleVideos is not a function`) or Vite reports a missing-export error.

- [ ] **Step 3: Implement `shuffleVideos`**

In `src/hud/menuContent.ts`, add this directly below `buildYouTubeWatchUrl` (line 23) and above the `// CONTENT DEPENDENCY` comment (line 25):

```ts
export function shuffleVideos(
  entries: readonly VideoEntry[],
  rng: () => number = Math.random,
): VideoEntry[] {
  const result = [...entries];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/menuContent.test.ts`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 5: Commit**

```bash
git add src/hud/menuContent.ts tests/unit/menuContent.test.ts
git commit -m "feat: add shuffleVideos pure function for menu video ordering"
```

---

### Task 2: Replace placeholder videos with 17 real videos, drop the hero concept

**Files:**
- Modify: `src/hud/menuContent.ts` (delete `HERO_VIDEO`, replace the 6 placeholder video entries in `GALLERY_ENTRIES`)
- Modify: `src/hud/MenuPanel.ts` (`buildMediaScreen`, its imports)
- Test: `tests/unit/menuContent.test.ts`, `tests/unit/menuPanel.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/menuContent.test.ts`:

1. Remove `HERO_VIDEO` from the import list (leave `shuffleVideos`, `GALLERY_ENTRIES`, etc. as Task 1 left them).
1. Delete the entire `"exposes a hero video entry"` test block:

```ts
  it("exposes a hero video entry", () => {
    expect(HERO_VIDEO.kind).toBe("video");
    expect(HERO_VIDEO.videoId.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.title.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.channel.length).toBeGreaterThan(0);
  });
```

In `tests/unit/menuPanel.test.ts`:

1. Change the top import (line 4) from:

```ts
import { HERO_VIDEO, GALLERY_ENTRIES } from "../../src/hud/menuContent";
```

to:

```ts
import { GALLERY_ENTRIES } from "../../src/hud/menuContent";
```

1. Replace the entire first test in the `"support independent media screen"` describe block (the one currently named `"renders the hero video among the video tiles..."`, lines 164-181) with:

```ts
    it("renders a video tile per video entry, linking to the YouTube watch URL, with no source tiles", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Support Independent Media");

      const videoEntries = GALLERY_ENTRIES.filter((e) => e.kind === "video");
      const videoTiles = root.querySelectorAll<HTMLAnchorElement>(".menu-gallery-list .menu-tile--video");
      expect(videoTiles.length).toBe(videoEntries.length);

      const expectedHrefs = new Set(
        videoEntries.map((e) => `https://www.youtube.com/watch?v=${e.videoId}`),
      );
      const actualHrefs = new Set(Array.from(videoTiles).map((t) => t.href));
      expect(actualHrefs).toEqual(expectedHrefs);

      for (const tile of Array.from(videoTiles)) {
        expect(tile.target).toBe("_blank");
        expect(tile.querySelector(".menu-tile-thumb")).not.toBeNull();
      }

      expect(root.querySelectorAll(".menu-gallery-list .menu-tile--source").length).toBe(0);
    });
```

(The second test in that block, `"falls back to a source-style card when a video thumbnail fails to load"`, is unchanged — it doesn't reference specific videos.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/menuPanel.test.ts`
Expected: FAIL on `"renders a video tile per video entry..."` — it expects 5 video tiles (the current 5 `GALLERY_ENTRIES` video placeholders) but `MenuPanel` still prepends `HERO_VIDEO`, rendering 6.

- [ ] **Step 3: Implement — replace the video data and drop the hero concept**

In `src/hud/menuContent.ts`, delete the `HERO_VIDEO` export and replace the 6 `REPLACE_ME_*` video entries at the start of `GALLERY_ENTRIES` with the 17 real ones. Replace the entire block from the `// CONTENT DEPENDENCY` comment (originally line 25) through `GALLERY_ENTRIES`'s closing `];` (originally line 84) — i.e. everything from `// CONTENT DEPENDENCY` to the end of the file — with:

```ts
export const GALLERY_ENTRIES: readonly GalleryEntry[] = [
  { kind: "video", videoId: "0j0vUAo52PM", title: "Reality of 20th July Protest", channel: "Sarthak Documentaries" },
  { kind: "video", videoId: "DEsAc_NP1DM", title: "Vo Bheed Chahti Kya Thi? Sun Lo", channel: "Unfiltered by Samdish" },
  { kind: "video", videoId: "6MTXCAaOy3o", title: "This is How It Went Down on the 20th", channel: "Unfiltered by Samdish" },
  { kind: "video", videoId: "QXGWiMxELE8", title: "The Night That Changed CJP's Jantar Mantar Protest ft. Sonal", channel: "Jist" },
  { kind: "video", videoId: "bKGmZI2CCgk", title: "What is CJP's Next Step After Jantar Mantar Protest? ft. Pragati", channel: "Jist" },
  { kind: "video", videoId: "RFWOnRBIyTw", title: "The Night Cockroaches Refused to Sleep — NL's Jantar Mantar Ground Report", channel: "Newslaundry" },
  { kind: "video", videoId: "Sg31DwsPCps", title: "Jharkhand Vs Jantar Mantar — Good protester vs bad protester (TV Newsance 349)", channel: "Newslaundry" },
  { kind: "video", videoId: "ie2EZQ6yxUw", title: "How CJP Won at Jantar Mantar — Vibe Check with Abhinandan Sekhri", channel: "Newslaundry" },
  { kind: "video", videoId: "1-f2Kgv0UnQ", title: "डरी हुई, मरी हुई जनता नहीं है, जंतर मंतर पर हज़ारों की संख्या में पहुंचे लोग", channel: "Ravish Kumar Official" },
  { kind: "video", videoId: "d-bxa264z60", title: "सोनम वांगचुक को ले गई पुलिस, अभिजीत दीपके का अनशन शुरू, जंतर-मंतर पर भारी भीड़ #cjp", channel: "Ravish Kumar Official" },
  { kind: "video", videoId: "lQn6I0VBeKI", title: "The Many Revolts Of India — What's Fueling The Wave Of Protests Across The Nation?", channel: "The Deshbhakt" },
  { kind: "video", videoId: "b2VAqkLX1S8", title: "Pt.9 — Police Crush Protestors, Can CJP Still Win Now?", channel: "The Deshbhakt" },
  { kind: "video", videoId: "C8lw803JwQ8", title: "CJP Protest: 10 States Join Cockroaches, Going Global", channel: "Being Honest" },
  { kind: "video", videoId: "TfTmxq2KOwA", title: "CJP Protest: Modi Govt. on the Back Foot? Students Beaten! Lathi Charge & Tear Gas!", channel: "Being Honest" },
  { kind: "video", videoId: "tweydqL91M4", title: "What is keeping the Jantar Mantar protest going?", channel: "Brut India" },
  { kind: "video", videoId: "NIQL_LWOYE0", title: "What Went Wrong at CJP's Jantar Mantar Protest ft. Medha", channel: "Jist" },
  { kind: "video", videoId: "aM36ooXVhPI", title: "20 July 2026 Student Protest in Delhi: A Blow by Blow Account", channel: "The Wire" },
  {
    kind: "source",
    href: "https://www.newslaundry.com/",
    label: "Newslaundry",
    icon: "N",
  },
  {
    kind: "source",
    href: "https://www.thecockroachjantaparty.org.in/voice",
    label: "Voice of the Swarm (CJP)",
    icon: "🪳",
  },
  {
    kind: "source",
    href: "https://andhbhakt.org/",
    label: "Andhbhakt — PIB vs CAG tracker",
    icon: "🐊",
  },
];
```

(This keeps the existing 3 source entries as-is for now — Task 3 adds the 5 new ones. The `HERO_VIDEO` constant and its `CONTENT DEPENDENCY` comment are gone entirely; there is no longer any `REPLACE_ME_*` placeholder in the file.)

In `src/hud/MenuPanel.ts`:

1. Update the import block (lines 9-16) — remove `HERO_VIDEO`, add `shuffleVideos`:

```ts
import {
  GALLERY_ENTRIES,
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  shuffleVideos,
  type VideoEntry,
  type SourceEntry,
} from "./menuContent";
```

1. Update `buildMediaScreen()` (lines 292-302) to drop the hero prepend and shuffle:

```ts
  private buildMediaScreen(): HTMLElement {
    const videoEntries = shuffleVideos(GALLERY_ENTRIES.filter((e) => e.kind === "video"));

    const videoList = document.createElement("div");
    videoList.className = "menu-gallery-list";
    for (const entry of videoEntries) {
      videoList.appendChild(this.buildVideoTile(entry));
    }

    return this.buildSubScreen("Support Independent Media", videoList);
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/menuContent.test.ts tests/unit/menuPanel.test.ts`
Expected: PASS (all tests in both files)

- [ ] **Step 5: Commit**

```bash
git add src/hud/menuContent.ts src/hud/MenuPanel.ts tests/unit/menuContent.test.ts tests/unit/menuPanel.test.ts
git commit -m "feat: replace placeholder videos with 17 real videos, drop hero concept, shuffle on every visit"
```

---

### Task 3: Add 5 new Other Resources entries

**Files:**
- Modify: `src/hud/menuContent.ts` (`GALLERY_ENTRIES` source-kind entries)
- Test: `tests/unit/menuContent.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block to `tests/unit/menuContent.test.ts` (inside the outer `describe("hud/menuContent", ...)` block, after the `shuffleVideos` block added in Task 1):

```ts
  describe("other resources entries", () => {
    it("lists all outlets and civic tools in the expected order", () => {
      const hrefs = GALLERY_ENTRIES.filter((e) => e.kind === "source").map((e) =>
        e.kind === "source" ? e.href : "",
      );
      expect(hrefs).toEqual([
        "https://www.newslaundry.com/",
        "https://www.youtube.com/@jistnews",
        "https://www.youtube.com/@BrutIndia",
        "https://www.thecockroachjantaparty.org.in/voice",
        "https://andhbhakt.org/",
        "https://www.myneta.info/",
        "https://rtionline.gov.in/",
        "https://voters.eci.gov.in/",
      ]);
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/menuContent.test.ts`
Expected: FAIL — actual hrefs are only the 3 existing entries (Newslaundry, Voice of the Swarm, Andhbhakt), missing the 5 new ones and in the wrong count/order relative to what's expected.

- [ ] **Step 3: Implement — add the 5 new source entries**

In `src/hud/menuContent.ts`, replace the source-kind tail of `GALLERY_ENTRIES` (the 3 entries added in Task 2, from `{ kind: "source", href: "https://www.newslaundry.com/"...` through the closing `];` of the array) with:

```ts
  {
    kind: "source",
    href: "https://www.newslaundry.com/",
    label: "Newslaundry",
    icon: "N",
  },
  {
    kind: "source",
    href: "https://www.youtube.com/@jistnews",
    label: "Jist",
    icon: "J",
  },
  {
    kind: "source",
    href: "https://www.youtube.com/@BrutIndia",
    label: "Brut India",
    icon: "B",
  },
  {
    kind: "source",
    href: "https://www.thecockroachjantaparty.org.in/voice",
    label: "Voice of the Swarm (CJP)",
    icon: "🪳",
  },
  {
    kind: "source",
    href: "https://andhbhakt.org/",
    label: "Andhbhakt — PIB vs CAG tracker",
    icon: "🐊",
  },
  {
    kind: "source",
    href: "https://www.myneta.info/",
    label: "MyNeta — candidate records",
    icon: "🗳️",
  },
  {
    kind: "source",
    href: "https://rtionline.gov.in/",
    label: "RTI Online — file a request",
    icon: "📝",
  },
  {
    kind: "source",
    href: "https://voters.eci.gov.in/",
    label: "ECI Voter Services",
    icon: "🪪",
  },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/menuContent.test.ts tests/unit/menuPanel.test.ts`
Expected: PASS — including `menuPanel.test.ts`'s existing `"other resources screen"` test, which derives its expectations generically from `GALLERY_ENTRIES` and needs no changes to cover the 5 new entries.

- [ ] **Step 5: Commit**

```bash
git add src/hud/menuContent.ts tests/unit/menuContent.test.ts
git commit -m "feat: add Jist, Brut India, MyNeta, RTI Online, and ECI Voter Services to Other Resources"
```

---

### Task 4: Full verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: PASS — every test in `tests/unit/`, no failures.

- [ ] **Step 2: Typecheck and build**

Run: `npm run build`
Expected: Succeeds with no TypeScript errors (this catches any leftover reference to the deleted `HERO_VIDEO` export or a stale `isHero`-style parameter) and produces a production build.

- [ ] **Step 3: Manual browser verification (required — this task touches `src/hud/`)**

Run: `npm run dev`, open the printed local URL, then:

1. Click the menu button (top-right) to open the menu panel.
1. Click **"Support Independent Media"** — confirm 17 video tiles render, each with a thumbnail, YouTube play badge, title, and channel name; confirm none of them show `REPLACE_ME` anywhere.
1. Go back to the menu and reopen **"Support Independent Media"** two or three more times — confirm the tile order changes between visits (the shuffle is live, not a fixed order).
1. Click a video tile and confirm it opens the correct YouTube video in a new tab.
1. Go back, click **"Other Resources"** — confirm 8 tiles render: Newslaundry, Jist, Brut India, Voice of the Swarm (CJP), Andhbhakt, MyNeta, RTI Online, ECI Voter Services, each linking out correctly in a new tab.
1. Confirm no console errors in the browser devtools while navigating these two screens.

- [ ] **Step 4: Report results**

Summarize pass/fail for steps 1-3 above. If step 3.3 shows the same order on every reopen, or any tile is broken/missing, treat this task as incomplete and return to Task 2/3 to fix before considering the plan done.
