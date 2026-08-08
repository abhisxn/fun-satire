import "./protestPanel.css";
import { buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl } from "./shareLinks";
import {
  HERO_VIDEO,
  GALLERY_ENTRIES,
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  type GalleryEntry,
  type VideoEntry,
  type SourceEntry,
} from "./protestContent";

const SVG_YOUTUBE_PLAY = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="5" fill="#FF0000"/><path d="M8 6.5L14 10L8 13.5V6.5Z" fill="#fff"/></svg>`;

const HONEST_NOTE = "I made this as a toy. There's a real movement behind it.";
const JOIN_URL = "https://www.thecockroachjantaparty.org.in/join";
const SHARE_MESSAGE = "I just stood with the crowd. Come see for yourself.";

export class ProtestPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private protestButton: HTMLElement | null = null;
  private isOpen = false;

  private nativeShareBtn: HTMLButtonElement | null = null;
  private copiedFeedbackTimeout: number | null = null;

  private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "protest-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "protest-panel";
    this.overlay.appendChild(this.panel);

    this.panel.appendChild(this.buildNoteSection());
    this.panel.appendChild(this.buildJoinSection());
    this.panel.appendChild(this.buildGallerySection());
    this.panel.appendChild(this.buildShareSection());
  }

  attachTo(protestButton: HTMLElement): void {
    this.protestButton = protestButton;
    document.body.appendChild(this.overlay);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add("open");
    this.addEventListeners();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("open");
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

  destroy(): void {
    this.close();
    if (this.copiedFeedbackTimeout !== null) {
      window.clearTimeout(this.copiedFeedbackTimeout);
    }
    this.overlay.remove();
  }

  private buildNoteSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-note";
    const p = document.createElement("p");
    p.textContent = HONEST_NOTE;
    section.appendChild(p);
    return section;
  }

  private buildJoinSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-join";
    const link = document.createElement("a");
    link.className = "protest-rich-btn protest-join-link";
    link.href = JOIN_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "protest-rich-btn-icon";
    icon.textContent = "🪳";
    const label = document.createElement("span");
    label.className = "protest-rich-btn-label";
    label.textContent = "Join the Swarm";
    link.append(icon, label);

    section.appendChild(link);
    return section;
  }

  private buildGallerySection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-gallery";

    const heading = document.createElement("h3");
    heading.textContent = "Learn more";
    section.appendChild(heading);

    section.appendChild(this.buildVideoTile(HERO_VIDEO, true));

    const grid = document.createElement("div");
    grid.className = "protest-gallery-grid";
    for (const entry of GALLERY_ENTRIES) {
      grid.appendChild(this.buildGalleryTile(entry));
    }
    section.appendChild(grid);

    return section;
  }

  private buildGalleryTile(entry: GalleryEntry): HTMLElement {
    return entry.kind === "video" ? this.buildVideoTile(entry, false) : this.buildSourceTile(entry);
  }

  private buildVideoTile(entry: VideoEntry, isHero: boolean): HTMLElement {
    const link = document.createElement("a");
    link.className = isHero ? "protest-tile protest-tile--hero" : "protest-tile protest-tile--video";
    link.href = buildYouTubeWatchUrl(entry.videoId);
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "protest-tile-thumb";
    img.src = buildYouTubeThumbnailUrl(entry.videoId);
    img.alt = entry.title;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      this.replaceWithFallbackCard(link, entry.title);
    });
    link.appendChild(img);

    const badge = document.createElement("span");
    badge.className = "protest-tile-badge";
    badge.innerHTML = SVG_YOUTUBE_PLAY;
    link.appendChild(badge);

    const caption = document.createElement("div");
    caption.className = "protest-tile-caption";
    const titleEl = document.createElement("span");
    titleEl.className = "protest-tile-title";
    titleEl.textContent = entry.title;
    const channelEl = document.createElement("span");
    channelEl.className = "protest-tile-channel";
    channelEl.textContent = entry.channel;
    caption.append(titleEl, channelEl);
    link.appendChild(caption);

    return link;
  }

  private buildSourceTile(entry: SourceEntry): HTMLElement {
    const link = document.createElement("a");
    link.className = "protest-tile protest-tile--source";
    link.href = entry.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "protest-tile-icon";
    icon.textContent = entry.icon;
    link.appendChild(icon);

    const label = document.createElement("span");
    label.className = "protest-tile-label";
    label.textContent = entry.label;
    link.appendChild(label);

    return link;
  }

  private replaceWithFallbackCard(link: HTMLAnchorElement, title: string): void {
    link.classList.remove("protest-tile--video");
    link.classList.add("protest-tile--source");
    link.innerHTML = "";

    const icon = document.createElement("span");
    icon.className = "protest-tile-icon";
    icon.textContent = "▶";
    link.appendChild(icon);

    const label = document.createElement("span");
    label.className = "protest-tile-label";
    label.textContent = title;
    link.appendChild(label);
  }

  private buildShareSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-share";

    const heading = document.createElement("h3");
    heading.textContent = "Share";
    section.appendChild(heading);

    const buttonRow = document.createElement("div");
    buttonRow.className = "protest-share-buttons";

    const url = window.location.href;

    const whatsappBtn = document.createElement("a");
    whatsappBtn.className = "protest-share-btn protest-share-btn--whatsapp";
    whatsappBtn.textContent = "WhatsApp";
    whatsappBtn.target = "_blank";
    whatsappBtn.rel = "noopener noreferrer";
    whatsappBtn.href = buildWhatsAppShareUrl(SHARE_MESSAGE, url);

    const facebookBtn = document.createElement("a");
    facebookBtn.className = "protest-share-btn protest-share-btn--facebook";
    facebookBtn.textContent = "Facebook";
    facebookBtn.target = "_blank";
    facebookBtn.rel = "noopener noreferrer";
    facebookBtn.href = buildFacebookShareUrl(url);

    const redditBtn = document.createElement("a");
    redditBtn.className = "protest-share-btn protest-share-btn--reddit";
    redditBtn.textContent = "Reddit";
    redditBtn.target = "_blank";
    redditBtn.rel = "noopener noreferrer";
    redditBtn.href = buildRedditShareUrl(url, SHARE_MESSAGE);

    const nativeBtn = document.createElement("button");
    nativeBtn.type = "button";
    nativeBtn.className = "protest-share-btn protest-share-btn--native";
    nativeBtn.textContent = "Share";
    nativeBtn.addEventListener("click", () => {
      void this.handleNativeShare();
    });
    this.nativeShareBtn = nativeBtn;

    buttonRow.append(whatsappBtn, facebookBtn, redditBtn, nativeBtn);
    section.appendChild(buttonRow);
    return section;
  }

  private async handleNativeShare(): Promise<void> {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: SHARE_MESSAGE, text: SHARE_MESSAGE, url });
      } catch {
        // user cancelled or share failed — not an error, no feedback needed
      }
      return;
    }
    await this.copyLinkFallback(url);
  }

  private async copyLinkFallback(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.showCopiedFeedback();
    } catch {
      // clipboard unavailable — button remains usable, nothing further to do
    }
  }

  private showCopiedFeedback(): void {
    if (!this.nativeShareBtn) return;
    this.nativeShareBtn.textContent = "Link copied!";
    if (this.copiedFeedbackTimeout !== null) {
      window.clearTimeout(this.copiedFeedbackTimeout);
    }
    this.copiedFeedbackTimeout = window.setTimeout(() => {
      if (this.nativeShareBtn) this.nativeShareBtn.textContent = "Share";
    }, 2000);
  }

  private addEventListeners(): void {
    this.boundOnDocumentClick = (e: MouseEvent) => {
      if (
        !this.panel.contains(e.target as Node) &&
        !this.protestButton?.contains(e.target as Node)
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
}
