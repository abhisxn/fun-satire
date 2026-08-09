# Protest Panel Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `src/hud/ProtestPanel.ts` from a plain text-link list into a richer editorial-feed panel — a hero video + blended video/source thumbnail gallery, full-color brand icons, soft-skeuomorphic buttons, and a single primary Share action with a platform-icon fallback row.

**Architecture:** All changes stay inside `src/hud/` (ADR 004: one DOM HUD component). A new pure-data module (`protestContent.ts`) supplies curated gallery entries and YouTube URL builders. `shareLinks.ts` gains Instagram/mobile-detection helpers (pure). `ProtestPanel.ts` and `protestPanel.css` are rewritten section-by-section; no other files change, no new dependencies, no backend.

**Tech Stack:** TypeScript, vitest + happy-dom, existing `src/hud/shareLinks.ts` pattern for pure URL builders.

---

## Spec reference

Implements [docs/superpowers/specs/2026-08-09-protest-panel-visual-redesign-design.md](../specs/2026-08-09-protest-panel-visual-redesign-design.md).

## File Structure

- **Create** `src/hud/protestContent.ts` — curated gallery data (hero video + grid entries) and pure YouTube URL builders.
- **Create** `tests/unit/protestContent.test.ts` — tests for the URL builders.
- **Modify** `src/hud/shareLinks.ts` — add Instagram helpers + mobile-UA detector. `buildRedditShareUrl` is removed later, in Task 6, once `ProtestPanel.ts` stops calling it (removing it earlier would break the build in between tasks).
- **Modify** `tests/unit/shareLinks.test.ts` — add tests for the new helpers. The Reddit test is removed in Task 6 alongside the function.
- **Modify** `src/hud/protestPanel.css` — add rich-button, gallery/tile, share-fallback-row, and toast styles; remove now-unused `.protest-learn-list`, `.protest-share-buttons`, `.protest-share-btn` rules.
- **Modify** `src/hud/ProtestPanel.ts` — replace `buildLearnMoreSection` with a gallery section, richen the Join CTA, replace `buildShareSection` with primary-share/fallback-row branching + Instagram handler + toast, add timer cleanup in `destroy()`.
- **Modify** `tests/unit/protestPanel.test.ts` — update to match the new DOM structure.

---

### Task 1: Curated gallery content module

**Files:**
- Create: `src/hud/protestContent.ts`
- Test: `tests/unit/protestContent.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/protestContent.test.ts
import { describe, it, expect } from "vitest";
import {
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  HERO_VIDEO,
  GALLERY_ENTRIES,
} from "../../src/hud/protestContent";

describe("hud/protestContent", () => {
  it("builds a YouTube thumbnail URL from a video id", () => {
    expect(buildYouTubeThumbnailUrl("abc123")).toBe(
      "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    );
  });

  it("builds a YouTube watch URL from a video id", () => {
    expect(buildYouTubeWatchUrl("abc123")).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("exposes a hero video entry", () => {
    expect(HERO_VIDEO.kind).toBe("video");
    expect(HERO_VIDEO.videoId.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.title.length).toBeGreaterThan(0);
    expect(HERO_VIDEO.channel.length).toBeGreaterThan(0);
  });

  it("exposes gallery entries mixing video and source kinds", () => {
    expect(GALLERY_ENTRIES.length).toBeGreaterThan(0);
    const kinds = new Set(GALLERY_ENTRIES.map((e) => e.kind));
    expect(kinds.has("video")).toBe(true);
    expect(kinds.has("source")).toBe(true);
    for (const entry of GALLERY_ENTRIES) {
      if (entry.kind === "video") {
        expect(entry.videoId.length).toBeGreaterThan(0);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.channel.length).toBeGreaterThan(0);
      } else {
        expect(entry.href.startsWith("https://")).toBe(true);
        expect(entry.label.length).toBeGreaterThan(0);
        expect(entry.icon.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- protestContent`
Expected: FAIL with "Cannot find module '../../src/hud/protestContent'"

- [ ] **Step 3: Write the implementation**

