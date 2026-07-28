// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TextSubjectComposer, type TextSubjectDraft } from "../../src/hud/TextSubjectComposer";
import { TEXT_FONT_REGISTRY, type TextFontId } from "../../src/hud/textFontRegistry";

function readText(rel: string): string {
  return readFileSync(resolve(__dirname, "..", "..", rel), "utf8");
}

const SCALE_OPTIONS = [0.75, 1, 1.35] as const;
const ALIGN_OPTIONS = ["left", "center", "right"] as const;

describe("hud/TextSubjectComposer (Figma text subject builder)", () => {
  let host: HTMLElement;
  let composer: TextSubjectComposer;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
    composer = new TextSubjectComposer(host, {
      initial: {
        value: "hello",
        scale: 1,
        fontId: "spaceMono",
        align: "center",
      },
    });
  });
  afterEach(() => {
    composer.destroy();
    document.body.innerHTML = "";
  });

  it("mounts as a hidden inert dialog with the Figma text-panel id", () => {
    const root = host.querySelector<HTMLElement>(".text-composer")!;
    expect(root).not.toBeNull();
    expect(root.id).toBe("text-panel");
    expect(root.hidden).toBe(true);
    expect(root.inert || root.getAttribute("inert") !== null).toBe(true);
  });

  it("setOpen reveals the composer and removes inert", () => {
    const root = host.querySelector<HTMLElement>(".text-composer")!;
    composer.setOpen(true);
    expect(root.hidden).toBe(false);
    expect(root.inert).toBe(false);
  });

  it("renders a native <textarea> for the text value with aria-label", () => {
    const input = host.querySelector<HTMLTextAreaElement>("[data-text-composer-value]")!;
    expect(input).not.toBeNull();
    expect(input.tagName).toBe("TEXTAREA");
    expect(input.value).toBe("hello");
    expect(input.getAttribute("aria-label")).toMatch(/.+/);
  });

  it("changing the textarea fires onValueChange with the latest text", () => {
    const cb = vi.fn();
    composer.onValueChange(cb);
    const input = host.querySelector<HTMLTextAreaElement>("[data-text-composer-value]")!;
    input.value = "new text";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(cb).toHaveBeenLastCalledWith("new text");
  });

  it("renders three scale buttons matching the Figma size tokens 0.75 / 1 / 1.35", () => {
    const buttons = host.querySelectorAll<HTMLButtonElement>("[data-text-composer-scale]");
    expect(buttons.length).toBe(SCALE_OPTIONS.length);
    for (const b of buttons) {
      expect(SCALE_OPTIONS).toContain(Number(b.dataset.textComposerScale));
    }
  });

  it("clicking a scale button fires onScaleChange and marks the button aria-pressed", () => {
    const cb = vi.fn();
    composer.onScaleChange(cb);
    const target = host.querySelector<HTMLButtonElement>('[data-text-composer-scale="1.35"]')!;
    target.click();
    expect(cb).toHaveBeenCalledWith(1.35);
    expect(target.getAttribute("aria-pressed")).toBe("true");
    const other = host.querySelector<HTMLButtonElement>('[data-text-composer-scale="1"]')!;
    expect(other.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders alignment buttons for left/center/right", () => {
    const buttons = host.querySelectorAll<HTMLButtonElement>("[data-text-composer-align]");
    expect(buttons.length).toBe(ALIGN_OPTIONS.length);
    for (const b of buttons) {
      expect(ALIGN_OPTIONS).toContain(b.dataset.textComposerAlign);
    }
  });

  it("clicking an alignment button fires onAlignChange and updates aria-pressed", () => {
    const cb = vi.fn();
    composer.onAlignChange(cb);
    const left = host.querySelector<HTMLButtonElement>('[data-text-composer-align="left"]')!;
    left.click();
    expect(cb).toHaveBeenCalledWith("left");
    expect(left.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders a font select listing every TextFontId from the registry", () => {
    const select = host.querySelector<HTMLSelectElement>("[data-text-composer-font]")!;
    expect(select).not.toBeNull();
    expect(select.tagName).toBe("SELECT");
    const options = Array.from(select.options).map((o) => o.value);
    for (const entry of TEXT_FONT_REGISTRY) {
      expect(options).toContain(entry.id);
    }
  });

  it("changing the font select fires onFontChange with a valid TextFontId", () => {
    const cb = vi.fn();
    composer.onFontChange(cb);
    const select = host.querySelector<HTMLSelectElement>("[data-text-composer-font]")!;
    select.value = "fraunces";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(cb).toHaveBeenCalledWith("fraunces" as TextFontId);
  });

  it("getDraft() reflects the current draft state", () => {
    const draft: TextSubjectDraft = composer.getDraft();
    expect(draft.value).toBe("hello");
    expect(draft.scale).toBe(1);
    expect(draft.fontId).toBe("spaceMono");
    expect(draft.align).toBe("center");
  });

  it("setDraft replaces value, scale, fontId, and align", () => {
    composer.setDraft({ value: "Z", scale: 1.35, fontId: "unbounded", align: "right" });
    const input = host.querySelector<HTMLTextAreaElement>("[data-text-composer-value]")!;
    const select = host.querySelector<HTMLSelectElement>("[data-text-composer-font]")!;
    const right = host.querySelector<HTMLButtonElement>('[data-text-composer-align="right"]')!;
    const scale = host.querySelector<HTMLButtonElement>('[data-text-composer-scale="1.35"]')!;
    expect(input.value).toBe("Z");
    expect(select.value).toBe("unbounded");
    expect(right.getAttribute("aria-pressed")).toBe("true");
    expect(scale.getAttribute("aria-pressed")).toBe("true");
  });

  it("every interactive control meets the Figma 44px touch minimum", () => {
    const css = readText("src/hud/textComposer.css");
    expect(css).toMatch(/\.text-composer__scale-btn[\s\S]{0,200}?min-width:\s*44px/);
    expect(css).toMatch(/\.text-composer__scale-btn[\s\S]{0,200}?min-height:\s*44px/);
    expect(css).toMatch(/\.text-composer__align-btn[\s\S]{0,200}?min-width:\s*44px/);
    expect(css).toMatch(/\.text-composer__align-btn[\s\S]{0,200}?min-height:\s*44px/);
    expect(css).toMatch(/\.text-composer__value[\s\S]{0,200}?min-width:\s*44px/);
    expect(css).toMatch(/\.text-composer__value[\s\S]{0,200}?min-height:\s*44px/);
  });
});
