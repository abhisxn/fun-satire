import "./protestPanel.css";
import {
  buildWhatsAppShareUrl,
  buildFacebookShareUrl,
  buildInstagramDeepLink,
  buildInstagramWebUrl,
  isMobileUserAgent,
} from "./shareLinks";
import {
  HERO_VIDEO,
  GALLERY_ENTRIES,
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  type VideoEntry,
  type SourceEntry,
} from "./protestContent";

const SVG_YOUTUBE_PLAY = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="5" fill="#FF0000"/><path d="M8 6.5L14 10L8 13.5V6.5Z" fill="#fff"/></svg>`;
const SVG_WHATSAPP = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#25D366"/><path d="M11 5a6.2 6.2 0 00-5.35 9.34L4.8 17.2l3.16-.83A6.2 6.2 0 1011 5zm3.6 8.5c-.16.46-.96.9-1.32.93-.36.03-.69.16-2.32-.48-1.95-.76-3.22-2.73-3.32-2.86-.1-.13-.8-1.04-.8-1.99 0-.94.5-1.4.68-1.6.18-.2.39-.25.52-.25l.38.01c.12.01.28-.04.44.34.16.4.55 1.38.6 1.48.05.1.09.22.02.35-.07.13-.1.22-.2.33-.1.12-.2.26-.3.35-.1.1-.2.2-.09.4.12.2.51.84 1.09 1.36.75.67 1.38.88 1.58.98.19.1.31.08.42-.05.12-.13.49-.57.62-.77.13-.2.26-.17.44-.1.18.07 1.14.54 1.34.64.2.1.33.15.38.23.05.08.05.47-.11.93z" fill="#fff"/></svg>`;
const SVG_FACEBOOK = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#1877F2"/><path d="M13.2 11.3h-1.6v5.4h-2.2v-5.4H8.2V9.4h1.2V8.2c0-1.5.7-2.6 2.5-2.6h1.7v1.9h-1.1c-.5 0-.6.3-.6.7v1.2h1.7l-.2 1.9z" fill="#fff"/></svg>`;
const SVG_INSTAGRAM = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="protest-ig-grad" x1="0" y1="22" x2="22" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset="0.4" stop-color="#D62976"/><stop offset="0.7" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><circle cx="11" cy="11" r="11" fill="url(#protest-ig-grad)"/><rect x="6" y="6" width="10" height="10" rx="3" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="11" cy="11" r="2.6" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="14.2" cy="7.8" r="0.7" fill="#fff"/></svg>`;
const SVG_SHARE = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13.5" cy="4.5" r="2.3" stroke="#fff" stroke-width="1.4"/><circle cx="4.5" cy="9" r="2.3" stroke="#fff" stroke-width="1.4"/><circle cx="13.5" cy="13.5" r="2.3" stroke="#fff" stroke-width="1.4"/><path d="M6.5 7.8L11.5 5.3M6.5 10.2L11.5 12.7" stroke="#fff" stroke-width="1.4"/></svg>`;

const HONEST_NOTE =
  "A crowd that watches back. No leader to arrest. No face to blame — just people, staying informed and staying loud.";
const SHARE_MESSAGE = "I just stood with the crowd. Come see for yourself.";

const INFORMED_CITIZEN_TIPS = [
  "Check before you share — a screenshot isn't a source.",
  "Follow reporters directly. Algorithms bury the ones that matter.",
  "Cross-check big claims against more than one outlet.",
  "Vote for your local representative — not just one face on a poster.",
  "Question those in power. Accountability doesn't end at the ballot box.",
  "Stay united — division is the easiest propaganda to sell.",
  "Show up, keep showing up. Attention is what keeps power honest.",
];

