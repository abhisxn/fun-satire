import "./protestPanel.css";
import { buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl } from "./shareLinks";

interface LearnMoreLink {
  readonly href: string;
  readonly label: string;
}

const HONEST_NOTE = "I made this as a toy. There's a real movement behind it.";
const JOIN_URL = "https://www.thecockroachjantaparty.org.in/join";
const SHARE_MESSAGE = "I just stood with the crowd. Come see for yourself.";

const LEARN_MORE_LINKS: readonly LearnMoreLink[] = [
  { href: "https://www.thecockroachjantaparty.org.in/voice", label: "Voice of the Swarm (CJP)" },
  { href: "https://andhbhakt.org/", label: "Andhbhakt — PIB vs CAG tracker" },
  { href: "https://www.youtube.com/@SarthakGoswamii", label: "Sarthak Goswami" },
  { href: "https://www.youtube.com/@UNFILTEREDbySamdish", label: "Unfiltered by Samdish" },
  { href: "https://www.newslaundry.com/", label: "Newslaundry" },
  { href: "https://www.youtube.com/@ravishkumar.official", label: "Ravish Kumar" },
  { href: "https://www.youtube.com/c/thedeshbhakt", label: "The Deshbhakt" },
  { href: "https://www.youtube.com/@beinghonest/videos", label: "Being Honest" },
];

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
    this.panel.appendChild(this.buildLearnMoreSection());
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
    link.className = "protest-join-link";
    link.href = JOIN_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Join the Swarm";
    section.appendChild(link);
    return section;
  }

  private buildLearnMoreSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "protest-learn";

    const heading = document.createElement("h3");
    heading.textContent = "Learn more";
    section.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "protest-learn-list";
    for (const def of LEARN_MORE_LINKS) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = def.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = def.label;
      item.appendChild(link);
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
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