```typescript
// src/hud/protestContent.ts
export interface VideoEntry {
  readonly kind: "video";
  readonly videoId: string;
  readonly title: string;
  readonly channel: string;
}

export interface SourceEntry {
  readonly kind: "source";
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

export type GalleryEntry = VideoEntry | SourceEntry;

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// CONTENT DEPENDENCY: videoId values below are placeholders (REPLACE_ME_*).
// Swap each for the real YouTube video id before shipping — see Task 7 of
// docs/superpowers/plans/2026-08-09-protest-panel-visual-redesign.md.
export const HERO_VIDEO: VideoEntry = {
  kind: "video",
  videoId: "REPLACE_ME_SARTHAK_GOSWAMI",
  title: "Placeholder — replace with real video title",
  channel: "Sarthak Goswami",
};

export const GALLERY_ENTRIES: readonly GalleryEntry[] = [
  {
    kind: "video",
    videoId: "REPLACE_ME_UNFILTERED_SAMDISH",
    title: "Placeholder — replace with real video title",
    channel: "Unfiltered by Samdish",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_JIST_NEWS_MEDIA",
    title: "Placeholder — replace with real video title",
    channel: "Jist News Media",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_DESHBHAKT",
    title: "Placeholder — replace with real video title",
    channel: "The Deshbhakt",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_BEING_HONEST",
    title: "Placeholder — replace with real video title",
    channel: "Being Honest",
  },
  {
    kind: "video",
    videoId: "REPLACE_ME_RAVISH_KUMAR",
    title: "Placeholder — replace with real video title",
    channel: "Ravish Kumar",
  },
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- protestContent`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hud/protestContent.ts tests/unit/protestContent.test.ts
git commit -m "feat: add curated protest panel gallery content module"
```

---

### Task 2: Instagram share helpers in shareLinks.ts

**Files:**
- Modify: `src/hud/shareLinks.ts`
- Modify: `tests/unit/shareLinks.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/unit/shareLinks.test.ts` with:

```typescript
// tests/unit/shareLinks.test.ts
import { describe, it, expect } from "vitest";
import {
  buildWhatsAppShareUrl,
  buildFacebookShareUrl,
  buildRedditShareUrl,
  buildInstagramDeepLink,
  buildInstagramWebUrl,
  isMobileUserAgent,
} from "../../src/hud/shareLinks";

