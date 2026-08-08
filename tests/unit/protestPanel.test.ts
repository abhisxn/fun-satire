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
});
