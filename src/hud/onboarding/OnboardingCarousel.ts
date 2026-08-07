import "./onboarding.css";
import { DURATION } from "../../config/tokens";
import { BEATS } from "./beats";

export class OnboardingCarousel {
  private readonly root: HTMLElement;
  private readonly copy: HTMLElement;
  private readonly lineA: HTMLElement;
  private readonly lineB: HTMLElement;
  private readonly dots: HTMLElement[];
  private readonly action: HTMLButtonElement;
  private readonly skip: HTMLButtonElement;
  private index = 0;
  private done = false;
  private firing = false;
  private fadeTimer: number | null = null;
  private completeCb: ((center: { x: number; y: number }) => void | Promise<void>) | null = null;

  constructor() {
    const root = document.createElement("div");
    root.className = "onb-card";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Introduction");

    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "onb-skip";
    skip.textContent = "Skip intro";
    skip.setAttribute("aria-label", "Skip intro");

    const copy = document.createElement("div");
    copy.className = "onb-copy";

    const lineA = document.createElement("p");
    lineA.className = "onb-line";

    const lineB = document.createElement("p");
    lineB.className = "onb-line onb-line--second";

    copy.append(lineA, lineB);

    const footer = document.createElement("div");
    footer.className = "onb-footer";

    const dotsWrap = document.createElement("div");
    dotsWrap.className = "onb-dots";
    dotsWrap.setAttribute("aria-hidden", "true");

    const dots: HTMLElement[] = [];
    for (let i = 0; i < BEATS.length; i++) {
      const d = document.createElement("span");
      d.className = "onb-dot";
      dotsWrap.appendChild(d);
      dots.push(d);
    }

    const action = document.createElement("button");
    action.type = "button";
    action.className = "onb-action onb-action--next";

    footer.append(dotsWrap, action);
    root.append(skip, copy, footer);

    skip.addEventListener("click", () => this.finish());
    action.addEventListener("click", () => {
      if (this.index === BEATS.length - 1) this.finish();
      else this.advance();
    });

    this.root = root;
    this.copy = copy;
    this.lineA = lineA;
    this.lineB = lineB;
    this.dots = dots;
    this.action = action;
    this.skip = skip;
    this.render();
  }

  attachTo(container: HTMLElement): void {
    container.appendChild(this.root);
  }

  onComplete(cb: (center: { x: number; y: number }) => void | Promise<void>): void {
    this.completeCb = cb;
  }

  private render(): void {
    const beat = BEATS[this.index];
    this.lineA.textContent = beat.lines[0];
    this.lineB.textContent = beat.lines[1];
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      d.classList.toggle("onb-dot--active", i === this.index && this.index !== BEATS.length - 1);
      d.classList.toggle("onb-dot--attack", i === this.index && this.index === BEATS.length - 1);
    }
    if (this.index === BEATS.length - 1) {
      this.action.textContent = "Begin";
      this.action.className = "onb-action onb-action--begin";
      this.action.setAttribute("aria-label", "Begin");
    } else {
      this.action.textContent = "Next \u2192";
      this.action.className = "onb-action onb-action--next";
      this.action.setAttribute("aria-label", "Next");
    }
  }

  private advance(): void {
    if (this.done || this.firing) return;
    this.firing = true;
    this.copy.classList.add("onb-copy--fading");
    this.fadeTimer = window.setTimeout(() => {
      if (this.done) return;
      this.fadeTimer = null;
      this.index += 1;
      this.render();
      this.firing = false;
      requestAnimationFrame(() => {
        if (this.done) return;
        this.copy.classList.remove("onb-copy--fading");
      });
    }, DURATION.base);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    if (this.fadeTimer !== null) {
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.action.disabled = true;
    this.skip.disabled = true;
    const rect = this.root.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.root.remove();
    void Promise.resolve(this.completeCb?.(center)).catch(console.error);
  }
}