describe("hud/shareLinks", () => {
  const message = "I just protested with the crowd.";
  const url = "https://example.com/";

  it("builds a WhatsApp share URL with message and url combined", () => {
    expect(buildWhatsAppShareUrl(message, url)).toBe(
      "https://wa.me/?text=I%20just%20protested%20with%20the%20crowd.%20https%3A%2F%2Fexample.com%2F",
    );
  });

  it("builds a Facebook share URL", () => {
    expect(buildFacebookShareUrl(url)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2F",
    );
  });

  it("builds a Reddit share URL with url and title", () => {
    expect(buildRedditShareUrl(url, message)).toBe(
      "https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com%2F&title=I%20just%20protested%20with%20the%20crowd.",
    );
  });

  it("builds the Instagram app deep link", () => {
    expect(buildInstagramDeepLink()).toBe("instagram://story-camera");
  });

  it("builds the Instagram web fallback URL", () => {
    expect(buildInstagramWebUrl()).toBe("https://instagram.com");
  });

  describe("isMobileUserAgent", () => {
    it("returns true for an iPhone user agent", () => {
      expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    });

    it("returns true for an Android user agent", () => {
      expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(true);
    });

    it("returns false for a desktop user agent", () => {
      expect(isMobileUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- shareLinks`
Expected: FAIL with "buildInstagramDeepLink is not exported" (or similar)

- [ ] **Step 3: Update the implementation**

Replace the full contents of `src/hud/shareLinks.ts` with:

```typescript
// src/hud/shareLinks.ts
export function buildWhatsAppShareUrl(message: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildRedditShareUrl(url: string, title: string): string {
  return `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}

export function buildInstagramDeepLink(): string {
  return "instagram://story-camera";
}

export function buildInstagramWebUrl(): string {
  return "https://instagram.com";
}

export function isMobileUserAgent(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}
```

`buildRedditShareUrl` stays for now — `ProtestPanel.ts` still calls it until Task 6 rewrites the share section and removes the Reddit button along with this function.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- shareLinks`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hud/shareLinks.ts tests/unit/shareLinks.test.ts
git commit -m "feat: add Instagram share helpers to shareLinks"
```

---

### Task 3: Rich-button, gallery, and share CSS

**Files:**
- Modify: `src/hud/protestPanel.css`

- [ ] **Step 1: Replace the CTA and share-button rules, add gallery/toast rules**

In `src/hud/protestPanel.css`, delete these existing rules (they're being replaced):

```css
.protest-join-link {
  display: block;
  text-align: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: #000;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

.protest-learn h3,
.protest-share h3 {
  margin: 0 0 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

.protest-learn-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.protest-learn-list a {
  color: var(--protest-text-primary);
  text-decoration: underline;
  font-size: 14px;
}

.protest-share-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.protest-share-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--protest-glass-border);
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: var(--protest-text-primary);
  cursor: pointer;
}
```

Append this in their place at the end of the file:

```css
/* Rich buttons (Join CTA, primary Share) — soft-skeuomorphic, matches
   tokens.ui.attack in src/config/visualTokens.json and .hud-attack in hud.css */
.protest-rich-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px 16px;
  border-radius: 14px;
  border: 1px solid #c95f32;
  background: linear-gradient(180deg, #f4a15d 0%, #df713e 100%);
  box-shadow: 0 3px 0 #ad4c29, 0 8px 18px rgba(223, 113, 62, 0.35);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s var(--protest-ease-smooth), box-shadow 0.15s var(--protest-ease-smooth);
}

.protest-rich-btn:hover {
  transform: translateY(-1px);
}

.protest-rich-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #ad4c29;
}

.protest-rich-btn-icon {
  font-size: 16px;
  line-height: 1;
}

/* Gallery */
.protest-gallery h3,
.protest-share h3 {
  margin: 0 0 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

.protest-tile {
  display: block;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: var(--protest-text-primary);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid var(--protest-glass-border);
}

.protest-tile--hero {
  margin-bottom: 8px;
}

.protest-tile--hero .protest-tile-thumb,
.protest-tile--video .protest-tile-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.protest-tile--hero:hover .protest-tile-thumb,
.protest-tile--video:hover .protest-tile-thumb {
  filter: brightness(1.08);
}

.protest-gallery-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.protest-tile-badge {
  position: absolute;
  top: 6px;
  right: 6px;
}

.protest-tile-caption {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.protest-tile-title {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.protest-tile-channel {
  font-size: 10px;
  opacity: 0.65;
}

.protest-tile--source {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  aspect-ratio: 16 / 9;
  text-align: center;
  padding: 8px;
}

.protest-tile-icon {
  font-size: 20px;
  line-height: 1;
}

.protest-tile-label {
  font-size: 11px;
  font-weight: 600;
}

/* Share */
.protest-share-fallback-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.protest-share-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
  cursor: pointer;
  border: none;
  background: transparent;
  padding: 0;
}

.protest-toast {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%) translateY(8px);
  background: #2a2420;
  color: #ede7dd;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s var(--protest-ease-smooth), transform 0.2s var(--protest-ease-smooth);
  white-space: nowrap;
}

.protest-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hud/protestPanel.css
git commit -m "feat: add rich-button, gallery, and share CSS for protest panel redesign"
```

(No automated test for this task — pure CSS. Verified visually in Task 7.)

---

### Task 4: Gallery section (hero + blended grid) in ProtestPanel.ts

**Files:**
- Modify: `src/hud/ProtestPanel.ts`
- Modify: `tests/unit/protestPanel.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/protestPanel.test.ts`, replace the import line and the `"DOM structure"` describe block:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProtestPanel } from "../../src/hud/ProtestPanel";
import { HERO_VIDEO, GALLERY_ENTRIES } from "../../src/hud/protestContent";
```

```typescript
  describe("DOM structure", () => {
    it("creates overlay and panel with note and join link", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();

      expect(root.classList.contains("protest-panel-overlay")).toBe(true);
      expect(root.querySelector(".protest-panel")).not.toBeNull();

      const note = root.querySelector(".protest-note p");
      expect(note?.textContent).toBe("I made this as a toy. There's a real movement behind it.");

      const joinLink = root.querySelector<HTMLAnchorElement>(".protest-join-link");
      expect(joinLink?.href).toBe("https://www.thecockroachjantaparty.org.in/join");
      expect(joinLink?.target).toBe("_blank");
      expect(joinLink?.rel).toBe("noopener noreferrer");
    });
  });

  describe("gallery", () => {
    it("renders a hero video tile linking to the YouTube watch URL", () => {
      panel.attachTo(protestButton);
      const hero = panel.getRoot().querySelector<HTMLAnchorElement>(".protest-tile--hero");

      expect(hero).not.toBeNull();
      expect(hero?.href).toBe(`https://www.youtube.com/watch?v=${HERO_VIDEO.videoId}`);
      expect(hero?.target).toBe("_blank");
      expect(hero?.querySelector(".protest-tile-thumb")).not.toBeNull();
    });

    it("renders a grid blending video and source tiles for every gallery entry", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();

      const tiles = root.querySelectorAll(".protest-gallery-grid .protest-tile");
      expect(tiles.length).toBe(GALLERY_ENTRIES.length);

      const videoCount = GALLERY_ENTRIES.filter((e) => e.kind === "video").length;
      const sourceCount = GALLERY_ENTRIES.filter((e) => e.kind === "source").length;
      expect(root.querySelectorAll(".protest-gallery-grid .protest-tile--video").length).toBe(videoCount);
      expect(root.querySelectorAll(".protest-gallery-grid .protest-tile--source").length).toBe(sourceCount);

      const firstSource = GALLERY_ENTRIES.find((e) => e.kind === "source");
      const sourceTile = root.querySelector<HTMLAnchorElement>(".protest-gallery-grid .protest-tile--source");
      expect(sourceTile?.href).toBe(firstSource && firstSource.kind === "source" ? firstSource.href : "");
    });

    it("falls back to a source-style card when a video thumbnail fails to load", () => {
      panel.attachTo(protestButton);
      const heroThumb = panel.getRoot().querySelector<HTMLImageElement>(".protest-tile--hero .protest-tile-thumb");

      heroThumb?.dispatchEvent(new Event("error"));

      const heroTile = panel.getRoot().querySelector(".protest-tile--hero");
      expect(heroTile?.classList.contains("protest-tile--source")).toBe(true);
      expect(heroTile?.querySelector(".protest-tile-thumb")).toBeNull();
      expect(heroTile?.querySelector(".protest-tile-label")?.textContent).toBe(HERO_VIDEO.title);
    });
  });
```

Delete the old `"share buttons"` describe block for now — it's rewritten in Task 6.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- protestPanel`
Expected: FAIL — `.protest-tile--hero` etc. not found (old markup still in place)

- [ ] **Step 3: Implement the gallery section**

In `src/hud/ProtestPanel.ts`, keep the existing `shareLinks` import line untouched for now (`buildShareSection` still uses `buildRedditShareUrl` until Task 6 rewrites it) — just add the new `protestContent` import and the YouTube badge SVG below it:

```typescript
import "./protestPanel.css";
import { buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl } from "./shareLinks";
import {
  HERO_VIDEO,
  GALLERY_ENTRIES,
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  type GalleryEntry,
  type VideoEntry,
  type SourceEntry,
} from "./protestContent";

const SVG_YOUTUBE_PLAY = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="5" fill="#FF0000"/><path d="M8 6.5L14 10L8 13.5V6.5Z" fill="#fff"/></svg>`;
```

Remove the now-unused `interface LearnMoreLink` block and the `LEARN_MORE_LINKS` constant entirely (their content moved to `protestContent.ts` in Task 1).

Replace the `buildLearnMoreSection` method with:

```typescript
  private buildGallerySection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-gallery";

    const heading = document.createElement("h3");
    heading.textContent = "Learn more";
    section.appendChild(heading);

    section.appendChild(this.buildVideoTile(HERO_VIDEO, true));

    const grid = document.createElement("div");
    grid.className = "protest-gallery-grid";
    for (const entry of GALLERY_ENTRIES) {
      grid.appendChild(this.buildGalleryTile(entry));
    }
    section.appendChild(grid);

    return section;
  }

  private buildGalleryTile(entry: GalleryEntry): HTMLElement {
    return entry.kind === "video" ? this.buildVideoTile(entry, false) : this.buildSourceTile(entry);
  }

  private buildVideoTile(entry: VideoEntry, isHero: boolean): HTMLElement {
    const link = document.createElement("a");
    link.className = isHero ? "protest-tile protest-tile--hero" : "protest-tile protest-tile--video";
    link.href = buildYouTubeWatchUrl(entry.videoId);
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "protest-tile-thumb";
    img.src = buildYouTubeThumbnailUrl(entry.videoId);
    img.alt = entry.title;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      this.replaceWithFallbackCard(link, entry.title);
    });
    link.appendChild(img);

    const badge = document.createElement("span");
    badge.className = "protest-tile-badge";
    badge.innerHTML = SVG_YOUTUBE_PLAY;
    link.appendChild(badge);

    const caption = document.createElement("div");
    caption.className = "protest-tile-caption";
    const titleEl = document.createElement("span");
    titleEl.className = "protest-tile-title";
    titleEl.textContent = entry.title;
    const channelEl = document.createElement("span");
    channelEl.className = "protest-tile-channel";
    channelEl.textContent = entry.channel;
    caption.append(titleEl, channelEl);
    link.appendChild(caption);

    return link;
  }

  private buildSourceTile(entry: SourceEntry): HTMLElement {
    const link = document.createElement("a");
    link.className = "protest-tile protest-tile--source";
    link.href = entry.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "protest-tile-icon";
    icon.textContent = entry.icon;
    link.appendChild(icon);

    const label = document.createElement("span");
    label.className = "protest-tile-label";
    label.textContent = entry.label;
    link.appendChild(label);

    return link;
  }

  private replaceWithFallbackCard(link: HTMLAnchorElement, title: string): void {
    link.classList.remove("protest-tile--video", "protest-tile--hero");
    link.classList.add("protest-tile--source");
    link.innerHTML = "";

    const icon = document.createElement("span");
    icon.className = "protest-tile-icon";
    icon.textContent = "▶";
    link.appendChild(icon);

    const label = document.createElement("span");
    label.className = "protest-tile-label";
    label.textContent = title;
    link.appendChild(label);
  }
```

Update the constructor's section-building calls:

```typescript
    this.panel.appendChild(this.buildNoteSection());
    this.panel.appendChild(this.buildJoinSection());
    this.panel.appendChild(this.buildLearnMoreSection());
    this.panel.appendChild(this.buildShareSection());
```

to:

```typescript
    this.panel.appendChild(this.buildNoteSection());
    this.panel.appendChild(this.buildJoinSection());
    this.panel.appendChild(this.buildGallerySection());
    this.panel.appendChild(this.buildShareSection());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- protestPanel`
Expected: PASS for "DOM structure" and "gallery" describe blocks (share-button and join-link tests still pending Tasks 5-6 rewrite — leave those failing for now since their sections haven't changed yet in this task; if `buildShareSection` no longer compiles because it still imports `buildRedditShareUrl`, fix that reference now by removing the now-dead Reddit button code from `buildShareSection` — see Task 6 for the full rewrite. For this step, it's acceptable for the "share buttons" tests to be temporarily absent since that describe block was deleted in Step 1.)

- [ ] **Step 5: Commit**

```bash
git add src/hud/ProtestPanel.ts tests/unit/protestPanel.test.ts
git commit -m "feat: replace protest panel learn-more list with hero+grid gallery"
```

---

### Task 5: Rich Join CTA

**Files:**
- Modify: `src/hud/ProtestPanel.ts`
- Modify: `tests/unit/protestPanel.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/unit/protestPanel.test.ts`, extend the `"DOM structure"` test (from Task 4) by adding after the existing `joinLink` assertions:

```typescript
      expect(joinLink?.classList.contains("protest-rich-btn")).toBe(true);
      expect(joinLink?.querySelector(".protest-rich-btn-icon")?.textContent).toBe("🪳");
      expect(joinLink?.querySelector(".protest-rich-btn-label")?.textContent).toBe("Join the Swarm");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- protestPanel`
Expected: FAIL — `.protest-rich-btn-icon` not found

- [ ] **Step 3: Implement**

In `src/hud/ProtestPanel.ts`, replace `buildJoinSection`:

```typescript
  private buildJoinSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-join";
    const link = document.createElement("a");
    link.className = "protest-rich-btn protest-join-link";
    link.href = JOIN_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "protest-rich-btn-icon";
    icon.textContent = "🪳";
    const label = document.createElement("span");
    label.className = "protest-rich-btn-label";
    label.textContent = "Join the Swarm";
    link.append(icon, label);

    section.appendChild(link);
    return section;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- protestPanel`
Expected: PASS for "DOM structure"

- [ ] **Step 5: Commit**

```bash
git add src/hud/ProtestPanel.ts tests/unit/protestPanel.test.ts
git commit -m "feat: give protest panel Join CTA rich skeuomorphic styling"
```

---

### Task 6: Share section — primary button, fallback row, Instagram handler

**Files:**
- Modify: `src/hud/ProtestPanel.ts`
- Modify: `tests/unit/protestPanel.test.ts`

- [ ] **Step 1: Write the failing tests**

In `tests/unit/protestPanel.test.ts`, add this describe block (after "gallery"):

```typescript
  describe("share", () => {
    afterEach(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });

    it("renders a single primary Share button when navigator.share is available", () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      const localPanel = new ProtestPanel();
      localPanel.attachTo(protestButton);
      const root = localPanel.getRoot();

      expect(root.querySelector(".protest-share-primary")).not.toBeNull();
      expect(root.querySelector(".protest-share-fallback-row")).toBeNull();

      localPanel.destroy();
    });

    it("calls navigator.share with title, text, and url when the primary button is clicked", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      const localPanel = new ProtestPanel();
      localPanel.attachTo(protestButton);
      const btn = localPanel.getRoot().querySelector<HTMLButtonElement>(".protest-share-primary");
      btn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(shareMock).toHaveBeenCalledWith({
        title: "I just stood with the crowd. Come see for yourself.",
        text: "I just stood with the crowd. Come see for yourself.",
        url: window.location.href,
      });

      localPanel.destroy();
    });

    it("renders WhatsApp and Facebook fallback links when navigator.share is unavailable", () => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });

      const localPanel = new ProtestPanel();
      localPanel.attachTo(protestButton);
      const root = localPanel.getRoot();

      expect(root.querySelector(".protest-share-primary")).toBeNull();

      const whatsapp = root.querySelector<HTMLAnchorElement>(".protest-share-icon-btn--whatsapp");
      expect(whatsapp?.href).toBe(
        `https://wa.me/?text=${encodeURIComponent("I just stood with the crowd. Come see for yourself. " + window.location.href)}`,
      );
      expect(whatsapp?.target).toBe("_blank");

      const facebook = root.querySelector<HTMLAnchorElement>(".protest-share-icon-btn--facebook");
      expect(facebook?.href).toBe(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      );

      expect(root.querySelector(".protest-share-icon-btn--instagram")).not.toBeNull();

      localPanel.destroy();
    });

    it("copies the link and shows a toast when the Instagram fallback button is clicked (desktop)", async () => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, configurable: true });
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        configurable: true,
      });
      const openMock = vi.spyOn(window, "open").mockReturnValue(null);

      const localPanel = new ProtestPanel();
      localPanel.attachTo(protestButton);
      const instagramBtn = localPanel.getRoot().querySelector<HTMLButtonElement>(".protest-share-icon-btn--instagram");
      instagramBtn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
      expect(openMock).toHaveBeenCalledWith("https://instagram.com", "_blank", "noopener,noreferrer");
      expect(localPanel.getRoot().querySelector(".protest-toast.visible")).not.toBeNull();

      localPanel.destroy();
      openMock.mockRestore();
    });

    it("attempts the Instagram app deep link then falls back to web after a timeout (mobile)", async () => {
      vi.useFakeTimers();
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, configurable: true });
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        configurable: true,
      });
      const openMock = vi.spyOn(window, "open").mockReturnValue(null);

      const localPanel = new ProtestPanel();
      localPanel.attachTo(protestButton);
      const instagramBtn = localPanel.getRoot().querySelector<HTMLButtonElement>(".protest-share-icon-btn--instagram");
      instagramBtn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(openMock).toHaveBeenCalledWith("instagram://story-camera", "_self");

      vi.advanceTimersByTime(1300);

      expect(openMock).toHaveBeenCalledWith("https://instagram.com", "_blank", "noopener,noreferrer");

      localPanel.destroy();
      openMock.mockRestore();
      vi.useRealTimers();
    });

    it("clears the pending Instagram fallback timer on destroy", () => {
      vi.useFakeTimers();
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        configurable: true,
      });
      const openMock = vi.spyOn(window, "open").mockReturnValue(null);
      const clearSpy = vi.spyOn(window, "clearTimeout");

      const localPanel = new ProtestPanel();
      localPanel.attachTo(protestButton);
      const instagramBtn = localPanel.getRoot().querySelector<HTMLButtonElement>(".protest-share-icon-btn--instagram");
      instagramBtn?.click();

      localPanel.destroy();

      expect(clearSpy).toHaveBeenCalled();

      openMock.mockRestore();
      clearSpy.mockRestore();
      vi.useRealTimers();
    });
  });
