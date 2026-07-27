import { SUBJECT_SKIN_REGISTRY, type SubjectSkin } from "./subjectSkinRegistry";
import { TEXT_FONT_REGISTRY, type TextFontId } from "./textFontRegistry";
import { AVATAR_ASSET_REGISTRY } from "./avatarAssetRegistry";

export type SubjectDrawerOptions = {
  anchor: "left" | "right";
};

export type SizeStep = "small" | "medium" | "large";
export type AlignStep = "left" | "center" | "right";

const SIZE_SCALE: Record<SizeStep, number> = { small: 0.75, medium: 1, large: 1.35 };

const STAGGER_MS = 48;

export class SubjectDrawer {
  private readonly panel: HTMLElement;
  private readonly cardList: HTMLElement;
  private open_ = false;
  private readonly cardEntries: { skin: SubjectSkin; el: HTMLElement }[] = [];
  private composeText = "";
  private composeScale = SIZE_SCALE.medium;
  private composeFontId: TextFontId = "spaceMono";
  private composeAlign: AlignStep = "center";
  private composePreviewEl!: HTMLElement;
  private composePreviewLabel!: HTMLElement;
  private activeSkin: SubjectSkin | null = null;
  private activeSubjectId: number | null = null;
  private resizeCb: ((subjectId: number | null, scale: number) => void) | null = null;
  private fontChangeCb: ((subjectId: number | null, fontId: TextFontId) => void) | null = null;
  private alignChangeCb: ((subjectId: number | null, align: AlignStep) => void) | null = null;
  private skinChangeCb: ((subjectId: number | null, skin: SubjectSkin) => void) | null = null;

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
    this.renderAvatarCards();
    this.renderCompose();
    this.wireCardSkinClicks();
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

  private renderAvatarCards(): void {
    const header = document.createElement("div");
    header.className = "subject-drawer__avatar-header";
    header.textContent = "Avatars";
    this.cardList.appendChild(header);

    AVATAR_ASSET_REGISTRY.forEach((entry, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "subject-drawer__card subject-drawer__avatar-card";
      card.setAttribute("role", "listitem");
      card.dataset.avatarAssetId = entry.id;
      card.setAttribute("aria-label", `Select ${entry.label} avatar`);
      card.style.setProperty("--reveal-delay", `${(SUBJECT_SKIN_REGISTRY.length + i) * STAGGER_MS}ms`);
      card.innerHTML = `
        <img class="subject-drawer__avatar-thumb" src="${entry.url}" alt="${entry.label}" draggable="false" />
        <span class="subject-drawer__card-label">${entry.label}</span>
      `;
      this.cardList.appendChild(card);
      this.cardEntries.push({ skin: { kind: "avatar", assetId: entry.id }, el: card });
    });
  }

  private fontOptionsMarkup(): string {
    return TEXT_FONT_REGISTRY.map((entry) => {
      const sample = entry.id === "spaceMono" ? "Aa" : entry.id === "fraunces" ? "Aa" : "Aa";
      return `<button type="button" class="subject-drawer__font-btn" data-font-id="${entry.id}" style="font-family: ${entry.cssFontFamily};" aria-label="Font ${entry.label}">${sample}</button>`;
    }).join("");
  }

