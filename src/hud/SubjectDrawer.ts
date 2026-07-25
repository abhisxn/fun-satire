import { SUBJECT_SKIN_REGISTRY, type SubjectSkin } from "./subjectSkinRegistry";

export type SubjectDrawerOptions = {
  anchor: "left" | "right";
};

export type SizeStep = "small" | "medium" | "large";

const SIZE_SCALE: Record<SizeStep, number> = { small: 0.75, medium: 1, large: 1.35 };

const STAGGER_MS = 48;

export class SubjectDrawer {
  private readonly panel: HTMLElement;
  private readonly cardList: HTMLElement;
  private open_ = false;
  private readonly cardEntries: { skin: SubjectSkin; el: HTMLElement }[] = [];
  private composeText = "";
  private composeScale = SIZE_SCALE.medium;
  private composePreviewEl!: HTMLElement;
  private composePreviewLabel!: HTMLElement;

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
    this.renderCompose();
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

  private renderCompose(): void {
    const slot = this.getComposeSlot();
    slot.innerHTML = `
      <input type="text" class="subject-drawer__compose-input" placeholder="type a subject..." maxlength="24" aria-label="Typed subject text" />
      <div class="subject-drawer__compose-sizes" role="group" aria-label="Text size">
        <button type="button" data-size="small" class="subject-drawer__size-btn">S</button>
        <button type="button" data-size="medium" class="subject-drawer__size-btn subject-drawer__size-btn--active">M</button>
        <button type="button" data-size="large" class="subject-drawer__size-btn">L</button>
      </div>
      <button type="button" class="subject-drawer__card subject-drawer__compose-preview" aria-label="Typed subject preview, drag or tap to place">
        <span class="subject-drawer__card-thumb subject-drawer__compose-preview-thumb" aria-hidden="true"></span>
        <span class="subject-drawer__card-label subject-drawer__compose-preview-label"></span>
      </button>
    `;
    const input = slot.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
    this.composePreviewEl = slot.querySelector<HTMLElement>(".subject-drawer__compose-preview")!;
    this.composePreviewLabel = slot.querySelector<HTMLElement>(".subject-drawer__compose-preview-label")!;
    input.addEventListener("input", () => {
      this.composeText = input.value;
      this.refreshComposePreview();
    });
    for (const step of Object.keys(SIZE_SCALE) as SizeStep[]) {
      slot.querySelector<HTMLElement>(`[data-size="${step}"]`)!.addEventListener("click", () => {
        this.composeScale = SIZE_SCALE[step];
        for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__size-btn")) {
          btn.classList.toggle("subject-drawer__size-btn--active", btn.dataset.size === step);
        }
        this.refreshComposePreview();
      });
    }
    this.refreshComposePreview();
  }

  private refreshComposePreview(): void {
    this.composePreviewLabel.textContent = this.composeText || "(empty)";
    this.composePreviewEl.style.fontSize = `${0.8 * this.composeScale}rem`;
  }

  getCardElements(): { skin: SubjectSkin; el: HTMLElement }[] {
    return this.cardEntries;
  }

  getComposeSlot(): HTMLElement {
    return this.panel.querySelector<HTMLElement>('[data-slot="compose"]')!;
  }

  getComposePreviewCard(): { getSkin: () => SubjectSkin; el: HTMLElement } {
    return {
      getSkin: () => ({ kind: "text", value: this.composeText, scale: this.composeScale }),
      el: this.composePreviewEl,
    };
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