```

Also delete the old `"share buttons"` describe block if any remnant of it is still present from before Task 4 (it should already be gone).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- protestPanel`
Expected: FAIL — `.protest-share-primary`, `.protest-share-icon-btn--instagram`, etc. not found; `buildShareSection` still builds the old WhatsApp/Facebook/Reddit/native markup

- [ ] **Step 3: Implement**

First, remove `buildRedditShareUrl` from `src/hud/shareLinks.ts` (delete the function) and from `tests/unit/shareLinks.test.ts` (delete its import and its `"builds a Reddit share URL..."` test) — this redesign's share section no longer has a Reddit button, and after this task's `ProtestPanel.ts` rewrite below, nothing calls it anymore.

In `src/hud/ProtestPanel.ts`, replace the `shareLinks` import line (still reading `buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl` from Task 4) with:

```typescript
import {
  buildWhatsAppShareUrl,
  buildFacebookShareUrl,
  buildInstagramDeepLink,
  buildInstagramWebUrl,
  isMobileUserAgent,
} from "./shareLinks";
```

Add these SVG icon constants near `SVG_YOUTUBE_PLAY`:

```typescript
const SVG_WHATSAPP = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#25D366"/><path d="M11 5a6.2 6.2 0 00-5.35 9.34L4.8 17.2l3.16-.83A6.2 6.2 0 1011 5zm3.6 8.5c-.16.46-.96.9-1.32.93-.36.03-.69.16-2.32-.48-1.95-.76-3.22-2.73-3.32-2.86-.1-.13-.8-1.04-.8-1.99 0-.94.5-1.4.68-1.6.18-.2.39-.25.52-.25l.38.01c.12.01.28-.04.44.34.16.4.55 1.38.6 1.48.05.1.09.22.02.35-.07.13-.1.22-.2.33-.1.12-.2.26-.3.35-.1.1-.2.2-.09.4.12.2.51.84 1.09 1.36.75.67 1.38.88 1.58.98.19.1.31.08.42-.05.12-.13.49-.57.62-.77.13-.2.26-.17.44-.1.18.07 1.14.54 1.34.64.2.1.33.15.38.23.05.08.05.47-.11.93z" fill="#fff"/></svg>`;
const SVG_FACEBOOK = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#1877F2"/><path d="M13.2 11.3h-1.6v5.4h-2.2v-5.4H8.2V9.4h1.2V8.2c0-1.5.7-2.6 2.5-2.6h1.7v1.9h-1.1c-.5 0-.6.3-.6.7v1.2h1.7l-.2 1.9z" fill="#fff"/></svg>`;
const SVG_INSTAGRAM = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="protest-ig-grad" x1="0" y1="22" x2="22" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset="0.4" stop-color="#D62976"/><stop offset="0.7" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><circle cx="11" cy="11" r="11" fill="url(#protest-ig-grad)"/><rect x="6" y="6" width="10" height="10" rx="3" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="11" cy="11" r="2.6" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="14.2" cy="7.8" r="0.7" fill="#fff"/></svg>`;
const SVG_SHARE = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13.5" cy="4.5" r="2.3" stroke="#fff" stroke-width="1.4"/><circle cx="4.5" cy="9" r="2.3" stroke="#fff" stroke-width="1.4"/><circle cx="13.5" cy="13.5" r="2.3" stroke="#fff" stroke-width="1.4"/><path d="M6.5 7.8L11.5 5.3M6.5 10.2L11.5 12.7" stroke="#fff" stroke-width="1.4"/></svg>`;
```

Add private fields near the top of the class (alongside `nativeShareBtn`/`copiedFeedbackTimeout`):

```typescript
  private readonly nativeShare: ((data: ShareData) => Promise<void>) | undefined = (
    navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  ).share?.bind(navigator);
  private toastEl: HTMLElement | null = null;
  private toastTimeout: number | null = null;
  private instagramFallbackTimeout: number | null = null;
