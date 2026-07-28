// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";

describe("Hud crowd controls (ControlBar + FilterPanel)", () => {
  it("cycles HudMode on mode-button click and calls onModeChange", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onModeChange = vi.fn();
    hud.onModeChange(onModeChange);
    root.querySelector<HTMLElement>('[data-control-mode="bugs"]')!.click();
    expect(onModeChange).toHaveBeenCalledWith("bugs");
    root.querySelector<HTMLElement>('[data-control-mode="pointedFinger"]')!.click();
    expect(onModeChange).toHaveBeenCalledWith("pointedFinger");
    root.querySelector<HTMLElement>('[data-control-mode="eyes"]')!.click();
    expect(onModeChange).toHaveBeenCalledWith("eyes");
  });

  it("steps quantity up/down within [1, 60] via ControlBar and calls onQuantityChange", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>('[data-control-qty="inc"]')!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(21);
    root.querySelector<HTMLElement>('[data-control-qty="dec"]')!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(20);
  });

  it("clamps quantity at minimum of 1", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    hud.setQuantity(1);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>('[data-control-qty="dec"]')!.click();
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it("clamps quantity at maximum of 60", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    hud.setQuantity(60);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>('[data-control-qty="inc"]')!.click();
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it("reports repel track changes as a 0..2 multiplier via FilterPanel onRepelChange", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onRepelChange = vi.fn();
    hud.onRepelChange(onRepelChange);
    const track = root.querySelector<HTMLInputElement>("[data-filter-repel]")!;
    track.value = "1.5";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(1.5);
  });

  it("clamps repel value to [0, 2] range", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onRepelChange = vi.fn();
    hud.onRepelChange(onRepelChange);
    const track = root.querySelector<HTMLInputElement>("[data-filter-repel]")!;
    track.value = "3";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(2);
    track.value = "-1";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(0);
  });

  it("styles the repel control as a native range in FilterPanel", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    const track = root.querySelector<HTMLInputElement>("[data-filter-repel]");
    expect(track).not.toBeNull();
    expect(track?.type).toBe("range");
  });
});

describe("Hud subject browser (AvatarGallery)", () => {
  it("Hud constructor does not render legacy skin-cycle or placard chrome", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector(".hud-placard")).toBeNull();
    expect(root.querySelector(".hud-placard__skin-icon")).toBeNull();
    expect(root.querySelector(".subject-drawer")).toBeNull();
  });

  it("renders gallery trigger on ControlBar", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector('[data-control-trigger="gallery"]')).not.toBeNull();
  });

  it("clicking the gallery trigger opens AvatarGallery", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    root.querySelector<HTMLElement>('[data-control-trigger="gallery"]')!.click();
    expect(root.querySelector(".avatar-gallery")!.hidden).toBe(false);
  });

  it("onSubjectDrop fires when an avatar card is clicked", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const drop = vi.fn();
    const skin = vi.fn();
    hud.onSubjectDrop(drop);
    hud.onSubjectSkinChange(skin);
    root.querySelector<HTMLElement>('[data-control-trigger="gallery"]')!.click();
    const card = root.querySelector<HTMLElement>("[data-avatar-card]")!;
    card.click();
    expect(drop).toHaveBeenCalled();
    expect(skin).toHaveBeenCalled();
    expect(drop.mock.calls[0]![0].skin.kind).toBe("avatar");
  });

  it("FilterPanel quantity stepper also drives onQuantityChange", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>('[data-control-trigger="filter"]')!.click();
    root.querySelector<HTMLElement>('[data-filter-qty="inc"]')!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(21);
  });
});
