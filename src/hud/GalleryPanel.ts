import "./galleryPanel.css";

type GalleryMode = "sticker" | "text";

interface StickerDef {
  readonly emoji: string;
  readonly gradient: string;
}

const STICKER_DEFS: readonly StickerDef[] = [
  { emoji: "\u{1F441}", gradient: "linear-gradient(135deg,#ff9a9e,#fad0c4)" },
  { emoji: "\u{1F41B}", gradient: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { emoji: "\u261D\uFE0F", gradient: "linear-gradient(135deg,#fbc2eb,#a6c1ee)" },
  { emoji: "\u{1FAB3}", gradient: "linear-gradient(135deg,#fdcbf1,#e6dee9)" },
  { emoji: "\u{1F441}", gradient: "linear-gradient(135deg,#a1c4fd,#c2e9fb)" },
  { emoji: "\u{1F41B}", gradient: "linear-gradient(135deg,#d4fc79,#96e6a1)" },
  { emoji: "\u261D\uFE0F", gradient: "linear-gradient(135deg,#f6d365,#fda085)" },
  { emoji: "\u{1FAB3}", gradient: "linear-gradient(135deg,#ffecd2,#fcb69f)" },
  { emoji: "\u{1F441}", gradient: "linear-gradient(135deg,#89f7fe,#66a6ff)" },
  { emoji: "\u{1F41B}", gradient: "linear-gradient(135deg,#fddb92,#d1fdff)" },
];

interface TextDef {
  readonly font: string;
  readonly label: string;
}

const TEXT_FONTS: readonly TextDef[] = [
  { font: '"Fraunces", serif', label: "Fraunces" },
  { font: '"Space Grotesk", sans-serif', label: "Space Grotesk" },
  { font: '"Anton", sans-serif', label: "Anton" },
  { font: '"Caveat", cursive', label: "Caveat" },
  { font: '"Playfair Display", serif', label: "Playfair Display" },
  { font: '"Archivo Black", sans-serif', label: "Archivo Black" },
  { font: '"DM Serif Display", serif', label: "DM Serif Display" },
  { font: '"Bungee", sans-serif', label: "Bungee" },
];

export class GalleryPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly gridContainer: HTMLElement;
  private readonly toggleBtns: HTMLButtonElement[];
  private readonly stickerCards: HTMLElement[];
  private readonly textCards: HTMLElement[];
  private readonly textFontByCard = new WeakMap<HTMLElement, string>();
  private readonly boundMouseMoveHandlers = new Map<HTMLElement, (e: MouseEvent) => void>();
  private textSelectListeners: Array<(font: string) => void> = [];

  private galleryButton: HTMLElement | null = null;
  private isOpen = false;
  private currentMode: GalleryMode = "sticker";

  private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "glass-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "glass-panel";
    this.overlay.appendChild(this.panel);

    this.panel.appendChild(this.buildToggleSection());

    const gridSection = document.createElement("div");
    gridSection.className = "grid-section";
    this.gridContainer = document.createElement("div");
    this.gridContainer.className = "grid-container sticker-mode";

    const stickerGrid = document.createElement("div");
    stickerGrid.className = "sticker-grid";
    this.stickerCards = [];
    for (const def of STICKER_DEFS) {
      const card = this.buildStickerCard(def);
      this.stickerCards.push(card);
      stickerGrid.appendChild(card);
    }

    const textGrid = document.createElement("div");
    textGrid.className = "text-grid";
    this.textCards = [];
    for (const def of TEXT_FONTS) {
      const card = this.buildTextCard(def);
      this.textCards.push(card);
      textGrid.appendChild(card);
    }

    this.gridContainer.append(stickerGrid, textGrid);
    gridSection.appendChild(this.gridContainer);
    this.panel.appendChild(gridSection);

    this.toggleBtns = Array.from(this.panel.querySelectorAll<HTMLButtonElement>(".toggle-btn"));
  }

  attachTo(galleryButton: HTMLElement): void {
    this.galleryButton = galleryButton;
    document.body.appendChild(this.overlay);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add("open");
    if (this.galleryButton) {
      this.galleryButton.style.opacity = "0.6";
    }
    this.addEventListeners();
    this.replayCardAnimations();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("open");
    if (this.galleryButton) {
      this.galleryButton.style.opacity = "";
    }
    this.removeEventListeners();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getRoot(): HTMLElement {
    return this.overlay;
  }

  getMode(): GalleryMode {
    return this.currentMode;
  }

  setMode(mode: GalleryMode): void {
    this.currentMode = mode;
    for (const btn of this.toggleBtns) {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    }
    this.gridContainer.classList.remove("sticker-mode", "text-mode");
    this.gridContainer.classList.add(mode === "sticker" ? "sticker-mode" : "text-mode");
    this.replayCardAnimations();
  }

  onTextSelect(cb: (font: string) => void): () => void {
    this.textSelectListeners.push(cb);
    return () => {
      this.textSelectListeners = this.textSelectListeners.filter((l) => l !== cb);
    };
  }

  destroy(): void {
    this.close();
    this.removeMouseMoveHandlers();
    this.overlay.remove();
  }

  private buildToggleSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "toggle-section";

    const group = document.createElement("div");
    group.className = "toggle-group";

    const stickerBtn = document.createElement("button");
    stickerBtn.type = "button";
    stickerBtn.className = "toggle-btn active";
    stickerBtn.dataset.mode = "sticker";
    stickerBtn.textContent = "Sticker";

    const textBtn = document.createElement("button");
    textBtn.type = "button";
    textBtn.className = "toggle-btn";
    textBtn.dataset.mode = "text";
    textBtn.textContent = "Text";

    stickerBtn.addEventListener("click", () => this.setMode("sticker"));
    textBtn.addEventListener("click", () => this.setMode("text"));

    group.append(stickerBtn, textBtn);
    section.appendChild(group);
    return section;
  }

  private buildStickerCard(def: StickerDef): HTMLElement {
    const card = document.createElement("div");
    card.className = "sticker-card";

    const placeholder = document.createElement("div");
    placeholder.className = "sticker-placeholder";
    placeholder.style.background = def.gradient;
    placeholder.textContent = def.emoji;

    card.appendChild(placeholder);

    const onMouseMove = (e: MouseEvent): void => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      card.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    card.addEventListener("mousemove", onMouseMove);
    this.boundMouseMoveHandlers.set(card, onMouseMove);

    return card;
  }

  private buildTextCard(def: TextDef): HTMLElement {
    const card = document.createElement("div");
    card.className = "text-card";
    card.dataset.textFont = def.font;

    const p = document.createElement("p");
    p.textContent = def.label;
    p.style.fontFamily = def.font;
    card.appendChild(p);

    this.textFontByCard.set(card, def.font);

    card.addEventListener("click", () => {
      for (const listener of this.textSelectListeners) listener(def.font);
    });

    return card;
  }

  private replayCardAnimations(): void {
    const cards = this.gridContainer.querySelectorAll<HTMLElement>(".sticker-card, .text-card");
    cards.forEach((card) => {
      card.style.animation = "none";
      requestAnimationFrame(() => {
        card.style.animation = "";
      });
    });
  }

  private addEventListeners(): void {
    this.boundOnDocumentClick = (e: MouseEvent) => {
      if (
        !this.overlay.contains(e.target as Node) &&
        !this.galleryButton?.contains(e.target as Node)
      ) {
        this.close();
      }
    };

    this.boundOnKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.close();
      }
    };

    document.addEventListener("click", this.boundOnDocumentClick, true);
    document.addEventListener("keydown", this.boundOnKeyDown);
  }

  private removeEventListeners(): void {
    if (this.boundOnDocumentClick) {
      document.removeEventListener("click", this.boundOnDocumentClick, true);
      this.boundOnDocumentClick = null;
    }
    if (this.boundOnKeyDown) {
      document.removeEventListener("keydown", this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
  }

  private removeMouseMoveHandlers(): void {
    for (const [card, handler] of this.boundMouseMoveHandlers) {
      card.removeEventListener("mousemove", handler);
    }
    this.boundMouseMoveHandlers.clear();
  }
}