```

Remove the old `nativeShareBtn` field and `copiedFeedbackTimeout` field (their job is replaced by the toast + the `navigator.share`-availability branch).

Replace `buildShareSection`, `handleNativeShare`, `copyLinkFallback`, and `showCopiedFeedback` entirely with:

```typescript
  private buildShareSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-share";

    const heading = document.createElement("h3");
    heading.textContent = "Share";
    section.appendChild(heading);

    section.appendChild(this.nativeShare ? this.buildPrimaryShareButton() : this.buildFallbackShareRow());

    this.toastEl = document.createElement("div");
    this.toastEl.className = "protest-toast";
    section.appendChild(this.toastEl);

    return section;
  }

  private buildPrimaryShareButton(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "protest-rich-btn protest-share-primary";

    const icon = document.createElement("span");
    icon.className = "protest-rich-btn-icon";
    icon.innerHTML = SVG_SHARE;
    const label = document.createElement("span");
    label.className = "protest-rich-btn-label";
    label.textContent = "Share";
    btn.append(icon, label);

    btn.addEventListener("click", () => {
      void this.handleNativeShare();
    });
    return btn;
  }

  private buildFallbackShareRow(): HTMLElement {
    const row = document.createElement("div");
    row.className = "protest-share-fallback-row";

    const url = window.location.href;

    const whatsappBtn = document.createElement("a");
    whatsappBtn.className = "protest-share-icon-btn protest-share-icon-btn--whatsapp";
    whatsappBtn.href = buildWhatsAppShareUrl(SHARE_MESSAGE, url);
    whatsappBtn.target = "_blank";
    whatsappBtn.rel = "noopener noreferrer";
    whatsappBtn.setAttribute("aria-label", "Share on WhatsApp");
    whatsappBtn.innerHTML = SVG_WHATSAPP;

    const facebookBtn = document.createElement("a");
    facebookBtn.className = "protest-share-icon-btn protest-share-icon-btn--facebook";
    facebookBtn.href = buildFacebookShareUrl(url);
    facebookBtn.target = "_blank";
    facebookBtn.rel = "noopener noreferrer";
    facebookBtn.setAttribute("aria-label", "Share on Facebook");
    facebookBtn.innerHTML = SVG_FACEBOOK;

    const instagramBtn = document.createElement("button");
    instagramBtn.type = "button";
    instagramBtn.className = "protest-share-icon-btn protest-share-icon-btn--instagram";
    instagramBtn.setAttribute("aria-label", "Share on Instagram");
    instagramBtn.innerHTML = SVG_INSTAGRAM;
    instagramBtn.addEventListener("click", () => {
      void this.handleInstagramShare();
    });

    row.append(whatsappBtn, facebookBtn, instagramBtn);
    return row;
  }

  private async handleNativeShare(): Promise<void> {
    if (!this.nativeShare) return;
    const url = window.location.href;
    try {
      await this.nativeShare({ title: SHARE_MESSAGE, text: SHARE_MESSAGE, url });
    } catch {
      // user cancelled or share failed — not an error, no feedback needed
    }
  }

  private async handleInstagramShare(): Promise<void> {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard unavailable — still attempt to open Instagram
    }
    this.showToast("Link copied — paste it into your story!");

    if (isMobileUserAgent(navigator.userAgent)) {
      window.open(buildInstagramDeepLink(), "_self");
      if (this.instagramFallbackTimeout !== null) {
        window.clearTimeout(this.instagramFallbackTimeout);
      }
      this.instagramFallbackTimeout = window.setTimeout(() => {
        window.open(buildInstagramWebUrl(), "_blank", "noopener,noreferrer");
      }, 1200);
    } else {
      window.open(buildInstagramWebUrl(), "_blank", "noopener,noreferrer");
    }
  }

  private showToast(message: string): void {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add("visible");
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      this.toastEl?.classList.remove("visible");
    }, 2500);
  }
