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