export class ProtestPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private protestButton: HTMLElement | null = null;
  private isOpen = false;

  private readonly nativeShare: ((data: ShareData) => Promise<void>) | undefined = (
    navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  ).share?.bind(navigator);
  private toastEl: HTMLElement | null = null;
  private toastTimeout: number | null = null;
  private instagramFallbackTimeout: number | null = null;

  private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "protest-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "protest-panel";
    this.overlay.appendChild(this.panel);

    this.panel.appendChild(this.buildNoteSection());
    this.panel.appendChild(this.buildInformedCitizenSection());
    this.panel.appendChild(this.buildShareSection());
    this.panel.appendChild(this.buildFooter());
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
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    if (this.instagramFallbackTimeout !== null) {
      window.clearTimeout(this.instagramFallbackTimeout);
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

  private buildInformedCitizenSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-informed";

    const heading = document.createElement("h3");
    heading.textContent = "How to Be a More Informed Citizen";
    section.appendChild(heading);

    const tips = document.createElement("ul");
    tips.className = "protest-tips";
    for (const tip of INFORMED_CITIZEN_TIPS) {
      const item = document.createElement("li");
      item.textContent = tip;
      tips.appendChild(item);
    }
    section.appendChild(tips);

    const videoEntries: VideoEntry[] = [HERO_VIDEO, ...GALLERY_ENTRIES.filter((e) => e.kind === "video")];
    const sourceEntries: SourceEntry[] = GALLERY_ENTRIES.filter(
      (e): e is SourceEntry => e.kind === "source",
    );

    const videosLabel = document.createElement("h4");
    videosLabel.className = "protest-gallery-label";
    videosLabel.textContent = "Videos";
    section.appendChild(videosLabel);

    const videoList = document.createElement("div");
    videoList.className = "protest-gallery-list";
    for (const entry of videoEntries) {
      videoList.appendChild(this.buildVideoTile(entry));
    }
    section.appendChild(videoList);

    const outletsLabel = document.createElement("h4");
    outletsLabel.className = "protest-gallery-label";
    outletsLabel.textContent = "Independent Outlets";
    section.appendChild(outletsLabel);

    const outletList = document.createElement("div");
    outletList.className = "protest-gallery-list";
    for (const entry of sourceEntries) {
      outletList.appendChild(this.buildSourceTile(entry));
    }
    section.appendChild(outletList);

    return section;
  }

  private buildVideoTile(entry: VideoEntry): HTMLElement {
    const link = document.createElement("a");
    link.className = "protest-tile protest-tile--video";
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

    section.appendChild(this.nativeShare ? this.buildPrimaryShareButton() : this.buildFallbackShareRow());

    this.toastEl = document.createElement("div");
    this.toastEl.className = "protest-toast";
    section.appendChild(this.toastEl);

    return section;
  }

  private buildPrimaryShareButton(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "protest-rich-btn protest-share-primary";

    const icon = document.createElement("span");
    icon.className = "protest-rich-btn-icon";
    icon.innerHTML = SVG_SHARE;
    const label = document.createElement("span");
    label.className = "protest-rich-btn-label";
    label.textContent = "Share";
    btn.append(icon, label);

    btn.addEventListener("click", () => {
      void this.handleNativeShare();
    });
    return btn;
  }

  private buildFallbackShareRow(): HTMLElement {
    const row = document.createElement("div");
    row.className = "protest-share-fallback-row";

    const url = window.location.href;

    const whatsappBtn = document.createElement("a");
    whatsappBtn.className = "protest-share-icon-btn protest-share-icon-btn--whatsapp";
    whatsappBtn.href = buildWhatsAppShareUrl(SHARE_MESSAGE, url);
    whatsappBtn.target = "_blank";
    whatsappBtn.rel = "noopener noreferrer";
    whatsappBtn.setAttribute("aria-label", "Share on WhatsApp");
    whatsappBtn.innerHTML = SVG_WHATSAPP;

    const facebookBtn = document.createElement("a");
    facebookBtn.className = "protest-share-icon-btn protest-share-icon-btn--facebook";
    facebookBtn.href = buildFacebookShareUrl(url);
    facebookBtn.target = "_blank";
    facebookBtn.rel = "noopener noreferrer";
    facebookBtn.setAttribute("aria-label", "Share on Facebook");
    facebookBtn.innerHTML = SVG_FACEBOOK;

    const instagramBtn = document.createElement("button");
    instagramBtn.type = "button";
    instagramBtn.className = "protest-share-icon-btn protest-share-icon-btn--instagram";
    instagramBtn.setAttribute("aria-label", "Share on Instagram");
    instagramBtn.innerHTML = SVG_INSTAGRAM;
    instagramBtn.addEventListener("click", () => {
      void this.handleInstagramShare();
    });

    row.append(whatsappBtn, facebookBtn, instagramBtn);
    return row;
  }

  private async handleNativeShare(): Promise<void> {
    if (!this.nativeShare) return;
    const url = window.location.href;
    try {
      await this.nativeShare({ title: SHARE_MESSAGE, text: SHARE_MESSAGE, url });
    } catch {
      // user cancelled or share failed — not an error, no feedback needed
    }
  }

  private async handleInstagramShare(): Promise<void> {
    const url = window.location.href;
    const clipboardWrite = navigator.clipboard.writeText(url).catch(() => {
      // clipboard unavailable — still attempt to open Instagram
    });

    if (isMobileUserAgent(navigator.userAgent)) {
      window.open(buildInstagramDeepLink(), "_self");
      if (this.instagramFallbackTimeout !== null) {
        window.clearTimeout(this.instagramFallbackTimeout);
      }
      this.instagramFallbackTimeout = window.setTimeout(() => {
        window.open(buildInstagramWebUrl(), "_blank", "noopener,noreferrer");
      }, 1200);
    } else {
      window.open(buildInstagramWebUrl(), "_blank", "noopener,noreferrer");
    }

    await clipboardWrite;
    this.showToast("Link copied — paste it into your story!");
  }

  private showToast(message: string): void {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add("visible");
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      this.toastEl?.classList.remove("visible");
    }, 2500);
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

  private buildFooter(): HTMLElement {
    const footer = document.createElement("div");
    footer.className = "protest-footer";
    footer.textContent = "© thatguyabhishek";
    return footer;
  }
}
