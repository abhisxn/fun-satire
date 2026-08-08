# Protest Impact Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the currently-unwired "Protest" HUD button to open a static content panel — an honest note, a link to join the real Cockroach Janta Party movement, a curated list of independent journalists/resources, and multi-platform share buttons.

**Architecture:** A new `ProtestPanel` DOM component (mirroring the existing `GalleryPanel`/`FilterPanel` overlay-panel pattern: `attachTo()`, `open()`/`close()`/`toggle()`, click-outside and Escape to close), populated with static content and a small set of pure share-URL-builder functions. No backend, no state beyond open/closed. `Hud.ts` gains a `getAttackButton()` getter (mirroring its existing `getSettingsButton()`/`getGalleryButton()`) so `main.ts` can attach the panel and mutual-exclude it with the other panels, exactly as gallery/filter already do.

**Tech Stack:** TypeScript, Vite, vitest + happy-dom, native Web APIs only (`navigator.share`, `navigator.clipboard`) — no new dependencies.

---

## Spec reference

Implements `docs/superpowers/specs/2026-08-08-protest-impact-panel-design.md`. Content decisions resolved during planning:

- Honest note: "I made this as a toy. There's a real movement behind it."
- Join the Swarm: `https://www.thecockroachjantaparty.org.in/join`
- Learn more links: CJP's Voice page, andhbhakt.org, and five independent journalists/channels (full list in Task 3).
- Share message: "I just stood with the crowd. Come see for yourself."
- No email signup, no "follow us" link (deferred — user will supply a URL later), no custom counter, no Protest Mode (all per spec's non-goals).

---

### Task 1: Share-link builder functions

**Files:**
- Create: `src/hud/shareLinks.ts`
- Test: `tests/unit/shareLinks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl } from "../../src/hud/shareLinks";

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/shareLinks.test.ts`
Expected: FAIL with "Failed to resolve import" or "does not provide an export named 'buildWhatsAppShareUrl'" (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildWhatsAppShareUrl(message: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildRedditShareUrl(url: string, title: string): string {
  return `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/shareLinks.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hud/shareLinks.ts tests/unit/shareLinks.test.ts
git commit -m "feat: add share-link builder functions for protest panel"
```

---

### Task 2: Expose the attack button from Hud

**Files:**
- Modify: `src/hud/Hud.ts:72-113` (class fields + constructor), `src/hud/Hud.ts:152-160` (getters)
- Test: `tests/unit/hud.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe("DOM structure", ...)` block in `tests/unit/hud.test.ts` (after the existing "creates utility buttons" test, matching its style):

```ts
    it("exposes the attack button via getAttackButton()", () => {
      const attackBtn = hud.getAttackButton();
      expect(attackBtn.classList.contains("hud-attack")).toBe(true);
      expect(attackBtn).toBe(host.querySelector(".hud-attack"));
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/hud.test.ts`
Expected: FAIL with "hud.getAttackButton is not a function"

- [ ] **Step 3: Write minimal implementation**

In `src/hud/Hud.ts`, add a field alongside the existing `settingsBtn`/`galleryBtn` fields (around line 75-76):

```ts
  private settingsBtn: HTMLButtonElement | null = null;
  private galleryBtn: HTMLButtonElement | null = null;
  private attackBtn: HTMLButtonElement | null = null;
```

In the constructor, replace this line (line 110):

```ts
    root.appendChild(this.buildAttackBtn());
```

with:

```ts
    this.attackBtn = this.buildAttackBtn();
    root.appendChild(this.attackBtn);
```

Add a getter alongside the existing `getSettingsButton()`/`getGalleryButton()` (after line 160):

```ts
  getAttackButton(): HTMLElement {
    if (!this.attackBtn) throw new Error("Attack button not initialized");
    return this.attackBtn;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/hud.test.ts`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Commit**

```bash
git add src/hud/Hud.ts tests/unit/hud.test.ts
git commit -m "feat: expose attack button from Hud via getAttackButton()"
```

---

### Task 3: ProtestPanel skeleton — note, join link, learn-more list

**Files:**
- Create: `src/hud/ProtestPanel.ts`
- Create: `src/hud/protestPanel.css`
- Test: `tests/unit/protestPanel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProtestPanel } from "../../src/hud/ProtestPanel";

describe("hud/ProtestPanel", () => {
  let panel: ProtestPanel;
  let protestButton: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    protestButton = document.createElement("button");
    protestButton.className = "hud-attack";
    document.body.appendChild(protestButton);

    panel = new ProtestPanel();
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("DOM structure", () => {
    it("creates overlay and panel with note, join link, and learn-more list", () => {
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
      expect(joinLink?.textContent).toBe("Join the Swarm");

      const learnLinks = root.querySelectorAll<HTMLAnchorElement>(".protest-learn-list a");
      expect(learnLinks.length).toBe(8);
      expect(learnLinks[0].href).toBe("https://www.thecockroachjantaparty.org.in/voice");
      expect(learnLinks[0].textContent).toBe("Voice of the Swarm (CJP)");
      expect(learnLinks[7].href).toBe("https://www.youtube.com/@beinghonest/videos");
      expect(learnLinks[7].textContent).toBe("Being Honest");
    });
  });

  describe("open/close/toggle", () => {
    it("starts closed", () => {
      panel.attachTo(protestButton);
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("opens on open()", () => {
      panel.attachTo(protestButton);
      panel.open();
      expect(panel.getRoot().classList.contains("open")).toBe(true);
    });

    it("closes on close()", () => {
      panel.attachTo(protestButton);
      panel.open();
      panel.close();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("toggle() flips open state", () => {
      panel.attachTo(protestButton);
      panel.toggle();
      expect(panel.getRoot().classList.contains("open")).toBe(true);
      panel.toggle();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes when clicking outside the panel", () => {
      panel.attachTo(protestButton);
      panel.open();
      document.body.click();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes on Escape key", () => {
      panel.attachTo(protestButton);
      panel.open();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/protestPanel.test.ts`
Expected: FAIL with "Failed to resolve import" (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/hud/protestPanel.css`:

```css
:root {
  --protest-glass-bg: rgba(255, 255, 255, 0.7);
  --protest-glass-border: rgba(255, 255, 255, 0.9);
  --protest-text-primary: #000000;
  --protest-ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --protest-ease-spring-panel: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.protest-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s var(--protest-ease-smooth);
}

.protest-panel-overlay.open {
  pointer-events: auto;
  opacity: 1;
}

.protest-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 50px;
  width: 340px;
  max-width: calc(100vw - 32px);
  padding: 24px 20px;
  background: var(--protest-glass-bg);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid var(--protest-glass-border);
  border-radius: 20px;
  box-shadow: -8px 0 40px rgba(97, 86, 80, 0.2);
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--protest-text-primary);
  transform: translateX(calc(100% + 16px));
  transition: transform 0.6s var(--protest-ease-spring-panel);
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}

.protest-panel-overlay.open .protest-panel {
  transform: translateX(0);
}

.protest-panel::-webkit-scrollbar { width: 4px; }
.protest-panel::-webkit-scrollbar-track { background: transparent; }
.protest-panel::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 2px; }

.protest-note p {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
}

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

Create `src/hud/ProtestPanel.ts`:

```ts
import "./protestPanel.css";

interface LearnMoreLink {
  readonly href: string;
  readonly label: string;
}

const HONEST_NOTE = "I made this as a toy. There's a real movement behind it.";
const JOIN_URL = "https://www.thecockroachjantaparty.org.in/join";

const LEARN_MORE_LINKS: readonly LearnMoreLink[] = [
  { href: "https://www.thecockroachjantaparty.org.in/voice", label: "Voice of the Swarm (CJP)" },
  { href: "https://andhbhakt.org/", label: "Andhbhakt — PIB vs CAG tracker" },
  { href: "https://www.youtube.com/@SarthakGoswamii", label: "Sarthak Goswami" },
  { href: "https://www.youtube.com/@UNFILTEREDbySamdish", label: "Unfiltered by Samdish" },
  { href: "https://www.newslaundry.com/", label: "Newslaundry" },
  { href: "https://www.youtube.com/@ravishkumar.official", label: "Ravish Kumar" },
  { href: "https://www.youtube.com/c/thedeshbhakt", label: "The Deshbhakt" },
  { href: "https://www.youtube.com/@beinghonest/videos", label: "Being Honest" },
];

export class ProtestPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private protestButton: HTMLElement | null = null;
  private isOpen = false;

  private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "protest-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "protest-panel";
    this.overlay.appendChild(this.panel);

    this.panel.appendChild(this.buildNoteSection());
    this.panel.appendChild(this.buildJoinSection());
    this.panel.appendChild(this.buildLearnMoreSection());
  }

  attachTo(protestButton: HTMLElement): void {
    this.protestButton = protestButton;
    document.body.appendChild(this.overlay);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add("open");
    this.addEventListeners();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("open");
    this.removeEventListeners();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getRoot(): HTMLElement {
    return this.overlay;
  }

  destroy(): void {
    this.close();
    this.overlay.remove();
  }

  private buildNoteSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-note";
    const p = document.createElement("p");
    p.textContent = HONEST_NOTE;
    section.appendChild(p);
    return section;
  }

  private buildJoinSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-join";
    const link = document.createElement("a");
    link.className = "protest-join-link";
    link.href = JOIN_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Join the Swarm";
    section.appendChild(link);
    return section;
  }

  private buildLearnMoreSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-learn";

    const heading = document.createElement("h3");
    heading.textContent = "Learn more";
    section.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "protest-learn-list";
    for (const def of LEARN_MORE_LINKS) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = def.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = def.label;
      item.appendChild(link);
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  private addEventListeners(): void {
    this.boundOnDocumentClick = (e: MouseEvent) => {
      if (
        !this.panel.contains(e.target as Node) &&
        !this.protestButton?.contains(e.target as Node)
      ) {
        this.close();
      }
    };

    this.boundOnKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.close();
      }
    };

    document.addEventListener("click", this.boundOnDocumentClick, true);
    document.addEventListener("keydown", this.boundOnKeyDown);
  }

  private removeEventListeners(): void {
    if (this.boundOnDocumentClick) {
      document.removeEventListener("click", this.boundOnDocumentClick, true);
      this.boundOnDocumentClick = null;
    }
    if (this.boundOnKeyDown) {
      document.removeEventListener("keydown", this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/protestPanel.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/hud/ProtestPanel.ts src/hud/protestPanel.css tests/unit/protestPanel.test.ts
git commit -m "feat: add ProtestPanel with honest note, join link, and learn-more list"
```

---

### Task 4: ProtestPanel share buttons

**Files:**
- Modify: `src/hud/ProtestPanel.ts`
- Test: `tests/unit/protestPanel.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/protestPanel.test.ts`, inside the top-level `describe("hud/ProtestPanel", ...)` block, after the existing `describe("open/close/toggle", ...)` block:

```ts
  describe("share buttons", () => {
    it("renders WhatsApp, Facebook, Reddit, and native share buttons with correct hrefs", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();

      const whatsapp = root.querySelector<HTMLAnchorElement>(".protest-share-btn--whatsapp");
      expect(whatsapp?.href).toBe(
        `https://wa.me/?text=${encodeURIComponent("I just stood with the crowd. Come see for yourself. " + window.location.href)}`,
      );
      expect(whatsapp?.target).toBe("_blank");

      const facebook = root.querySelector<HTMLAnchorElement>(".protest-share-btn--facebook");
      expect(facebook?.href).toBe(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      );

      const reddit = root.querySelector<HTMLAnchorElement>(".protest-share-btn--reddit");
      expect(reddit?.href).toBe(
        `https://www.reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent("I just stood with the crowd. Come see for yourself.")}`,
      );

      const native = root.querySelector<HTMLButtonElement>(".protest-share-btn--native");
      expect(native?.textContent).toBe("Share");
    });

    it("calls navigator.share with title, text, and url when available", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      panel.attachTo(protestButton);
      const nativeBtn = panel.getRoot().querySelector<HTMLButtonElement>(".protest-share-btn--native");
      nativeBtn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(shareMock).toHaveBeenCalledWith({
        title: "I just stood with the crowd. Come see for yourself.",
        text: "I just stood with the crowd. Come see for yourself.",
        url: window.location.href,
      });

      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });

    it("falls back to clipboard copy and shows feedback when navigator.share is unavailable", async () => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, configurable: true });

      panel.attachTo(protestButton);
      const nativeBtn = panel.getRoot().querySelector<HTMLButtonElement>(".protest-share-btn--native");
      nativeBtn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
      expect(nativeBtn?.textContent).toBe("Link copied!");
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/protestPanel.test.ts`
Expected: FAIL — `.protest-share-btn--whatsapp` etc. not found (share section doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

In `src/hud/ProtestPanel.ts`, add the import at the top:

```ts
import { buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl } from "./shareLinks";
```

Add the share message constant next to `HONEST_NOTE`/`JOIN_URL`:

```ts
const SHARE_MESSAGE = "I just stood with the crowd. Come see for yourself.";
```

Add a field for the native share button, next to the existing `protestButton`/`isOpen` fields:

```ts
  private nativeShareBtn: HTMLButtonElement | null = null;
  private copiedFeedbackTimeout: number | null = null;
