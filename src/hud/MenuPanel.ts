import "./menuPanel.css";
import {
  buildWhatsAppShareUrl,
  buildFacebookShareUrl,
  buildInstagramDeepLink,
  buildInstagramWebUrl,
  isMobileUserAgent,
} from "./shareLinks";
import {
  GALLERY_ENTRIES,
  buildYouTubeThumbnailUrl,
  buildYouTubeWatchUrl,
  shuffleVideos,
  type VideoEntry,
  type SourceEntry,
} from "./menuContent";

const SVG_YOUTUBE_PLAY = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" rx="5" fill="#FF0000"/><path d="M8 6.5L14 10L8 13.5V6.5Z" fill="#fff"/></svg>`;
const SVG_WHATSAPP = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#25D366"/><path d="M11 5a6.2 6.2 0 00-5.35 9.34L4.8 17.2l3.16-.83A6.2 6.2 0 1011 5zm3.6 8.5c-.16.46-.96.9-1.32.93-.36.03-.69.16-2.32-.48-1.95-.76-3.22-2.73-3.32-2.86-.1-.13-.8-1.04-.8-1.99 0-.94.5-1.4.68-1.6.18-.2.39-.25.52-.25l.38.01c.12.01.28-.04.44.34.16.4.55 1.38.6 1.48.05.1.09.22.02.35-.07.13-.1.22-.2.33-.1.12-.2.26-.3.35-.1.1-.2.2-.09.4.12.2.51.84 1.09 1.36.75.67 1.38.88 1.58.98.19.1.31.08.42-.05.12-.13.49-.57.62-.77.13-.2.26-.17.44-.1.18.07 1.14.54 1.34.64.2.1.33.15.38.23.05.08.05.47-.11.93z" fill="#fff"/></svg>`;
const SVG_FACEBOOK = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="11" fill="#1877F2"/><path d="M13.2 11.3h-1.6v5.4h-2.2v-5.4H8.2V9.4h1.2V8.2c0-1.5.7-2.6 2.5-2.6h1.7v1.9h-1.1c-.5 0-.6.3-.6.7v1.2h1.7l-.2 1.9z" fill="#fff"/></svg>`;
const SVG_INSTAGRAM = `<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="menu-ig-grad" x1="0" y1="22" x2="22" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset="0.4" stop-color="#D62976"/><stop offset="0.7" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><circle cx="11" cy="11" r="11" fill="url(#menu-ig-grad)"/><rect x="6" y="6" width="10" height="10" rx="3" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="11" cy="11" r="2.6" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="14.2" cy="7.8" r="0.7" fill="#fff"/></svg>`;
const SVG_SHARE = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13.5" cy="4.5" r="2.3" stroke="#fff" stroke-width="1.4"/><circle cx="4.5" cy="9" r="2.3" stroke="#fff" stroke-width="1.4"/><circle cx="13.5" cy="13.5" r="2.3" stroke="#fff" stroke-width="1.4"/><path d="M6.5 7.8L11.5 5.3M6.5 10.2L11.5 12.7" stroke="#fff" stroke-width="1.4"/></svg>`;
const SVG_ARROW = `<svg viewBox="0 0 13.5 11.0459" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0.75 4.77297C0.335786 4.77297 0 5.10876 0 5.52297C0 5.93718 0.335786 6.27297 0.75 6.27297V5.52297V4.77297ZM13.2803 6.0533C13.5732 5.76041 13.5732 5.28553 13.2803 4.99264L8.50736 0.21967C8.21447 -0.0732231 7.73959 -0.0732231 7.4467 0.21967C7.15381 0.512564 7.15381 0.987437 7.4467 1.28033L11.6893 5.52297L7.4467 9.76561C7.15381 10.0585 7.15381 10.5334 7.4467 10.8263C7.73959 11.1192 8.21447 11.1192 8.50736 10.8263L13.2803 6.0533ZM0.75 5.52297V6.27297H12.75V5.52297V4.77297H0.75V5.52297Z"/></svg>`;

const MENU_TITLE = "A crowd that watches back";
const MENU_COPY =
  "No leader to arrest. No face to blame — just thousands of us, and we're not going anywhere.";
const SHARE_PROMPT =
  "Every share adds one more eye, one more finger, one more cockroach, one more placard to the crowd. Gutter Generation only grows when you share it.";
