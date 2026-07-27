// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
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
    const cards = root.querySelectorAll(".subject-drawer__card:not(.subject-drawer__compose-preview):not(.subject-drawer__avatar-card)");
    expect(cards.length).toBe(5);
  });

  it("getCardElements returns an illustrated SubjectSkin per illustrated card", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const entries = drawer.getCardElements();
    const illustrated = entries.filter((e) => e.skin.kind === "illustrated");
    expect(illustrated.length).toBe(5);
    for (const { skin } of illustrated) {
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

describe("SubjectDrawer compose row", () => {
  it("starts with an empty text value and medium scale", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const preview = drawer.getComposePreviewCard();
    const skin = preview.getSkin();
    expect(skin).toEqual({ kind: "text", value: "", scale: 1, fontId: "spaceMono", align: "center" });
  });

  it("typing into the compose input updates the preview's text value", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    input.value = "No Kings";
    input.dispatchEvent(new Event("input"));
    const skin = drawer.getComposePreviewCard().getSkin();
    expect(skin).toEqual({ kind: "text", value: "No Kings", scale: 1, fontId: "spaceMono", align: "center" });
  });

  it("clicking small/large stepper buttons updates the preview's scale", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    root.querySelector<HTMLElement>('[data-size="small"]')!.click();
    expect(drawer.getComposePreviewCard().getSkin().scale).toBe(0.75);
    root.querySelector<HTMLElement>('[data-size="large"]')!.click();
    expect(drawer.getComposePreviewCard().getSkin().scale).toBe(1.35);
    root.querySelector<HTMLElement>('[data-size="medium"]')!.click();
    expect(drawer.getComposePreviewCard().getSkin().scale).toBe(1);
  });

  it("the preview card shows the typed text as its label", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    input.value = "Term Limits";
    input.dispatchEvent(new Event("input"));
    expect(drawer.getComposePreviewCard().el.textContent).toContain("Term Limits");
  });
});

describe("SubjectDrawer avatar card grid", () => {
  it("renders one avatar card per AVATAR_ASSET_REGISTRY entry alongside illustrated cards", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const avatarCards = root.querySelectorAll<HTMLElement>(".subject-drawer__avatar-card");
    expect(avatarCards.length).toBe(2);
    const allCards = root.querySelectorAll(
      ".subject-drawer__card:not(.subject-drawer__compose-preview), .subject-drawer__avatar-card",
    );
    expect(allCards.length).toBe(5 + 2);
    void drawer;
  });

  it("avatar cards show the sticker image and label", () => {
    const root = document.createElement("div");
    new SubjectDrawer(root, { anchor: "right" });
    const first = root.querySelector<HTMLElement>(".subject-drawer__avatar-card")!;
    const img = first.querySelector("img.subject-drawer__avatar-thumb")!;
    expect(img.getAttribute("src")).toBe("/avatars/sticker-1.png");
    expect(img.getAttribute("alt")).toBe("Sticker 1");
    expect(first.textContent).toContain("Sticker 1");
  });

  it("avatar section has a visible header label", () => {
    const root = document.createElement("div");
    new SubjectDrawer(root, { anchor: "right" });
    const header = root.querySelector<HTMLElement>(".subject-drawer__avatar-header");
    expect(header).not.toBeNull();
    expect(header!.textContent?.toLowerCase()).toContain("avatar");
  });

  it("getCardElements includes avatar skins with kind:avatar and the correct assetId", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    const entries = drawer.getCardElements();
    const avatarEntries = entries.filter((e) => e.skin.kind === "avatar");
    expect(avatarEntries.length).toBe(2);
    expect(avatarEntries[0]!.skin).toEqual({ kind: "avatar", assetId: "sticker-1" });
    expect(avatarEntries[1]!.skin).toEqual({ kind: "avatar", assetId: "sticker-2" });
  });
});

describe("SubjectDrawer resize-after-placement", () => {
  it("setActiveSkin(text) pre-populates the compose row and marks resize mode", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    drawer.setActiveSkin({ kind: "text", value: "Step Down", scale: 1.35 });
    const input = root.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    expect(input.value).toBe("Step Down");
    expect(root.querySelector('[data-size="large"]')!.classList.contains("subject-drawer__size-btn--active")).toBe(true);
  });

  it("setActiveSkin(illustrated) clears resize mode", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    drawer.setActiveSkin({ kind: "text", value: "X", scale: 1 });
    drawer.setActiveSkin({ kind: "illustrated", id: "figure" });
    const cb = vi.fn();
    drawer.onResize(cb);
    root.querySelector<HTMLElement>('[data-size="large"]')!.click();
    expect(cb).not.toHaveBeenCalled();
  });

  it("stepper clicks call onResize with the new scale only while a text skin is active", () => {
    const root = document.createElement("div");
    const drawer = new SubjectDrawer(root, { anchor: "right" });
    drawer.setActiveSkin({ kind: "text", value: "Step Down", scale: 1 });
    const cb = vi.fn();
    drawer.onResize(cb);
    root.querySelector<HTMLElement>('[data-size="large"]')!.click();
    expect(cb).toHaveBeenCalledWith(1.35);
  });
});