```

In the constructor, append the share section after `buildLearnMoreSection()`:

```ts
    this.panel.appendChild(this.buildLearnMoreSection());
    this.panel.appendChild(this.buildShareSection());
```

Update `destroy()` to clear the feedback timeout:

```ts
  destroy(): void {
    this.close();
    if (this.copiedFeedbackTimeout !== null) {
      window.clearTimeout(this.copiedFeedbackTimeout);
    }
    this.overlay.remove();
  }
```

Add the new private methods (after `buildLearnMoreSection()`):

```ts
  private buildShareSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-share";

    const heading = document.createElement("h3");
    heading.textContent = "Share";
    section.appendChild(heading);

    const buttonRow = document.createElement("div");
    buttonRow.className = "protest-share-buttons";

    const url = window.location.href;

    const whatsappBtn = document.createElement("a");
    whatsappBtn.className = "protest-share-btn protest-share-btn--whatsapp";
    whatsappBtn.textContent = "WhatsApp";
    whatsappBtn.target = "_blank";
    whatsappBtn.rel = "noopener noreferrer";
    whatsappBtn.href = buildWhatsAppShareUrl(SHARE_MESSAGE, url);

    const facebookBtn = document.createElement("a");
    facebookBtn.className = "protest-share-btn protest-share-btn--facebook";
    facebookBtn.textContent = "Facebook";
    facebookBtn.target = "_blank";
    facebookBtn.rel = "noopener noreferrer";
    facebookBtn.href = buildFacebookShareUrl(url);

    const redditBtn = document.createElement("a");
    redditBtn.className = "protest-share-btn protest-share-btn--reddit";
    redditBtn.textContent = "Reddit";
    redditBtn.target = "_blank";
    redditBtn.rel = "noopener noreferrer";
    redditBtn.href = buildRedditShareUrl(url, SHARE_MESSAGE);

    const nativeBtn = document.createElement("button");
    nativeBtn.type = "button";
    nativeBtn.className = "protest-share-btn protest-share-btn--native";
    nativeBtn.textContent = "Share";
    nativeBtn.addEventListener("click", () => {
      void this.handleNativeShare();
    });
    this.nativeShareBtn = nativeBtn;

    buttonRow.append(whatsappBtn, facebookBtn, redditBtn, nativeBtn);
    section.appendChild(buttonRow);
    return section;
  }

  private async handleNativeShare(): Promise<void> {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: SHARE_MESSAGE, text: SHARE_MESSAGE, url });
      } catch {
        // user cancelled or share failed — not an error, no feedback needed
      }
      return;
    }
    await this.copyLinkFallback(url);
  }

  private async copyLinkFallback(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.showCopiedFeedback();
    } catch {
      // clipboard unavailable — button remains usable, nothing further to do
    }
  }

  private showCopiedFeedback(): void {
    if (!this.nativeShareBtn) return;
    this.nativeShareBtn.textContent = "Link copied!";
    if (this.copiedFeedbackTimeout !== null) {
      window.clearTimeout(this.copiedFeedbackTimeout);
    }
    this.copiedFeedbackTimeout = window.setTimeout(() => {
      if (this.nativeShareBtn) this.nativeShareBtn.textContent = "Share";
    }, 2000);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/protestPanel.test.ts`
Expected: PASS (all tests, including the three new share-button tests)

- [ ] **Step 5: Commit**

```bash
git add src/hud/ProtestPanel.ts tests/unit/protestPanel.test.ts
git commit -m "feat: add share buttons to ProtestPanel (WhatsApp, Facebook, Reddit, native)"
```

---

### Task 5: Wire ProtestPanel into main.ts

**Files:**
- Modify: `src/main.ts:1-11` (imports), `src/main.ts:109-144` (`mountPostOnboarding`)

- [ ] **Step 1: Add the import**

In `src/main.ts`, add alongside the existing HUD panel imports (near line 9-10):

```ts
import { ProtestPanel } from "./hud/ProtestPanel";
```

- [ ] **Step 2: Instantiate and attach the panel**

In `mountPostOnboarding()`, after the existing `const galleryPanel = new GalleryPanel();` line (`src/main.ts:115`):

```ts
    const galleryPanel = new GalleryPanel();
    const protestPanel = new ProtestPanel();

    filterPanel.attachTo(hud.getSettingsButton());
    galleryPanel.attachTo(hud.getGalleryButton());
    protestPanel.attachTo(hud.getAttackButton());
```

- [ ] **Step 3: Wire mutual-exclusion and the open trigger**

Replace the existing settings/gallery click handlers (`src/main.ts:136-144`) to also close the protest panel, and add the attack-press handler:

```ts
    hud.getSettingsButton().addEventListener("click", () => {
      galleryPanel.close();
      protestPanel.close();
      filterPanel.toggle();
    });

    hud.getGalleryButton().addEventListener("click", () => {
      filterPanel.close();
      protestPanel.close();
      galleryPanel.toggle();
    });

    hud.onAttackPress(() => {
      filterPanel.close();
      galleryPanel.close();
      protestPanel.toggle();
    });
```

- [ ] **Step 4: Verify the project typechecks and builds**

Run: `npm run build`
Expected: Succeeds with no TypeScript errors.

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: All tests pass, including the new `shareLinks.test.ts`, `hud.test.ts`, and `protestPanel.test.ts` suites.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire Protest button to open the Impact Panel"
```

---

### Task 6: Manual browser verification

Per this project's convention (`CLAUDE.md`), any change touching `hud/` must be verified in a running browser before being called done — unit tests don't catch visual/interaction regressions.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Open the panel**

In the browser, click the "Protest" button. Verify:
- The panel slides in from the right with the glass/paper-cut visual style consistent with the gallery/filter panels.
- The note text reads "I made this as a toy. There's a real movement behind it."
- "Join the Swarm" is a prominent link; clicking it opens `https://www.thecockroachjantaparty.org.in/join` in a new tab.
- All 8 "Learn more" links are present, in order, and each opens the correct URL in a new tab.

- [ ] **Step 3: Verify share buttons**

- Click WhatsApp/Facebook/Reddit buttons — each should open the correct share dialog in a new tab with the pre-filled message/link.
- Click the "Share" (native) button:
  - On a mobile device or a browser that supports `navigator.share`, the OS share sheet should appear.
  - On a desktop browser without `navigator.share` support, the button text should briefly change to "Link copied!" and the current page URL should be on the clipboard (paste to confirm).

- [ ] **Step 4: Verify mutual exclusion and closing**

- With the Protest panel open, click the Settings or Gallery button — the Protest panel should close and the other panel should open.
- With the Protest panel open, click outside it — it should close.
- With the Protest panel open, press Escape — it should close.
- Click the Protest button again while its panel is open — it should close (toggle behavior).

- [ ] **Step 5: Confirm no regressions**

Switch creature modes and open Settings/Gallery panels as usual to confirm nothing else broke.

No commit for this task — it's verification only. If any issue is found, fix it in the relevant task's files and re-run that task's tests before moving on.
