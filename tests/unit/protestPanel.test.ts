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
