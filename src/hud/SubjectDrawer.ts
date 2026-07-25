import { SUBJECT_SKIN_REGISTRY, type SubjectSkin } from "./subjectSkinRegistry";

export type SubjectDrawerOptions = {
  anchor: "left" | "right";
};

const STAGGER_MS = 48;

export class SubjectDrawer {
  private readonly panel: HTMLElement;
  private readonly cardList: HTMLElement;
  private open_ = false;
  private readonly cardEntries: { skin: SubjectSkin; el: HTMLElement }[] = [];

  constructor(root: HTMLElement, opts: SubjectDrawerOptions) {
    this.panel = document.createElement("div");
    this.panel.className = "subject-drawer";
    this.panel.dataset.anchor = opts.anchor;
    this.panel.dataset.open = "false";
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", "Subject browser");
    this.panel.innerHTML = `
      <div class="subject-drawer__compose" data-slot="compose"></div>
      <div class="subject-drawer__list" role="list"></div>
    `;
    root.appendChild(this.panel);
    this.cardList = this.panel.querySelector<HTMLElement>(".subject-drawer__list")!;
    this.renderCards();
  }

  private renderCards(): void {
    SUBJECT_SKIN_REGISTRY.forEach((entry, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "subject-drawer__card";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", `Select ${entry.label} subject`);
      card.style.setProperty("--reveal-delay", `${i * STAGGER_MS}ms`);
      card.innerHTML = `
        <span class="subject-drawer__card-thumb" data-skin-id="${entry.id}" aria-hidden="true"></span>
        <span class="subject-drawer__card-label">${entry.label}</span>
      `;
      this.cardList.appendChild(card);
      this.cardEntries.push({ skin: { kind: "illustrated", id: entry.id }, el: card });
    });
  }

  getCardElements(): { skin: SubjectSkin; el: HTMLElement }[] {
    return this.cardEntries;
  }

  getComposeSlot(): HTMLElement {
    return this.panel.querySelector<HTMLElement>('[data-slot="compose"]')!;
  }

  open(): void {
    this.open_ = true;
    this.panel.dataset.open = "true";
  }

  close(): void {
    this.open_ = false;
    this.panel.dataset.open = "false";
  }

  toggle(): void {
    if (this.open_) this.close();
    else this.open();
  }

  isOpen(): boolean {
    return this.open_;
  }
}
