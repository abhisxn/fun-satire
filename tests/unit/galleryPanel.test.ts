// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GalleryPanel } from "../../src/hud/GalleryPanel";

describe("hud/GalleryPanel", () => {
  let panel: GalleryPanel;
  let galleryButton: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    galleryButton = document.createElement("button");
    galleryButton.className = "hud-btn--gallery";
    document.body.appendChild(galleryButton);

    panel = new GalleryPanel();
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("DOM structure", () => {
    it("creates correct structure with overlay, panel, toggle section, and grids", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      expect(root.classList.contains("glass-panel-overlay")).toBe(true);

      const panelEl = root.querySelector(".glass-panel");
      expect(panelEl).not.toBeNull();

      const toggleSection = root.querySelector(".toggle-section");
      expect(toggleSection).not.toBeNull();

      const toggleGroup = root.querySelector(".toggle-group");
      expect(toggleGroup).not.toBeNull();

      const toggleBtns = root.querySelectorAll(".toggle-btn");
      expect(toggleBtns.length).toBe(2);
      expect(toggleBtns[0].textContent).toBe("Sticker");
      expect(toggleBtns[0].classList.contains("active")).toBe(true);
      expect(toggleBtns[1].textContent).toBe("Text");
      expect(toggleBtns[1].classList.contains("active")).toBe(false);

      const gridContainer = root.querySelector(".grid-container");
      expect(gridContainer).not.toBeNull();
      expect(gridContainer?.classList.contains("sticker-mode")).toBe(true);

      const stickerGrid = root.querySelector(".sticker-grid");
      expect(stickerGrid).not.toBeNull();

      const stickerCards = root.querySelectorAll(".sticker-card");
      expect(stickerCards.length).toBe(10);

      const textGrid = root.querySelector(".text-grid");
      expect(textGrid).not.toBeNull();

      const textCards = root.querySelectorAll(".text-card");
      expect(textCards.length).toBe(8);
    });

    it("creates sticker cards with emoji placeholders and gradients", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      const stickerCards = root.querySelectorAll(".sticker-card");
      stickerCards.forEach((card) => {
        const placeholder = card.querySelector(".sticker-placeholder");
        expect(placeholder).not.toBeNull();
        expect(placeholder?.textContent).toBeTruthy();
        expect(placeholder?.getAttribute("style")).toContain("background");
      });
    });

    it("creates text cards with distinct font previews", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      const textCards = root.querySelectorAll(".text-card");
      expect(textCards.length).toBe(8);
      const labels = new Set<string>();
      textCards.forEach((card) => {
        const p = card.querySelector("p");
        expect(p).not.toBeNull();
        const font = (p as HTMLElement).style.fontFamily;
        expect(font).toBeTruthy();
        expect(font).not.toBe('"Fraunces", serif');
        labels.add((p as HTMLElement).textContent ?? "");
      });
      expect(labels.size).toBe(8);
    });
  });

  describe("Toggle between modes", () => {
    it("switches to text mode when text button is clicked", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      const textBtn = root.querySelector<HTMLButtonElement>('.toggle-btn[data-mode="text"]');
      textBtn?.click();

      expect(panel.getMode()).toBe("text");
      const gridContainer = root.querySelector(".grid-container");
      expect(gridContainer?.classList.contains("text-mode")).toBe(true);
      expect(gridContainer?.classList.contains("sticker-mode")).toBe(false);

      const stickerBtn = root.querySelector('.toggle-btn[data-mode="sticker"]');
      expect(stickerBtn?.classList.contains("active")).toBe(false);
      expect(textBtn?.classList.contains("active")).toBe(true);
    });

    it("switches back to sticker mode when sticker button is clicked", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      const textBtn = root.querySelector<HTMLButtonElement>('.toggle-btn[data-mode="text"]');
      textBtn?.click();
      expect(panel.getMode()).toBe("text");

      const stickerBtn = root.querySelector<HTMLButtonElement>('.toggle-btn[data-mode="sticker"]');
      stickerBtn?.click();

      expect(panel.getMode()).toBe("sticker");
      const gridContainer = root.querySelector(".grid-container");
      expect(gridContainer?.classList.contains("sticker-mode")).toBe(true);
      expect(gridContainer?.classList.contains("text-mode")).toBe(false);

      expect(stickerBtn?.classList.contains("active")).toBe(true);
      expect(textBtn?.classList.contains("active")).toBe(false);
    });

    it("setMode method updates mode and UI", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      panel.setMode("text");
      expect(panel.getMode()).toBe("text");

      const textBtn = root.querySelector('.toggle-btn[data-mode="text"]');
      expect(textBtn?.classList.contains("active")).toBe(true);

      panel.setMode("sticker");
      expect(panel.getMode()).toBe("sticker");

      const stickerBtn = root.querySelector('.toggle-btn[data-mode="sticker"]');
      expect(stickerBtn?.classList.contains("active")).toBe(true);
    });
  });

  describe("Open/Close/Toggle", () => {
    it("open() shows the panel", () => {
      panel.attachTo(galleryButton);
      panel.open();

      const root = panel.getRoot();
      expect(root.classList.contains("open")).toBe(true);
      expect(galleryButton.style.opacity).toBe("0.6");
    });

    it("close() hides the panel", () => {
      panel.attachTo(galleryButton);
      panel.open();
      panel.close();

      const root = panel.getRoot();
      expect(root.classList.contains("open")).toBe(false);
      expect(galleryButton.style.opacity).toBe("");
    });

    it("toggle() switches between open and closed states", () => {
      panel.attachTo(galleryButton);

      panel.toggle();
      expect(panel.getRoot().classList.contains("open")).toBe(true);

      panel.toggle();
      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("open() is idempotent", () => {
      panel.attachTo(galleryButton);
      panel.open();
      panel.open();

      expect(panel.getRoot().classList.contains("open")).toBe(true);
    });

    it("close() is idempotent", () => {
      panel.attachTo(galleryButton);
      panel.close();
      panel.close();

      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });
  });

  describe("Outside click", () => {
    it("closes panel when clicking outside", () => {
      panel.attachTo(galleryButton);
      panel.open();

      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);

      outsideElement.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("does not close when clicking inside panel", () => {
      panel.attachTo(galleryButton);
      panel.open();

      const root = panel.getRoot();
      const panelEl = root.querySelector(".glass-panel");
      panelEl?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(root.classList.contains("open")).toBe(true);
    });

    it("does not close when clicking gallery button", () => {
      panel.attachTo(galleryButton);
      panel.open();

      galleryButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(panel.getRoot().classList.contains("open")).toBe(true);
    });
  });

  describe("Escape key", () => {
    it("closes panel when Escape is pressed", () => {
      panel.attachTo(galleryButton);
      panel.open();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(panel.getRoot().classList.contains("open")).toBe(false);
    });

    it("does not close on other keys", () => {
      panel.attachTo(galleryButton);
      panel.open();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(panel.getRoot().classList.contains("open")).toBe(true);
    });
  });

  describe("Card hover effects", () => {
    it("tracks mouse position on sticker cards and updates CSS variables", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      const stickerCard = root.querySelector<HTMLElement>(".sticker-card");
      expect(stickerCard).not.toBeNull();

      const rect = {
        left: 100,
        top: 100,
        width: 100,
        height: 100,
      };
      vi.spyOn(stickerCard!, "getBoundingClientRect").mockReturnValue(rect as DOMRect);

      const mouseEvent = new MouseEvent("mousemove", {
        clientX: 150,
        clientY: 175,
        bubbles: true,
      });
      stickerCard!.dispatchEvent(mouseEvent);

      expect(stickerCard!.style.getPropertyValue("--mx")).toBe("50%");
      expect(stickerCard!.style.getPropertyValue("--my")).toBe("75%");
    });

    it("updates CSS variables correctly for different mouse positions", () => {
      panel.attachTo(galleryButton);
      const root = panel.getRoot();

      const stickerCard = root.querySelector<HTMLElement>(".sticker-card");
      const rect = {
        left: 0,
        top: 0,
        width: 200,
        height: 200,
      };
      vi.spyOn(stickerCard!, "getBoundingClientRect").mockReturnValue(rect as DOMRect);

      const mouseEvent1 = new MouseEvent("mousemove", {
        clientX: 50,
        clientY: 100,
        bubbles: true,
      });
      stickerCard!.dispatchEvent(mouseEvent1);
      expect(stickerCard!.style.getPropertyValue("--mx")).toBe("25%");
      expect(stickerCard!.style.getPropertyValue("--my")).toBe("50%");

      const mouseEvent2 = new MouseEvent("mousemove", {
        clientX: 150,
        clientY: 50,
        bubbles: true,
      });
      stickerCard!.dispatchEvent(mouseEvent2);
      expect(stickerCard!.style.getPropertyValue("--mx")).toBe("75%");
      expect(stickerCard!.style.getPropertyValue("--my")).toBe("25%");
    });
  });

  describe("destroy", () => {
    it("removes panel from DOM and cleans up listeners", () => {
      panel.attachTo(galleryButton);
      panel.open();

      panel.destroy();

      expect(document.querySelector(".glass-panel-overlay")).toBeNull();
    });

    it("cleans up event listeners", () => {
      panel.attachTo(galleryButton);
      panel.open();

      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
      panel.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe("onTextSelect", () => {
    it("invokes callback with the clicked font", () => {
      panel.attachTo(galleryButton);
      const cb = vi.fn();
      panel.onTextSelect(cb);

      const root = panel.getRoot();
      const firstText = root.querySelector<HTMLElement>(".text-card");
      firstText?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(firstText?.dataset.textFont);
    });

    it("returns an unsubscribe function", () => {
      panel.attachTo(galleryButton);
      const cb = vi.fn();
      const off = panel.onTextSelect(cb);
      off();
      const root = panel.getRoot();
      root.querySelector<HTMLElement>(".text-card")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