```

Update `destroy()` to clear the new timers instead of the old `copiedFeedbackTimeout`:

```typescript
  destroy(): void {
    this.close();
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    if (this.instagramFallbackTimeout !== null) {
      window.clearTimeout(this.instagramFallbackTimeout);
    }
    this.overlay.remove();
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — full suite green

- [ ] **Step 5: Typecheck**

Run: `npm run build`
Expected: no TypeScript errors (confirms `noUnusedLocals`/`verbatimModuleSyntax` are satisfied — double-check no leftover unused imports like the old `LearnMoreLink` type or `buildRedditShareUrl`)

- [ ] **Step 6: Commit**

```bash
git add src/hud/ProtestPanel.ts tests/unit/protestPanel.test.ts
git commit -m "feat: single primary Share button with WhatsApp/Facebook/Instagram fallback row"
```

---

### Task 7: Manual verification and content follow-up

**Files:** none (verification + a tracked follow-up, no code changes)

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm test`
Expected: PASS, full suite

- [ ] **Step 2: Manual browser verification (required — this touches `hud/` per project convention)**

Run: `npm run dev`, open the app, click the Protest button, and verify:
- Honest note, Join the Swarm CTA (skeuomorphic orange button with 🪳 icon), hero video tile, and 2-column grid all render with the glass panel aesthetic.
- Each gallery tile (video and source) opens the correct URL in a new tab.
- Temporarily edit one `videoId` in `src/hud/protestContent.ts` to an invalid string, confirm that tile's thumbnail fails and swaps to the fallback card, then revert the edit.
- With a mobile viewport (or a real phone) where `navigator.share` is supported: the Share section shows one "Share" button that opens the OS share sheet.
- With a desktop browser lacking `navigator.share` (e.g. Firefox desktop): the Share section shows the WhatsApp/Facebook/Instagram icon row instead; clicking each opens the right destination, and Instagram shows the "Link copied" toast.
- Panel closes via the close affordance, click-outside, and Escape, matching prior behavior.

- [ ] **Step 3: File the content follow-up**

The gallery ships with placeholder `REPLACE_ME_*` video IDs and placeholder titles in `src/hud/protestContent.ts` (flagged in-file with a comment). Before this redesign is considered done for production, the app's author needs to supply, per entry in `HERO_VIDEO` and `GALLERY_ENTRIES`:
- The real YouTube video id (from the video's URL, e.g. `youtube.com/watch?v=<this part>`).
- The real video title.

This is a content task, not an engineering task — no code changes are needed beyond editing the string values in `protestContent.ts`, and the existing tests in `tests/unit/protestContent.test.ts` will keep passing against real values (they assert non-empty strings and URL shape, not the specific placeholder text).

- [ ] **Step 4: Final commit if any manual-verification fixes were needed**

If Step 2 surfaced any visual bugs, fix them, re-run `npm test`, and commit:

```bash
git add -A
git commit -m "fix: address visual issues found in protest panel manual verification"
```

(Skip this step entirely if Step 2 found nothing to fix.)