const SHARE_MESSAGE =
  "I dropped them into the crowd — eyes, fingers, cockroaches, and placards closed in. This is Gutter Generation. Come try it.";

const INFORMED_CITIZEN_INTRO = "A protest gets you heard once. What you do after is what keeps you heard.";

const INFORMED_CITIZEN_TIPS = [
  "Check before you share — a screenshot isn't a source.",
  "Follow reporters directly. Algorithms bury the ones that matter.",
  "Cross-check big claims against more than one outlet.",
  "Vote, and vote wisely — for your local representative, on their record, not one face on a poster.",
  "Question authorities and agencies, always. They exist to serve you, not the other way round.",
  "Make room for discussion, not fights. Disagreement isn't the enemy; contempt is.",
  "Stay united — division is the easiest propaganda to sell.",
  "Show up, and keep showing up. Attention is what keeps power honest.",
];

type MenuScreen = "menu" | "about" | "informed" | "media" | "resources";

export class MenuPanel {
  private readonly overlay: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private menuButton: HTMLElement | null = null;
  private isOpen = false;
  private screen: MenuScreen = "menu";

  private readonly nativeShare: ((data: ShareData) => Promise<void>) | undefined = (
    navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  ).share?.bind(navigator);
  private toastEl: HTMLElement | null = null;
  private toastTimeout: number | null = null;
  private instagramFallbackTimeout: number | null = null;
  private openChangeCb: ((open: boolean) => void) | null = null;

