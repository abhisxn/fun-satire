// src/hud/WinPanel.ts
import "./winPanel.css";
import { pickWinCopy, type WinCopyVariant } from "./winCopy";
import {
  buildWhatsAppShareUrl,
  buildFacebookShareUrl,
  buildInstagramDeepLink,
  buildInstagramWebUrl,
  isMobileUserAgent,
} from "./shareLinks";

const SVG_CLOSE = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const SVG_WHATSAPP = `<svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#25D366"/><path d="M11 5a6.2 6.2 0 00-5.35 9.34L4.8 17.2l3.16-.83A6.2 6.2 0 1011 5zm3.6 8.5c-.16.46-.96.9-1.32.93-.36.03-.69.16-2.32-.48-1.95-.76-3.22-2.73-3.32-2.86-.1-.13-.8-1.04-.8-1.99 0-.94.5-1.4.68-1.6.18-.2.39-.25.52-.25l.38.01c.12.01.28-.04.44.34.16.4.55 1.38.6 1.48.05.1.09.22.02.35-.07.13-.1.22-.2.33-.1.12-.2.26-.3.35-.1.1-.2.2-.09.4.12.2.51.84 1.09 1.36.75.67 1.38.88 1.58.98.19.1.31.08.42-.05.12-.13.49-.57.62-.77.13-.2.26-.17.44-.1.18.07 1.14.54 1.34.64.2.1.33.15.38.23.05.08.05.47-.11.93z" fill="#fff"/></svg>`;
const SVG_FACEBOOK = `<svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#1877F2"/><path d="M13.2 11.3h-1.6v5.4h-2.2v-5.4H8.2V9.4h1.2V8.2c0-1.5.7-2.6 2.5-2.6h1.7v1.9h-1.1c-.5 0-.6.3-.6.7v1.2h1.7l-.2 1.9z" fill="#fff"/></svg>`;
const SVG_INSTAGRAM = `<svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="win-ig-grad" x1="0" y1="22" x2="22" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset="0.4" stop-color="#D62976"/><stop offset="0.7" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><circle cx="11" cy="11" r="11" fill="url(#win-ig-grad)"/><rect x="6" y="6" width="10" height="10" rx="3" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="11" cy="11" r="2.6" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="14.2" cy="7.8" r="0.7" fill="#fff"/></svg>`;
const SVG_SHARE = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13.5" cy="4.5" r="2.3" stroke="currentColor" stroke-width="1.4"/><circle cx="4.5" cy="9" r="2.3" stroke="currentColor" stroke-width="1.4"/><circle cx="13.5" cy="13.5" r="2.3" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 7.8L11.5 5.3M6.5 10.2L11.5 12.7" stroke="currentColor" stroke-width="1.4"/></svg>`;

const AUTO_DISMISS_MS = 7000;

const SHARE_MESSAGE =
  "I dropped them into the crowd — eyes, fingers, cockroaches, and placards closed in. This is Gutter Generation. Come try it.";

export class WinPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly copyEl: HTMLElement;
  private isOpen = false;
  private nextStickerCb: (() => void) | null = null;

  private toastEl!: HTMLElement;
  private toastTimeout: number | null = null;
  private instagramFallbackTimeout: number | null = null;
  private autoDismissTimeout: number | null = null;
  private readonly nativeShare: ((data: ShareData) => Promise<void>) | undefined = (
    navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  ).share?.bind(navigator);

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "win-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "win-panel";
    this.overlay.appendChild(this.panel);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "win-panel-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = SVG_CLOSE;
    closeBtn.addEventListener("click", () => this.hide());
    this.panel.appendChild(closeBtn);

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "win-panel-title";
    this.panel.appendChild(this.titleEl);

    this.copyEl = document.createElement("p");
    this.copyEl.className = "win-panel-copy";
    this.panel.appendChild(this.copyEl);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "win-panel-next-btn";
    nextBtn.textContent = "Next random sticker";
    nextBtn.addEventListener("click", () => {
      this.nextStickerCb?.();
      this.hide();
    });
    this.panel.appendChild(nextBtn);

    this.panel.appendChild(this.buildShareRow());

    this.toastEl = document.createElement("div");
    this.toastEl.className = "win-panel-toast";
    this.panel.appendChild(this.toastEl);
  }

  private buildShareRow(): HTMLElement {
    const row = document.createElement("div");
    row.className = "win-panel-share-row";

    const url = window.location.href;

    if (this.nativeShare) {
      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "win-panel-share-icon-btn win-panel-share-icon-btn--native";
      shareBtn.setAttribute("aria-label", "Share");
      shareBtn.innerHTML = SVG_SHARE;
      shareBtn.addEventListener("click", () => {
        void this.handleNativeShare();
      });
      row.appendChild(shareBtn);
    } else {
      const whatsappBtn = document.createElement("a");
      whatsappBtn.className = "win-panel-share-icon-btn win-panel-share-icon-btn--whatsapp";
      whatsappBtn.href = buildWhatsAppShareUrl(SHARE_MESSAGE, url);
      whatsappBtn.target = "_blank";
      whatsappBtn.rel = "noopener noreferrer";
      whatsappBtn.setAttribute("aria-label", "Share on WhatsApp");
      whatsappBtn.innerHTML = SVG_WHATSAPP;

      const facebookBtn = document.createElement("a");
      facebookBtn.className = "win-panel-share-icon-btn win-panel-share-icon-btn--facebook";
      facebookBtn.href = buildFacebookShareUrl(url);
      facebookBtn.target = "_blank";
      facebookBtn.rel = "noopener noreferrer";
      facebookBtn.setAttribute("aria-label", "Share on Facebook");
      facebookBtn.innerHTML = SVG_FACEBOOK;

      const instagramBtn = document.createElement("button");
      instagramBtn.type = "button";
      instagramBtn.className = "win-panel-share-icon-btn win-panel-share-icon-btn--instagram";
      instagramBtn.setAttribute("aria-label", "Share on Instagram");
      instagramBtn.innerHTML = SVG_INSTAGRAM;
      instagramBtn.addEventListener("click", () => {
        void this.handleInstagramShare();
      });

      row.append(whatsappBtn, facebookBtn, instagramBtn);
    }

    const copyLinkBtn = document.createElement("button");
    copyLinkBtn.type = "button";
    copyLinkBtn.className = "win-panel-copy-link-btn";
    copyLinkBtn.textContent = "Copy link";
    copyLinkBtn.addEventListener("click", () => {
      void this.handleCopyLink();
    });
    row.appendChild(copyLinkBtn);

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

  private async handleCopyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.showToast("Link copied!");
    } catch {
      // clipboard unavailable — silently no-op, no crash
    }
  }

  private showToast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add("visible");
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = window.setTimeout(() => {
      this.toastEl.classList.remove("visible");
    }, 2500);
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.overlay);
  }

  show(variant: WinCopyVariant = pickWinCopy()): void {
    this.titleEl.textContent = variant.title;
    this.copyEl.textContent = variant.copy;
    this.isOpen = true;
    this.overlay.classList.add("open");
    this.clearAutoDismiss();
    this.autoDismissTimeout = window.setTimeout(() => this.hide(), AUTO_DISMISS_MS);
  }

  hide(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("open");
    this.clearAutoDismiss();
  }

  private clearAutoDismiss(): void {
    if (this.autoDismissTimeout !== null) {
      window.clearTimeout(this.autoDismissTimeout);
      this.autoDismissTimeout = null;
    }
  }

  isPanelOpen(): boolean {
    return this.isOpen;
  }

  onNextSticker(cb: () => void): void {
    this.nextStickerCb = cb;
  }

  getRoot(): HTMLElement {
    return this.overlay;
  }

  destroy(): void {
    this.clearAutoDismiss();
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }
    if (this.instagramFallbackTimeout !== null) {
      window.clearTimeout(this.instagramFallbackTimeout);
    }
    this.overlay.remove();
  }
}
