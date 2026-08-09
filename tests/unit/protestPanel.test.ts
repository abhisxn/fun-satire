// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProtestPanel } from "../../src/hud/ProtestPanel";
import { HERO_VIDEO, GALLERY_ENTRIES } from "../../src/hud/protestContent";

const QUICK_LINKS: Array<[string, string]> = [
  ["About Project", "About This Project"],
  ["How to Be a Better Citizen", "How to Be a More Informed Citizen"],
  ["Support Independent Media", "Support Independent Media"],
  ["Other Resources", "Other Resources"],
];

function clickQuickLink(root: HTMLElement, label: string): void {
  const btn = Array.from(root.querySelectorAll<HTMLButtonElement>(".protest-quick-link")).find(
    (b) => b.textContent === label,
  );
  expect(btn).not.toBeUndefined();
  btn?.click();
}

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

  describe("main menu screen", () => {
    it("creates overlay and panel with the watchdog note", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();

      expect(root.classList.contains("protest-panel-overlay")).toBe(true);
      expect(root.querySelector(".protest-panel")).not.toBeNull();

      const note = root.querySelector(".protest-note p");
      expect(note?.textContent).toBe(
        "A crowd that watches back. No leader to arrest. No face to blame — just people, staying informed and staying loud.",
      );

      expect(root.querySelector(".protest-join-link")).toBeNull();
      expect(root.querySelector(".protest-footer")?.textContent).toBe("© thatguyabhishek");
    });

    it("renders four quick-link buttons (not anchors) with the exact labels", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();

      const links = root.querySelectorAll<HTMLButtonElement>(".protest-quick-link");
      expect(links.length).toBe(4);

      const labels = Array.from(links).map((el) => el.textContent);
      expect(labels).toEqual([
        "About Project",
        "How to Be a Better Citizen",
        "Support Independent Media",
        "Other Resources",
      ]);

      for (const link of Array.from(links)) {
        expect(link.tagName).toBe("BUTTON");
        expect(link.getAttribute("href")).toBeNull();
      }
    });

    it("renders the share prompt", () => {
      panel.attachTo(protestButton);
      const prompt = panel.getRoot().querySelector(".protest-share-prompt");
      expect(prompt?.textContent).toBe("A crowd only grows if someone passes it on.");
    });

    it("renders the footer on the initial menu screen", () => {
      panel.attachTo(protestButton);
      expect(panel.getRoot().querySelector(".protest-footer")?.textContent).toBe("© thatguyabhishek");
    });
  });

  describe("navigation to sub-screens", () => {
    for (const [linkLabel, heading] of QUICK_LINKS) {
      it(`navigates to the "${heading}" screen from "${linkLabel}" and back to the menu`, () => {
        panel.attachTo(protestButton);
        const root = panel.getRoot();

        clickQuickLink(root, linkLabel);

        const backBtn = root.querySelector<HTMLButtonElement>(".protest-back-btn");
        expect(backBtn?.textContent).toBe("← Menu");

        const headingEl = root.querySelector(".protest-subscreen h3");
        expect(headingEl?.textContent).toBe(heading);

        // Footer persists across all screens.
        expect(root.querySelector(".protest-footer")?.textContent).toBe("© thatguyabhishek");

        // Menu-only content is gone.
        expect(root.querySelector(".protest-menu")).toBeNull();
        expect(root.querySelector(".protest-quick-links")).toBeNull();
        expect(root.querySelector(".protest-share-prompt")).toBeNull();
        expect(root.querySelector(".protest-share")).toBeNull();

        backBtn?.click();

        expect(root.querySelector(".protest-subscreen")).toBeNull();
        expect(root.querySelectorAll(".protest-quick-link").length).toBe(4);
        expect(root.querySelector(".protest-share-prompt")).not.toBeNull();
        expect(root.querySelector(".protest-footer")?.textContent).toBe("© thatguyabhishek");
      });
    }
  });

  describe("about screen", () => {
    it("renders exactly three paragraphs with the expected copy", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");

      const paragraphs = Array.from(root.querySelectorAll(".protest-about p")).map((p) => p.textContent);
      expect(paragraphs).toEqual([
        "This is a satirical toy. You are the crowd — eyes, cockroaches, fingers, placards — surrounding whoever you place on screen. The faces you drag in? Those are the ones in power.",
        "Underneath the mechanics is a real idea: power behaves differently when it knows it's being watched. A leaderless crowd is harder to arrest, harder to silence, and harder to ignore.",
        "Nothing here tracks you, stores what you do, or sends your data anywhere. It's just a browser, a cursor, and a crowd that doesn't look away.",
      ]);
    });
  });

  describe("informed citizen screen", () => {
    it("renders seven tips and no gallery content", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();
      clickQuickLink(root, "How to Be a Better Citizen");

      const items = root.querySelectorAll(".protest-tips li");
      expect(items.length).toBe(7);

      expect(root.querySelector(".protest-gallery-list")).toBeNull();
      expect(root.querySelector(".protest-tile")).toBeNull();
    });
  });

  describe("support independent media screen", () => {
    it("renders the hero video among the video tiles, linking to the YouTube watch URL, with no source tiles", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Support Independent Media");

      const videoTiles = root.querySelectorAll(".protest-gallery-list .protest-tile--video");
      const videoCount = GALLERY_ENTRIES.filter((e) => e.kind === "video").length + 1;
      expect(videoTiles.length).toBe(videoCount);

      const heroTile = Array.from(videoTiles).find(
        (t) => (t as HTMLAnchorElement).href === `https://www.youtube.com/watch?v=${HERO_VIDEO.videoId}`,
      ) as HTMLAnchorElement | undefined;
      expect(heroTile).not.toBeUndefined();
      expect(heroTile?.target).toBe("_blank");
      expect(heroTile?.querySelector(".protest-tile-thumb")).not.toBeNull();

      expect(root.querySelectorAll(".protest-gallery-list .protest-tile--source").length).toBe(0);
    });

    it("falls back to a source-style card when a video thumbnail fails to load", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Support Independent Media");

      const firstThumb = root.querySelector<HTMLImageElement>(
        ".protest-gallery-list .protest-tile--video .protest-tile-thumb",
      );
      const tileLink = firstThumb?.closest("a");
      const title = firstThumb?.alt ?? "";

      firstThumb?.dispatchEvent(new Event("error"));

      expect(tileLink?.classList.contains("protest-tile--video")).toBe(false);
      expect(tileLink?.classList.contains("protest-tile--source")).toBe(true);
      expect(tileLink?.querySelector(".protest-tile-thumb")).toBeNull();
      expect(tileLink?.querySelector(".protest-tile-label")?.textContent).toBe(title);
    });
  });

  describe("other resources screen", () => {
    it("renders a source tile per source entry with correct hrefs, and no video tiles", () => {
      panel.attachTo(protestButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Other Resources");

      const sourceEntries = GALLERY_ENTRIES.filter((e) => e.kind === "source");
      const sourceTiles = root.querySelectorAll<HTMLAnchorElement>(".protest-gallery-list .protest-tile--source");
      expect(sourceTiles.length).toBe(sourceEntries.length);

      const hrefs = Array.from(sourceTiles).map((t) => t.href);
      const expectedHrefs = sourceEntries.map((e) => (e.kind === "source" ? e.href : ""));
      expect(hrefs).toEqual(expectedHrefs);

      expect(root.querySelectorAll(".protest-gallery-list .protest-tile--video").length).toBe(0);
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

    it("closes when clicking outside the panel from a sub-screen", () => {
      panel.attachTo(protestButton);
      panel.open();
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");
      document.body.click();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes on Escape key from a sub-screen", () => {
      panel.attachTo(protestButton);
      panel.open();
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });
  });
});
