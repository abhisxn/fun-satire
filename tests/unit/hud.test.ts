// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";
import type { CreatureMode } from "../../src/creatures/creatureTypes";

describe("Hud", () => {
  let host: HTMLElement;
  let hud: Hud;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    hud = new Hud();
    hud.attachTo(host);
  });

  afterEach(() => {
    hud.destroy();
    host.remove();
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
    });

    it("creates attack button", () => {
      const attackBtn = host.querySelector(".hud-attack");
      expect(attackBtn).toBeTruthy();
      expect(attackBtn?.getAttribute("aria-label")).toBe("Attack");
      expect(attackBtn?.querySelector("span")?.textContent).toBe("Protest");
    });

    it("creates utility buttons", () => {
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(bugModeBtn).toBeTruthy();
      expect(settingsBtn).toBeTruthy();
      expect(galleryBtn).toBeTruthy();
    });
  });

  describe("mode buttons", () => {
    it("has eye mode active by default", () => {
      const eyeBtn = host.querySelector(".hud-btn--eye");
      expect(eyeBtn?.classList.contains("active")).toBe(true);
      expect(eyeBtn?.getAttribute("aria-pressed")).toBe("true");
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

  describe("bug mode toggle", () => {
    it("is inactive by default", () => {
      expect(hud.isBugModeActive()).toBe(false);
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      expect(bugModeBtn?.classList.contains("active")).toBe(false);
      expect(bugModeBtn?.getAttribute("aria-pressed")).toBe("false");
    });

    it("toggles active state on click", () => {
      const bugModeBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug-mode");
      bugModeBtn?.click();

      expect(hud.isBugModeActive()).toBe(true);
      expect(bugModeBtn?.classList.contains("active")).toBe(true);
      expect(bugModeBtn?.getAttribute("aria-pressed")).toBe("true");

      bugModeBtn?.click();

      expect(hud.isBugModeActive()).toBe(false);
      expect(bugModeBtn?.classList.contains("active")).toBe(false);
      expect(bugModeBtn?.getAttribute("aria-pressed")).toBe("false");
    });

    it("fires the bug mode toggle callback with the new state", () => {
      const states: boolean[] = [];
      hud.onBugModeToggle((active) => states.push(active));

      const bugModeBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug-mode");
      bugModeBtn?.click();
      bugModeBtn?.click();

      expect(states).toEqual([true, false]);
    });

    it("does not change the active creature mode", () => {
      const bugModeBtn = host.querySelector<HTMLButtonElement>(".hud-btn--bug-mode");
      bugModeBtn?.click();

      expect(hud.getActiveMode()).toBe("eyes");
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
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(eyeBtn?.getAttribute("data-tooltip")).toBe("Eye Mode");
      expect(cockroachBtn?.getAttribute("data-tooltip")).toBe("Cockroach Mode");
      expect(handBtn?.getAttribute("data-tooltip")).toBe("Point Mode");
      expect(bugModeBtn?.getAttribute("data-tooltip")).toBe("Bug Mode");
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
      const bugModeBtn = host.querySelector(".hud-btn--bug-mode");
      const settingsBtn = host.querySelector(".hud-btn--settings");
      const galleryBtn = host.querySelector(".hud-btn--gallery");

      expect(eyeBtn?.getAttribute("aria-label")).toBe("Eye Mode");
      expect(cockroachBtn?.getAttribute("aria-label")).toBe("Cockroach Mode");
      expect(handBtn?.getAttribute("aria-label")).toBe("Point Mode");
      expect(attackBtn?.getAttribute("aria-label")).toBe("Attack");
      expect(bugModeBtn?.getAttribute("aria-label")).toBe("Bug Mode");
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
      expect(hud.getActiveMode()).toBe("eyes");

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
