import { UI_TOKENS } from "../config/visualTokens";

export type AvatarEntry = {
  id: string;
  label: string;
  url: string;
};

export type AvatarGalleryOptions = {
  avatars: readonly AvatarEntry[];
  cardCount: number;
  initialSelected?: string;
};

export class AvatarGallery {
  private readonly root: HTMLElement;
  private readonly cards: Map<string, HTMLButtonElement[]> = new Map();
  private selected: string | null;

  private selectCb: ((id: string) => void) | null = null;

  constructor(host: HTMLElement, opts: AvatarGalleryOptions) {
    this.selected = opts.initialSelected ?? null;

    const root = document.createElement("section");
    root.className = "avatar-gallery";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Avatar gallery");
    root.id = "avatar-gallery";
    root.dataset.targetWidth = String(UI_TOKENS.panel.gallery.width);
    root.dataset.cardWidth = String(UI_TOKENS.panel.gallery.cardWidth);
    root.dataset.artSize = String(UI_TOKENS.panel.gallery.artSize);
    root.hidden = true;
    root.inert = true;
    this.root = root;

    const label = document.createElement("h2");
    label.className = "avatar-gallery__label";
    label.textContent = "AVATAR";
    root.appendChild(label);

    const grid = document.createElement("div");
    grid.className = "avatar-gallery__grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    root.appendChild(grid);

    for (let i = 0; i < opts.cardCount; i++) {
      const avatar = opts.avatars[i % opts.avatars.length]!;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "avatar-gallery__card";
      card.dataset.avatarCard = avatar.id;
      card.setAttribute("aria-label", `Select ${avatar.label} avatar`);
      card.setAttribute("aria-pressed", avatar.id === this.selected ? "true" : "false");
      const artSize = UI_TOKENS.panel.gallery.artSize;
      const img = document.createElement("img");
      img.className = "avatar-gallery__art";
      img.src = avatar.url;
      img.alt = avatar.label;
      img.draggable = false;
      img.width = artSize;
      img.height = artSize;
      img.loading = "lazy";
      img.decoding = "async";
      const tile = document.createElement("span");
      tile.className = "avatar-gallery__tile";
      tile.appendChild(img);
      card.appendChild(tile);
      card.addEventListener("click", () => this.setSelected(avatar.id));
      grid.appendChild(card);
      const list = this.cards.get(avatar.id) ?? [];
      list.push(card);
      this.cards.set(avatar.id, list);
    }

    host.appendChild(root);
  }

  getRoot(): HTMLElement {
    return this.root;
  }

  setOpen(open: boolean): void {
    this.root.hidden = !open;
    if (open) this.root.inert = false;
    else this.root.inert = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  setSelected(id: string): void {
    this.selected = id;
    for (const [cid, list] of this.cards) {
      const pressed = cid === id ? "true" : "false";
      for (const card of list) {
        card.setAttribute("aria-pressed", pressed);
      }
    }
    this.selectCb?.(id);
  }

  getSelected(): string | null {
    return this.selected;
  }

  onSelect(cb: (id: string) => void): void { this.selectCb = cb; }

  destroy(): void {
    this.root.remove();
  }
}