  private renderCompose(): void {
    const slot = this.getComposeSlot();
    slot.innerHTML = `
      <input type="text" class="subject-drawer__compose-input" placeholder="type a subject..." maxlength="24" aria-label="Typed subject text" />
      <div class="subject-drawer__row">
        <span class="subject-drawer__row-label">size</span>
        <div class="subject-drawer__compose-sizes" role="group" aria-label="Text size">
          <button type="button" data-size="small" class="subject-drawer__size-btn">S</button>
          <button type="button" data-size="medium" class="subject-drawer__size-btn subject-drawer__size-btn--active">M</button>
          <button type="button" data-size="large" class="subject-drawer__size-btn">L</button>
        </div>
      </div>
      <div class="subject-drawer__row">
        <span class="subject-drawer__row-label">align</span>
        <div class="subject-drawer__align" role="group" aria-label="Text alignment">
          <button type="button" data-align="left" class="subject-drawer__align-btn" aria-label="Align left">L</button>
          <button type="button" data-align="center" class="subject-drawer__align-btn subject-drawer__align-btn--active" aria-label="Align center">C</button>
          <button type="button" data-align="right" class="subject-drawer__align-btn" aria-label="Align right">R</button>
        </div>
      </div>
      <div class="subject-drawer__row subject-drawer__row--font">
        <span class="subject-drawer__row-label">font</span>
        <div class="subject-drawer__font-grid" role="group" aria-label="Font family">
          ${this.fontOptionsMarkup()}
        </div>
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
        if (this.activeSkin?.kind === "text") {
          this.resizeCb?.(this.activeSubjectId, this.composeScale);
        }
      });
    }
    for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__align-btn")) {
      const align = btn.dataset.align as AlignStep | undefined;
      if (!align) continue;
      btn.addEventListener("click", () => {
        this.composeAlign = align;
        for (const other of slot.querySelectorAll<HTMLElement>(".subject-drawer__align-btn")) {
          other.classList.toggle("subject-drawer__align-btn--active", other.dataset.align === align);
        }
        this.refreshComposePreview();
        this.alignChangeCb?.(this.activeSubjectId, align);
      });
    }
    for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__font-btn")) {
      const fid = btn.dataset.fontId as TextFontId | undefined;
      if (!fid) continue;
      btn.addEventListener("click", () => {
        this.composeFontId = fid;
        for (const other of slot.querySelectorAll<HTMLElement>(".subject-drawer__font-btn")) {
          other.classList.toggle("subject-drawer__font-btn--active", other.dataset.fontId === fid);
        }
        this.refreshComposePreview();
        this.fontChangeCb?.(this.activeSubjectId, fid);
      });
    }
    this.refreshComposePreview();
  }

  private wireCardSkinClicks(): void {
    for (const { skin, el } of this.cardEntries) {
      el.addEventListener("click", () => {
        this.skinChangeCb?.(this.activeSubjectId, skin);
      });
    }
  }

  private refreshComposePreview(): void {
    this.composePreviewLabel.textContent = this.composeText || "(empty)";
    const fontEntry = TEXT_FONT_REGISTRY.find((f) => f.id === this.composeFontId) ?? TEXT_FONT_REGISTRY[0]!;
    this.composePreviewLabel.style.fontFamily = fontEntry.cssFontFamily;
    this.composePreviewLabel.style.textAlign = this.composeAlign;
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
      getSkin: () => ({
        kind: "text",
        value: this.composeText,
        scale: this.composeScale,
        fontId: this.composeFontId,
        align: this.composeAlign,
      }),
      el: this.composePreviewEl,
    };
  }

  setActiveSkin(subjectId: number | null, skin: SubjectSkin | null): void {
    this.activeSkin = skin;
    this.activeSubjectId = subjectId;
    if (skin?.kind === "text") {
      const slot = this.getComposeSlot();
      const input = slot.querySelector<HTMLInputElement>(".subject-drawer__compose-input")!;
      input.value = skin.value;
      this.composeText = skin.value;
      this.composeScale = skin.scale;
      this.composeFontId = (skin.fontId as TextFontId | undefined) ?? "spaceMono";
      this.composeAlign = skin.align ?? "center";
      const step = (Object.entries(SIZE_SCALE).find(([, v]) => v === skin.scale)?.[0] as SizeStep | undefined) ?? "medium";
      for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__size-btn")) {
        btn.classList.toggle("subject-drawer__size-btn--active", btn.dataset.size === step);
      }
      for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__align-btn")) {
        btn.classList.toggle("subject-drawer__align-btn--active", btn.dataset.align === this.composeAlign);
      }
      for (const btn of slot.querySelectorAll<HTMLElement>(".subject-drawer__font-btn")) {
        btn.classList.toggle("subject-drawer__font-btn--active", btn.dataset.fontId === this.composeFontId);
      }
      this.refreshComposePreview();
    }
  }

  onResize(cb: (subjectId: number | null, scale: number) => void): void {
    this.resizeCb = cb;
  }

  onFontChange(cb: (subjectId: number | null, fontId: TextFontId) => void): void {
    this.fontChangeCb = cb;
  }

  onAlignChange(cb: (subjectId: number | null, align: AlignStep) => void): void {
    this.alignChangeCb = cb;
  }

  onSkinChange(cb: (subjectId: number | null, skin: SubjectSkin) => void): void {
    this.skinChangeCb = cb;
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
