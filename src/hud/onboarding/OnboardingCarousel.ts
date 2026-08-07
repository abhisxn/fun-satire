export class OnboardingCarousel {
  private root: HTMLElement | null = null;
  private completeCb: ((center: { x: number; y: number }) => void) | null = null;
  private completed = false;

  attachTo(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "onb-stub";
    root.textContent = "ONBOARDING STUB";
    this.root = root;
    container.appendChild(root);
  }

  onComplete(cb: (center: { x: number; y: number }) => void): void {
    this.completeCb = cb;
  }

  completeForTesting(x: number, y: number): void {
    if (this.completed) return;
    this.completed = true;
    this.root?.remove();
    this.root = null;
    this.completeCb?.({ x, y });
    this.completeCb = null;
  }
}
