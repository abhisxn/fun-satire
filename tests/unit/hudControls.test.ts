// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { Hud } from "../../src/hud/Hud";

describe("Hud crowd controls", () => {
  it("cycles HudMode on mode-icon click and calls onModeChange", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onModeChange = vi.fn();
    hud.onModeChange(onModeChange);
    const modeBtn = root.querySelector<HTMLElement>(".hud-placard__mode-icon")!;
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("bugs");
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("pointedFinger");
    modeBtn.click();
    expect(onModeChange).toHaveBeenCalledWith("eyes");
  });

  it("steps quantity up/down within [1, 60] and calls onQuantityChange with absolute value", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>(".hud-placard__qty-inc")!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(21);
    root.querySelector<HTMLElement>(".hud-placard__qty-dec")!.click();
    expect(onQuantityChange).toHaveBeenCalledWith(20);
  });

  it("clamps quantity at minimum of 1", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    hud.setQuantity(1);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>(".hud-placard__qty-dec")!.click();
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it("clamps quantity at maximum of 60", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    hud.setQuantity(60);
    const onQuantityChange = vi.fn();
    hud.onQuantityChange(onQuantityChange);
    root.querySelector<HTMLElement>(".hud-placard__qty-inc")!.click();
    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it("reports repel track changes as a 0..2 multiplier via onRepelChange", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const onRepelChange = vi.fn();
    hud.onRepelChange(onRepelChange);
    const track = root.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
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
    const track = root.querySelector<HTMLInputElement>(".hud-placard__repel-input")!;
    track.value = "3";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(2);
    track.value = "-1";
    track.dispatchEvent(new Event("input"));
    expect(onRepelChange).toHaveBeenCalledWith(0);
  });

  it("styles the repel control as a custom track, not a bare browser range input", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector<HTMLElement>(".hud-placard__repel-track")).not.toBeNull();
  });
});

describe("Hud subject browser", () => {
  it("Hud constructor takes a canvas drop target and does not render a skin-cycle icon", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector(".hud-placard__skin-icon")).toBeNull();
    expect(root.querySelector(".hud-placard__skin-label")).toBeNull();
  });

  it("renders a subject-browser toggle button in the placard", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    expect(root.querySelector(".hud-placard__subject-toggle")).not.toBeNull();
  });

  it("clicking the toggle opens the SubjectDrawer", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    new Hud(root, canvas);
    root.querySelector<HTMLElement>(".hud-placard__subject-toggle")!.click();
    expect(root.querySelector(".subject-drawer")!.getAttribute("data-open")).toBe("true");
  });

  it("onSubjectSkinChange fires when a card is tapped (touch)", () => {
    const root = document.createElement("div");
    const canvas = document.createElement("canvas");
    const hud = new Hud(root, canvas);
    const cb = vi.fn();
    hud.onSubjectSkinChange(cb);
    root.querySelector<HTMLElement>(".hud-placard__subject-toggle")!.click();
    const firstCard = root.querySelector<HTMLElement>(".subject-drawer__card")!;
    firstCard.dispatchEvent(new PointerEvent("pointerup", { clientX: 1, clientY: 1, pointerType: "touch", bubbles: true }));
    expect(cb).toHaveBeenCalled();
  });
});