  private boundOnDocumentClick: ((e: MouseEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.overlay = document.createElement("div");
    this.overlay.className = "menu-panel-overlay";

    this.panel = document.createElement("div");
    this.panel.className = "menu-panel";
    this.overlay.appendChild(this.panel);

    this.body = document.createElement("div");
    this.body.className = "menu-panel-body";
    this.panel.appendChild(this.body);
    this.panel.appendChild(this.buildFooter());

    this.navigateTo("menu");
  }

  private navigateTo(screen: MenuScreen): void {
    this.screen = screen;
    this.body.innerHTML = "";
    const content =
      this.screen === "menu"
        ? this.buildMenuScreen()
        : this.screen === "about"
          ? this.buildAboutScreen()
          : this.screen === "informed"
            ? this.buildInformedScreen()
            : this.screen === "media"
              ? this.buildMediaScreen()
              : this.buildResourcesScreen();
    this.body.appendChild(content);
  }

  attachTo(menuButton: HTMLElement): void {
    this.menuButton = menuButton;
    document.body.appendChild(this.overlay);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.classList.add("open");
    this.addEventListeners();
    this.openChangeCb?.(true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.classList.remove("open");
    this.removeEventListeners();
    this.openChangeCb?.(false);
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  isPanelOpen(): boolean {
    return this.isOpen;
  }

  onOpenChange(cb: (open: boolean) => void): void {
    this.openChangeCb = cb;
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

  private buildMenuTextBlock(): HTMLElement {
    const block = document.createElement("div");
    block.className = "menu-panel-home-text";

    const title = document.createElement("h2");
    title.className = "menu-panel-home-title";
    title.textContent = MENU_TITLE;
    block.appendChild(title);

    const copy = document.createElement("p");
    copy.className = "menu-panel-home-copy";
    copy.textContent = MENU_COPY;
    block.appendChild(copy);

    return block;
  }

  private buildMenuScreen(): HTMLElement {
    const container = document.createElement("div");
    container.className = "menu-panel-home";

    container.appendChild(this.buildMenuTextBlock());

    const quickLinksBlock = document.createElement("div");
    quickLinksBlock.className = "menu-quick-links-block";

    const quickLinksLabel = document.createElement("div");
    quickLinksLabel.className = "menu-section-label menu-section-label--quick-links";
    quickLinksLabel.textContent = "Quick Links";
    quickLinksBlock.appendChild(quickLinksLabel);

    const quickLinks = document.createElement("div");
    quickLinks.className = "menu-quick-links";
    const links: Array<[string, MenuScreen]> = [
      ["About Project", "about"],
      ["Be a More Informed Citizen", "informed"],
      ["Support Independent Media", "media"],
      ["Other Resources", "resources"],
    ];
    for (const [label, screen] of links) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-quick-link";

      const labelEl = document.createElement("span");
      labelEl.className = "menu-quick-link-label";
      labelEl.textContent = label;
      btn.appendChild(labelEl);

      const arrow = document.createElement("span");
      arrow.className = "menu-quick-link-arrow";
      arrow.innerHTML = SVG_ARROW;
      btn.appendChild(arrow);

      btn.addEventListener("click", () => {
        this.navigateTo(screen);
      });
      quickLinks.appendChild(btn);
    }
    quickLinksBlock.appendChild(quickLinks);
    container.appendChild(quickLinksBlock);

    container.appendChild(this.buildShareSection());

    return container;
  }

  private buildSubScreen(heading: string, content: HTMLElement): HTMLElement {
    const container = document.createElement("div");
    container.className = "menu-subscreen";

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "menu-back-btn";

    const backIcon = document.createElement("span");
    backIcon.className = "menu-back-btn-icon";
    backIcon.innerHTML = SVG_ARROW;
    backBtn.appendChild(backIcon);

    const backLabel = document.createElement("span");
    backLabel.className = "menu-back-btn-label";
    backLabel.textContent = "Menu";
    backBtn.appendChild(backLabel);

    backBtn.addEventListener("click", () => {
      this.navigateTo("menu");
    });
    container.appendChild(backBtn);

    const headingEl = document.createElement("h3");
    headingEl.className = "menu-section-label";
    headingEl.textContent = heading;
    container.appendChild(headingEl);

    container.appendChild(content);

    return container;
  }

  private buildAboutScreen(): HTMLElement {
    const content = document.createElement("div");
    content.className = "menu-about";

    const paragraphs = [
      "Gutter Generation is a playful, and dead serious, take on something real: a generation that got called cockroaches and gutter generation, and wore both as badges instead of insults.",
      "For weeks, thousands of us filled Jantar Mantar, in the capital — different states, different faiths, different castes. Turns out none of that mattered as much as we'd been told it would. One voice, one demand: show up, or step down. No single leader. No face to arrest. Just numbers, and numbers don't scare that easily.",
      "Independent journalists stayed on the ground asking the questions officials wouldn't answer. People who couldn't make it sent food, ran errands for those who could, or just refreshed their feed for updates — living the protest through a screen instead of the square. When it turned physical, we didn't disappear. We danced. We memed. We kept showing up. Some of us got hurt doing it. One of them stepped down. Nobody went home.",
      "This app is that story, turned into a toy. Drop a sticker of anyone you want into the crowd, and watch: eyes track them, fingers point, cockroaches swarm, placards go up. Nowhere left to hide, nothing left unwatched. That's why it's called Gutter Generation — the name they used against us is now the thing surrounding you.",
      "I built it to push past what I'd normally do with AI — not a static page, something with real feel: physics, timing, a crowd that actually reacts. Started as a weekend project. The crowd had other plans.",
    ];
    for (const text of paragraphs) {
      const p = document.createElement("p");
      p.textContent = text;
      content.appendChild(p);
    }

    return this.buildSubScreen("About This Project", content);
  }

  private buildInformedScreen(): HTMLElement {
    const container = document.createElement("div");
    container.className = "menu-informed";

    const intro = document.createElement("p");
    intro.className = "menu-informed-intro";
    intro.textContent = INFORMED_CITIZEN_INTRO;
    container.appendChild(intro);

    const tips = document.createElement("ul");
    tips.className = "menu-tips";
    for (const tip of INFORMED_CITIZEN_TIPS) {
      const item = document.createElement("li");
      item.textContent = tip;
      tips.appendChild(item);
    }
    container.appendChild(tips);

    return this.buildSubScreen("Be a More Informed Citizen", container);
  }

  private buildMediaScreen(): HTMLElement {
    const videoEntries = shuffleVideos(GALLERY_ENTRIES.filter((e) => e.kind === "video"));

    const videoList = document.createElement("div");
    videoList.className = "menu-gallery-list";
    for (const entry of videoEntries) {
      videoList.appendChild(this.buildVideoTile(entry));
    }

    return this.buildSubScreen("Support Independent Media", videoList);
  }

  private buildResourcesScreen(): HTMLElement {
    const sourceEntries: SourceEntry[] = GALLERY_ENTRIES.filter(
      (e): e is SourceEntry => e.kind === "source",
    );

    const outletList = document.createElement("div");
    outletList.className = "menu-gallery-list";
    for (const entry of sourceEntries) {
      outletList.appendChild(this.buildSourceTile(entry));
    }

    return this.buildSubScreen("Other Resources", outletList);
  }

  private buildVideoTile(entry: VideoEntry): HTMLElement {
    const link = document.createElement("a");
    link.className = "menu-tile menu-tile--video";
    link.href = buildYouTubeWatchUrl(entry.videoId);
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "menu-tile-thumb";
    img.src = buildYouTubeThumbnailUrl(entry.videoId);
    img.alt = entry.title;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      this.replaceWithFallbackCard(link, entry.title);
    });
    link.appendChild(img);

    const badge = document.createElement("span");
    badge.className = "menu-tile-badge";
    badge.innerHTML = SVG_YOUTUBE_PLAY;
    link.appendChild(badge);

    const caption = document.createElement("div");
    caption.className = "menu-tile-caption";
    const titleEl = document.createElement("span");
    titleEl.className = "menu-tile-title";
    titleEl.textContent = entry.title;
    const channelEl = document.createElement("span");
    channelEl.className = "menu-tile-channel";
    channelEl.textContent = entry.channel;
    caption.append(titleEl, channelEl);
    link.appendChild(caption);

    return link;
  }

  private buildSourceTile(entry: SourceEntry): HTMLElement {
    const link = document.createElement("a");
    link.className = "menu-tile menu-tile--source";
    link.href = entry.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const label = document.createElement("span");
    label.className = "menu-tile-label";
    label.textContent = entry.label;
    link.appendChild(label);

    return link;
  }

  private replaceWithFallbackCard(link: HTMLAnchorElement, title: string): void {
    link.classList.remove("menu-tile--video");
    link.classList.add("menu-tile--source");
    link.innerHTML = "";

    const icon = document.createElement("span");
    icon.className = "menu-tile-icon";
    icon.textContent = "▶";
    link.appendChild(icon);

    const label = document.createElement("span");
    label.className = "menu-tile-label";
    label.textContent = title;
    link.appendChild(label);
  }

  private buildShareSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "menu-share";

    const sharePrompt = document.createElement("p");
    sharePrompt.className = "menu-share-prompt";
    sharePrompt.textContent = SHARE_PROMPT;
    section.appendChild(sharePrompt);

    section.appendChild(this.nativeShare ? this.buildPrimaryShareButton() : this.buildFallbackShareRow());

    this.toastEl = document.createElement("div");
    this.toastEl.className = "menu-toast";
    section.appendChild(this.toastEl);

    return section;
  }

