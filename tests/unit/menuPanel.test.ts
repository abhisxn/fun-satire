// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MenuPanel } from "../../src/hud/MenuPanel";
import { GALLERY_ENTRIES } from "../../src/hud/menuContent";

const QUICK_LINKS: Array<[string, string]> = [
  ["About Project", "About This Project"],
  ["Be a More Informed Citizen", "Be a More Informed Citizen"],
  ["Support Independent Media", "Support Independent Media"],
  ["Other Resources", "Other Resources"],
];

function clickQuickLink(root: HTMLElement, label: string): void {
  const btn = Array.from(root.querySelectorAll<HTMLButtonElement>(".menu-quick-link")).find(
    (b) => b.textContent === label,
  );
  expect(btn).not.toBeUndefined();
  btn?.click();
}

describe("hud/MenuPanel", () => {
  let panel: MenuPanel;
  let menuButton: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    menuButton = document.createElement("button");
    menuButton.className = "hud-menu-btn";
    document.body.appendChild(menuButton);

    panel = new MenuPanel();
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("main menu screen", () => {
    it("creates overlay and panel with the watchdog note", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();

      expect(root.classList.contains("menu-panel-overlay")).toBe(true);
      expect(root.querySelector(".menu-panel")).not.toBeNull();

      const title = root.querySelector(".menu-panel-home-title");
      expect(title?.textContent).toBe("A crowd that watches back");

      const copy = root.querySelector(".menu-panel-home-copy");
      expect(copy?.textContent).toBe(
        "No leader to arrest. No face to blame — just thousands of us, and we're not going anywhere.",
      );

      expect(root.querySelector(".menu-join-link")).toBeNull();
      expect(root.querySelector(".menu-footer")?.textContent).toBe("© thatguyabhishek");
    });

    it("renders four quick-link buttons (not anchors) with the exact labels", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();

      const links = root.querySelectorAll<HTMLButtonElement>(".menu-quick-link");
      expect(links.length).toBe(4);

      const labels = Array.from(links).map((el) => el.textContent);
      expect(labels).toEqual([
        "About Project",
        "Be a More Informed Citizen",
        "Support Independent Media",
        "Other Resources",
      ]);

      for (const link of Array.from(links)) {
        expect(link.tagName).toBe("BUTTON");
        expect(link.getAttribute("href")).toBeNull();
      }
    });

    it("renders the share prompt", () => {
      panel.attachTo(menuButton);
      const prompt = panel.getRoot().querySelector(".menu-share-prompt");
      expect(prompt?.textContent).toBe(
        "Every share adds one more eye, one more finger, one more cockroach, one more placard to the crowd. Gutter Generation only grows when you share it.",
      );
    });

    it("renders the footer on the initial menu screen", () => {
      panel.attachTo(menuButton);
      expect(panel.getRoot().querySelector(".menu-footer")?.textContent).toBe("© thatguyabhishek");
    });
  });

  describe("navigation to sub-screens", () => {
    for (const [linkLabel, heading] of QUICK_LINKS) {
      it(`navigates to the "${heading}" screen from "${linkLabel}" and back to the menu`, () => {
        panel.attachTo(menuButton);
        const root = panel.getRoot();

        clickQuickLink(root, linkLabel);

        const backBtn = root.querySelector<HTMLButtonElement>(".menu-back-btn");
        expect(backBtn?.textContent).toBe("Menu");

        const headingEl = root.querySelector(".menu-subscreen h3");
        expect(headingEl?.textContent).toBe(heading);

        // Footer persists across all screens.
        expect(root.querySelector(".menu-footer")?.textContent).toBe("© thatguyabhishek");

        // Menu-only content is gone.
        expect(root.querySelector(".menu-panel-home")).toBeNull();
        expect(root.querySelector(".menu-quick-links")).toBeNull();
        expect(root.querySelector(".menu-share-prompt")).toBeNull();
        expect(root.querySelector(".menu-share")).toBeNull();

        backBtn?.click();

        expect(root.querySelector(".menu-subscreen")).toBeNull();
        expect(root.querySelectorAll(".menu-quick-link").length).toBe(4);
        expect(root.querySelector(".menu-share-prompt")).not.toBeNull();
        expect(root.querySelector(".menu-footer")?.textContent).toBe("© thatguyabhishek");
      });
    }
  });

  describe("about screen", () => {
    it("renders exactly five paragraphs with the expected copy", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");

      const paragraphs = Array.from(root.querySelectorAll(".menu-about p")).map((p) => p.textContent);
      expect(paragraphs).toEqual([
        "Gutter Generation is a playful, and dead serious, take on something real: a generation that got called cockroaches and gutter generation, and wore both as badges instead of insults.",
        "For weeks, thousands of us filled Jantar Mantar, in the capital — different states, different faiths, different castes. Turns out none of that mattered as much as we'd been told it would. One voice, one demand: show up, or step down. No single leader. No face to arrest. Just numbers, and numbers don't scare that easily.",
        "Independent journalists stayed on the ground asking the questions officials wouldn't answer. People who couldn't make it sent food, ran errands for those who could, or just refreshed their feed for updates — living the protest through a screen instead of the square. When it turned physical, we didn't disappear. We danced. We memed. We kept showing up. Some of us got hurt doing it. One of them stepped down. Nobody went home.",
        "This app is that story, turned into a toy. Drop a sticker of anyone you want into the crowd, and watch: eyes track them, fingers point, cockroaches swarm, placards go up. Nowhere left to hide, nothing left unwatched. That's why it's called Gutter Generation — the name they used against us is now the thing surrounding you.",
        "I built it to push past what I'd normally do with AI — not a static page, something with real feel: physics, timing, a crowd that actually reacts. Started as a weekend project. The crowd had other plans.",
      ]);
    });
  });

  describe("informed citizen screen", () => {
    it("renders an intro line, eight tips, and no gallery content", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Be a More Informed Citizen");

      expect(root.querySelector(".menu-informed-intro")?.textContent).toBe(
        "A protest gets you heard once. What you do after is what keeps you heard.",
      );

      const items = root.querySelectorAll(".menu-tips li");
      expect(items.length).toBe(8);

      expect(root.querySelector(".menu-gallery-list")).toBeNull();
      expect(root.querySelector(".menu-tile")).toBeNull();
    });
  });

  describe("support independent media screen", () => {
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

    it("falls back to a source-style card when a video thumbnail fails to load", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Support Independent Media");

      const firstThumb = root.querySelector<HTMLImageElement>(
        ".menu-gallery-list .menu-tile--video .menu-tile-thumb",
      );
      const tileLink = firstThumb?.closest("a");
      const title = firstThumb?.alt ?? "";

      firstThumb?.dispatchEvent(new Event("error"));

      expect(tileLink?.classList.contains("menu-tile--video")).toBe(false);
      expect(tileLink?.classList.contains("menu-tile--source")).toBe(true);
      expect(tileLink?.querySelector(".menu-tile-thumb")).toBeNull();
      expect(tileLink?.querySelector(".menu-tile-label")?.textContent).toBe(title);
    });
  });

  describe("other resources screen", () => {
    it("renders a source tile per source entry with correct hrefs, and no video tiles", () => {
      panel.attachTo(menuButton);
      const root = panel.getRoot();
      clickQuickLink(root, "Other Resources");

      const sourceEntries = GALLERY_ENTRIES.filter((e) => e.kind === "source");
      const sourceTiles = root.querySelectorAll<HTMLAnchorElement>(".menu-gallery-list .menu-tile--source");
      expect(sourceTiles.length).toBe(sourceEntries.length);

      const hrefs = Array.from(sourceTiles).map((t) => t.href);
      const expectedHrefs = sourceEntries.map((e) => (e.kind === "source" ? e.href : ""));
      expect(hrefs).toEqual(expectedHrefs);

      expect(root.querySelectorAll(".menu-gallery-list .menu-tile--video").length).toBe(0);
    });
  });

  describe("share", () => {
    afterEach(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });

    it("renders a single primary Share button when navigator.share is available", () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      const localPanel = new MenuPanel();
      localPanel.attachTo(menuButton);
      const root = localPanel.getRoot();

      expect(root.querySelector(".menu-share-primary")).not.toBeNull();
      expect(root.querySelector(".menu-share-fallback-row")).toBeNull();

      localPanel.destroy();
    });

    it("calls navigator.share with title, text, and url when the primary button is clicked", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

      const localPanel = new MenuPanel();
      localPanel.attachTo(menuButton);
      const btn = localPanel.getRoot().querySelector<HTMLButtonElement>(".menu-share-primary");
      btn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(shareMock).toHaveBeenCalledWith({
        title:
          "I dropped them into the crowd — eyes, fingers, cockroaches, and placards closed in. This is Gutter Generation. Come try it.",
        text: "I dropped them into the crowd — eyes, fingers, cockroaches, and placards closed in. This is Gutter Generation. Come try it.",
        url: window.location.href,
      });

      localPanel.destroy();
    });

    it("renders WhatsApp and Facebook fallback links when navigator.share is unavailable", () => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });

      const localPanel = new MenuPanel();
      localPanel.attachTo(menuButton);
      const root = localPanel.getRoot();

      expect(root.querySelector(".menu-share-primary")).toBeNull();

      const whatsapp = root.querySelector<HTMLAnchorElement>(".menu-share-icon-btn--whatsapp");
      expect(whatsapp?.href).toBe(
        `https://wa.me/?text=${encodeURIComponent("I dropped them into the crowd — eyes, fingers, cockroaches, and placards closed in. This is Gutter Generation. Come try it. " + window.location.href)}`,
      );
      expect(whatsapp?.target).toBe("_blank");

      const facebook = root.querySelector<HTMLAnchorElement>(".menu-share-icon-btn--facebook");
      expect(facebook?.href).toBe(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      );

      expect(root.querySelector(".menu-share-icon-btn--instagram")).not.toBeNull();

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

      const localPanel = new MenuPanel();
      localPanel.attachTo(menuButton);
      const instagramBtn = localPanel.getRoot().querySelector<HTMLButtonElement>(".menu-share-icon-btn--instagram");
      instagramBtn?.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
      expect(openMock).toHaveBeenCalledWith("https://instagram.com", "_blank", "noopener,noreferrer");
      expect(localPanel.getRoot().querySelector(".menu-toast.visible")).not.toBeNull();

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

      const localPanel = new MenuPanel();
      localPanel.attachTo(menuButton);
      const instagramBtn = localPanel.getRoot().querySelector<HTMLButtonElement>(".menu-share-icon-btn--instagram");
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

      const localPanel = new MenuPanel();
      localPanel.attachTo(menuButton);
      const instagramBtn = localPanel.getRoot().querySelector<HTMLButtonElement>(".menu-share-icon-btn--instagram");
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
      panel.attachTo(menuButton);
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("opens on open()", () => {
      panel.attachTo(menuButton);
      panel.open();
      expect(panel.getRoot().classList.contains("open")).toBe(true);
    });

    it("closes on close()", () => {
      panel.attachTo(menuButton);
      panel.open();
      panel.close();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("toggle() flips open state", () => {
      panel.attachTo(menuButton);
      panel.toggle();
      expect(panel.getRoot().classList.contains("open")).toBe(true);
      panel.toggle();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes when clicking outside the panel", () => {
      panel.attachTo(menuButton);
      panel.open();
      document.body.click();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes on Escape key", () => {
      panel.attachTo(menuButton);
      panel.open();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes when clicking outside the panel from a sub-screen", () => {
      panel.attachTo(menuButton);
      panel.open();
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");
      document.body.click();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("closes on Escape key from a sub-screen", () => {
      panel.attachTo(menuButton);
      panel.open();
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("resets to the main menu after close() then open(), even from a sub-screen", () => {
      panel.attachTo(menuButton);
      panel.open();
      const root = panel.getRoot();
      clickQuickLink(root, "About Project");

      panel.close();
      panel.open();

      // Should land back on the main menu, not the previously open sub-screen.
      expect(root.querySelector(".menu-panel-home")).not.toBeNull();
      expect(root.querySelector(".menu-quick-links")).not.toBeNull();
      expect(root.querySelector(".menu-subscreen")).toBeNull();
    });
  });
});
