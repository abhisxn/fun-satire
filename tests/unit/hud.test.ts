// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";
import type { CreatureMode } from "../../src/creatures/creatureTypes";

describe("Hud", () => {
  let host: HTMLElement;
  let hud: Hud;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          text: () => Promise.resolve("<svg data-testid=\"placard-fetched\"></svg>"),
        } as Response),
      ),
    );
    host = document.createElement("div");
    document.body.appendChild(host);
    hud = new Hud();
    hud.attachTo(host);
  });

  afterEach(() => {
    hud.destroy();
    host.remove();
    vi.unstubAllGlobals();
  });

  describe("DOM structure", () => {
    it("creates root with correct attributes", () => {
      const root = host.querySelector(".premium-hud");
      expect(root).toBeTruthy();
      expect(root?.getAttribute("role")).toBe("toolbar");
      expect(root?.getAttribute("aria-label")).toBe("Game controls");
    });

    it("creates drag handle", () => {
      const handle = host.querySelector(".hud-drag-handle");
      expect(handle).toBeTruthy();
      expect(handle?.getAttribute("aria-label")).toBe("Drag to move");
      expect(handle?.querySelector("svg")).toBeTruthy();
    });

    it("creates mode buttons with correct classes", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      const handBtn = host.querySelector(".hud-btn--hand");

      expect(eyeBtn).toBeTruthy();
      expect(cockroachBtn).toBeTruthy();
      expect(handBtn).toBeTruthy();
      expect(host.querySelector(".hud-btn--placard")).toBeTruthy();
    });

    it("renders mode buttons in eye, hand, cockroach, placard order", () => {
      const modeButtons = host.querySelectorAll(".hud-btn--eye, .hud-btn--hand, .hud-btn--bug, .hud-btn--placard");
      const classNames = Array.from(modeButtons).map((btn) => btn.className);
      expect(classNames[0]).toContain("hud-btn--eye");
      expect(classNames[1]).toContain("hud-btn--hand");
      expect(classNames[2]).toContain("hud-btn--bug");
      expect(classNames[3]).toContain("hud-btn--placard");
    });

    it("creates attack button", () => {
      const attackBtn = host.querySelector(".hud-attack");
      expect(attackBtn).toBeTruthy();
      expect(attackBtn?.getAttribute("aria-label")).toBe("Attack");
      expect(attackBtn?.querySelector("span")?.textContent).toBe("Protest");
    });

    it("creates utility buttons", () => {
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(settingsBtn).toBeTruthy();
      expect(galleryBtn).toBeTruthy();
    });
  });

  describe("placard icon loading", () => {
    it("fetches /creatures/placard_icon.svg and swaps it into the placard button", async () => {
      await vi.waitFor(() => {
        const placardBtn = host.querySelector(".hud-btn--placard");
        expect(placardBtn?.innerHTML).toContain("placard-fetched");
      });
      expect(fetch).toHaveBeenCalledWith("/creatures/placard_icon.svg");
    });

    it("keeps the inline fallback icon if the fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
      const failHost = document.createElement("div");
      document.body.appendChild(failHost);
      const failHud = new Hud();
      failHud.attachTo(failHost);

      // Give the rejected fetch a tick to settle; the button should still
      // render its non-empty fallback markup, not go blank.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const placardBtn = failHost.querySelector(".hud-btn--placard");
      expect(placardBtn?.innerHTML.length).toBeGreaterThan(0);
      expect(placardBtn?.innerHTML).not.toContain("placard-fetched");

      failHud.destroy();
      failHost.remove();
    });
  });

  describe("mode buttons", () => {
    it("has cockroach mode active by default", () => {
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      expect(cockroachBtn?.classList.contains("active")).toBe(true);
      expect(cockroachBtn?.getAttribute("aria-pressed")).toBe("true");
    });

    it("toggles active state when clicked", () => {
      const cockroachBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug");
      cockroachBtn?.click();

      const eyeBtn = host.querySelector(".hud-btn--eye");
      const handBtn = host.querySelector(".hud-btn--hand");

      expect(cockroachBtn?.classList.contains("active")).toBe(true);
      expect(cockroachBtn?.getAttribute("aria-pressed")).toBe("true");
      expect(eyeBtn?.classList.contains("active")).toBe(false);
      expect(eyeBtn?.getAttribute("aria-pressed")).toBe("false");
      expect(handBtn?.classList.contains("active")).toBe(false);
      expect(handBtn?.getAttribute("aria-pressed")).toBe("false");
    });

    it("fires mode change event with correct mode", () => {
      let firedMode: CreatureMode | null = null;
      hud.onModeChange((mode) => {
        firedMode = mode;
      });

      const cockroachBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug");
      cockroachBtn?.click();

      expect(firedMode).toBe("cockroach");
    });

    it("fires mode change event for placard mode", () => {
      let firedMode: CreatureMode | null = null;
      hud.onModeChange((mode) => {
        firedMode = mode;
      });

      const placardBtn = host.querySelector<HTMLButtonElement>(".hud-btn--placard");
      placardBtn?.click();

      expect(firedMode).toBe("placard");
    });

    it("setActiveMode updates UI correctly", () => {
      hud.setActiveMode("pointedFinger");

      const handBtn = host.querySelector(".hud-btn--hand");
      const eyeBtn = host.querySelector(".hud-btn--eye");

      expect(handBtn?.classList.contains("active")).toBe(true);
      expect(handBtn?.getAttribute("aria-pressed")).toBe("true");
      expect(eyeBtn?.classList.contains("active")).toBe(false);
      expect(eyeBtn?.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("attack button", () => {
    it("fires attack press event on pointerdown", () => {
      let pressed = false;
      hud.onAttackPress(() => {
        pressed = true;
      });

      const attackBtn = host.querySelector<HTMLButtonElement>(".hud-attack");
      attackBtn?.dispatchEvent(new PointerEvent("pointerdown"));

      expect(pressed).toBe(true);
    });

    it("fires attack release event on pointerup", () => {
      let released = false;
      hud.onAttackRelease(() => {
        released = true;
      });

      const attackBtn = host.querySelector<HTMLButtonElement>(".hud-attack");
      attackBtn?.dispatchEvent(new PointerEvent("pointerup"));

      expect(released).toBe(true);
    });
  });

  describe("drag handle", () => {
    it("supports mouse drag", () => {
      const handle = host.querySelector<HTMLDivElement>(".hud-drag-handle");
      const root = host.querySelector<HTMLElement>(".premium-hud");

      handle?.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10 }));
      document.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 50 }));

      expect(root?.style.left).toBe("40px");
      expect(root?.style.top).toBe("40px");
      expect(root?.classList.contains("hud--dragging")).toBe(true);

      document.dispatchEvent(new PointerEvent("pointerup"));
      expect(root?.classList.contains("hud--dragging")).toBe(false);
    });

    it("cleans up drag listeners on destroy", () => {
      const handle = host.querySelector<HTMLDivElement>(".hud-drag-handle");
      const removeSpy = vi.spyOn(document, "removeEventListener");

      handle?.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10 }));
      hud.destroy();

      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });
  });

  describe("tooltips", () => {
    it("has tooltips on all buttons", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      const handBtn = host.querySelector(".hud-btn--hand");
      const placardBtn = host.querySelector(".hud-btn--placard");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(eyeBtn?.getAttribute("data-tooltip")).toBe("Eye Mode");
      expect(cockroachBtn?.getAttribute("data-tooltip")).toBe("Cockroach Mode");
      expect(handBtn?.getAttribute("data-tooltip")).toBe("Point Mode");
      expect(placardBtn?.getAttribute("data-tooltip")).toBe("Placard Mode");
      expect(settingsBtn?.getAttribute("data-tooltip")).toBe("Settings");
      expect(galleryBtn?.getAttribute("data-tooltip")).toBe("Grid View");
    });
  });

  describe("ARIA labels", () => {
    it("has correct aria-labels on all buttons", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      const cockroachBtn = host.querySelector(".hud-btn--bug");
      const handBtn = host.querySelector(".hud-btn--hand");
      const attackBtn = host.querySelector(".hud-attack");
      const placardBtn = host.querySelector(".hud-btn--placard");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(eyeBtn?.getAttribute("aria-label")).toBe("Eye Mode");
      expect(cockroachBtn?.getAttribute("aria-label")).toBe("Cockroach Mode");
      expect(handBtn?.getAttribute("aria-label")).toBe("Point Mode");
      expect(attackBtn?.getAttribute("aria-label")).toBe("Attack");
      expect(placardBtn?.getAttribute("aria-label")).toBe("Placard Mode");
      expect(settingsBtn?.getAttribute("aria-label")).toBe("Settings");
      expect(galleryBtn?.getAttribute("aria-label")).toBe("Grid View");
    });
  });

  describe("SVG icons", () => {
    it("has SVG icons in all icon buttons", () => {
      const buttons = host.querySelectorAll(".hud-btn");
      buttons.forEach((btn) => {
        const svg = btn.querySelector("svg");
        expect(svg).toBeTruthy();
      });
    });

    it("has text content in attack button", () => {
      const attackBtn = host.querySelector(".hud-attack");
      const span = attackBtn?.querySelector("span");
      expect(span?.textContent).toBe("Protest");
    });
  });

  describe("getActiveMode", () => {
    it("returns current active mode", () => {
      expect(hud.getActiveMode()).toBe("cockroach");

      hud.setActiveMode("cockroach");
      expect(hud.getActiveMode()).toBe("cockroach");

      hud.setActiveMode("pointedFinger");
      expect(hud.getActiveMode()).toBe("pointedFinger");
    });
  });

  describe("destroy", () => {
    it("removes HUD from DOM", () => {
      expect(host.querySelector(".premium-hud")).toBeTruthy();
      hud.destroy();
      expect(host.querySelector(".premium-hud")).toBeFalsy();
    });
  });
});
