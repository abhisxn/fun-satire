// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AvatarGallery } from "../../src/hud/AvatarGallery";
import visualTokens from "../../src/config/visualTokens.json";

function readText(rel: string): string {
  return readFileSync(resolve(__dirname, "..", "..", rel), "utf8");
}

describe("hud/AvatarGallery (Figma 284-wide scrolling glass panel)", () => {
  let host: HTMLElement;
  let gallery: AvatarGallery;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.querySelector<HTMLElement>("#host")!;
    gallery = new AvatarGallery(host, {
      avatars: [
        { id: "lotus", label: "Lotus", url: "/avatars/lotus.png" },
        { id: "elder-figure", label: "Elder Figure", url: "/avatars/elder.png" },
      ],
      cardCount: 10,
      initialSelected: "lotus",
    });
  });
  afterEach(() => {
    gallery.destroy();
    document.body.innerHTML = "";
  });

  it("mounts as a 284px-wide glass panel with the Figma token", () => {
    const root = host.querySelector<HTMLElement>(".avatar-gallery")!;
    expect(root).not.toBeNull();
    expect(Number(root.dataset.targetWidth)).toBe(visualTokens.ui.panel.gallery.width);
    expect(visualTokens.ui.panel.gallery.width).toBe(284);
  });

  it("renders a two-column grid layout", () => {
    const grid = host.querySelector<HTMLElement>(".avatar-gallery__grid")!;
    expect(grid).not.toBeNull();
    const style = (grid as HTMLElement).style.gridTemplateColumns;
    expect(style).toMatch(/1fr 1fr|repeat\(2/);
    const cols = getComputedStyle(grid).gridTemplateColumns;
    expect(cols.split(" ").length).toBe(2);
  });

  it("renders 10 cards (2 distinct avatars, repeated)", () => {
    const cards = host.querySelectorAll<HTMLButtonElement>("[data-avatar-card]");
    expect(cards.length).toBe(10);
  });

  it("selected card has aria-pressed=true", () => {
    const lotus = host.querySelector<HTMLButtonElement>('[data-avatar-card="lotus"]');
    expect(lotus?.getAttribute("aria-pressed")).toBe("true");
    const other = host.querySelector<HTMLButtonElement>('[data-avatar-card="elder-figure"]');
    expect(other?.getAttribute("aria-pressed")).toBe("false");
    gallery.setSelected("elder-figure");
    expect(other?.getAttribute("aria-pressed")).toBe("true");
    expect(lotus?.getAttribute("aria-pressed")).toBe("false");
  });

  it("card images have stable dimensions before decode (width+height attrs set)", () => {
    const imgs = host.querySelectorAll<HTMLImageElement>(".avatar-gallery__card img");
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const w = Number(img.getAttribute("width") ?? img.naturalWidth);
      const h = Number(img.getAttribute("height") ?? img.naturalHeight);
      expect(w, `img has no width: ${img.outerHTML}`).toBeGreaterThan(0);
      expect(h, `img has no height: ${img.outerHTML}`).toBeGreaterThan(0);
    }
  });

  it("matches the Figma geometry: 284px panel, 120px cards, 88px art", () => {
    expect(visualTokens.ui.panel.gallery.width).toBe(284);
    expect(visualTokens.ui.panel.gallery.cardWidth).toBe(120);
    expect(visualTokens.ui.panel.gallery.artSize).toBe(88);
    const root = host.querySelector<HTMLElement>(".avatar-gallery")!;
    expect(root.dataset.cardWidth).toBe(String(visualTokens.ui.panel.gallery.cardWidth));
    expect(root.dataset.artSize).toBe(String(visualTokens.ui.panel.gallery.artSize));
  });

  it("shows an AVATAR uppercase 12px label at the top", () => {
    const label = host.querySelector<HTMLElement>(".avatar-gallery__label")!;
    expect(label).not.toBeNull();
    expect(label.textContent?.toUpperCase()).toBe("AVATAR");
  });

  it("fires onSelect callback when a card is clicked", () => {
    const cb = vi.fn();
    gallery.onSelect(cb);
    const card = host.querySelector<HTMLButtonElement>('[data-avatar-card="elder-figure"]')!;
    card.click();
    expect(cb).toHaveBeenCalledWith("elder-figure");
  });

  it("starts closed: hidden + inert and aria-hidden reflects state", () => {
    const root = host.querySelector<HTMLElement>(".avatar-gallery")!;
    expect(root.hidden).toBe(true);
    expect(root.inert || root.getAttribute("inert") !== null).toBe(true);
    gallery.setOpen(true);
    expect(root.hidden).toBe(false);
    expect(root.inert).toBe(false);
    gallery.setOpen(false);
    expect(root.hidden).toBe(true);
    expect(root.inert || root.getAttribute("inert") !== null).toBe(true);
  });

  it("every card is at least 44px square (Figma touch minimum)", () => {
    const css = readText("src/hud/avatarGallery.css");
    expect(css).toMatch(/\.avatar-gallery__card[\s\S]{0,200}?min-width:\s*44px/);
    expect(css).toMatch(/\.avatar-gallery__card[\s\S]{0,200}?min-height:\s*44px/);
  });
});
