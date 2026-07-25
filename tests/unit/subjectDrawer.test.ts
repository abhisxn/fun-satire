// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { SubjectDrawer } from "../../src/hud/SubjectDrawer";

describe("SubjectDrawer scaffold", () => {
  it("starts closed and toggles open/closed", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    expect(drawer.isOpen()).toBe(false);
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-open")).toBe("true");
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-open")).toBe("false");
  });

  it("toggle() flips between open and closed", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "left" });
    drawer.toggle();
    expect(drawer.isOpen()).toBe(true);
    drawer.toggle();
    expect(drawer.isOpen()).toBe(false);
  });

  it("renders one card per SUBJECT_SKIN_REGISTRY entry", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const cards = root.querySelectorAll(".subject-drawer__card");
    expect(cards.length).toBe(5);
  });

  it("getCardElements returns an illustrated SubjectSkin per card", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const entries = drawer.getCardElements();
    expect(entries.length).toBe(5);
    for (const { skin } of entries) {
      expect(skin.kind).toBe("illustrated");
    }
  });

  it("applies a per-card stagger delay via inline custom property", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".subject-drawer__card"));
    const delays = cards.map((c) => c.style.getPropertyValue("--reveal-delay"));
    expect(new Set(delays).size).toBeGreaterThan(1);
  });

  it("anchors to the requested screen edge via a data attribute", () => {
    const root = document.createElement("div");
    new SubjectDrawer(root, { anchor: "left" });
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-anchor")).toBe("left");
  });
});