  private buildPrimaryShareButton(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-share-btn menu-share-primary";

    const icon = document.createElement("span");
    icon.className = "menu-share-btn-icon";
    icon.innerHTML = SVG_SHARE;
    const label = document.createElement("span");
    label.className = "menu-share-btn-label";
    label.textContent = "Share";
    btn.append(icon, label);

    btn.addEventListener("click", () => {
      void this.handleNativeShare();
    });
    return btn;
  }

  private buildFallbackShareRow(): HTMLElement {
    const row = document.createElement("div");
    row.className = "menu-share-fallback-row";

    const url = window.location.href;

    const whatsappBtn = document.createElement("a");
    whatsappBtn.className = "menu-share-icon-btn menu-share-icon-btn--whatsapp";
    whatsappBtn.href = buildWhatsAppShareUrl(SHARE_MESSAGE, url);
    whatsappBtn.target = "_blank";
    whatsappBtn.rel = "noopener noreferrer";
    whatsappBtn.setAttribute("aria-label", "Share on WhatsApp");
    whatsappBtn.innerHTML = SVG_WHATSAPP;

    const facebookBtn = document.createElement("a");
    facebookBtn.className = "menu-share-icon-btn menu-share-icon-btn--facebook";
    facebookBtn.href = buildFacebookShareUrl(url);
    facebookBtn.target = "_blank";
    facebookBtn.rel = "noopener noreferrer";
    facebookBtn.setAttribute("aria-label", "Share on Facebook");
    facebookBtn.innerHTML = SVG_FACEBOOK;

    const instagramBtn = document.createElement("button");
    instagramBtn.type = "button";
    instagramBtn.className = "menu-share-icon-btn menu-share-icon-btn--instagram";
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
        !this.menuButton?.contains(e.target as Node)
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
    footer.className = "menu-footer";
    footer.textContent = "© thatguyabhishek";
    return footer;
  }
}
