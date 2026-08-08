// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProtestPanel } from "../../src/hud/ProtestPanel";
import { HERO_VIDEO, GALLERY_ENTRIES } from "../../src/hud/protestContent";

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
      expect(joinLink?.classList.contains("protest-rich-btn")).toBe(true);
      expect(joinLink?.querySelector(".protest-rich-btn-icon")?.textContent).toBe("🪳");
      expect(joinLink?.querySelector(".protest-rich-btn-label")?.textContent).toBe("Join the Swarm");
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
