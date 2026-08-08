import { Engine } from "./core/Engine";
import { BugSwarm } from "./creatures/BugSwarm";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { spawnPoof } from "./creatures/poofEffect";
import type { PoofHandle } from "./creatures/poofEffect";
import { StickerOverlay } from "./creatures/StickerOverlay";
import { TextOverlay } from "./creatures/TextOverlay";
import { Hud } from "./hud/Hud";
import { FilterPanel } from "./hud/FilterPanel";
import { GalleryPanel, getStickerDefs } from "./hud/GalleryPanel";
import { ProtestPanel } from "./hud/ProtestPanel";
import { OnboardingCarousel } from "./hud/onboarding/OnboardingCarousel";
import { DEFAULT_CREATURE_QUANTITY } from "./config/tokens";

const ONBOARDING_CREATURE_QUANTITY = 60;
const ONBOARDING_CARD_REPULSOR_RADIUS = 300;

async function main(): Promise<void> {
  const container = document.getElementById("stage");
  if (!container) throw new Error("Missing #stage container");

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const filterPanel = new FilterPanel();

  const grid = new CreatureGrid({
    container,
    mode: "cockroach",
    initialQuantity: ONBOARDING_CREATURE_QUANTITY,
  });
  await grid.init();
  grid.setRepulsor(vw / 2, vh / 2, ONBOARDING_CARD_REPULSOR_RADIUS);

  const bugSwarm = new BugSwarm(container);

  type Attractor = { getCenter(): { x: number; y: number } };
  const staticAttractor = (x: number, y: number): Attractor => ({
    getCenter: () => ({ x, y }),
  });

  let activeOverlay: StickerOverlay | TextOverlay | null = null;
  let replaceToken = 0;

  const pointerPos = { x: vw / 2, y: vh / 2 };
  const onPointerMove = (e: PointerEvent): void => {
    pointerPos.x = e.clientX;
    pointerPos.y = e.clientY;
  };
  window.addEventListener("pointermove", onPointerMove);

  let currentAttractor: Attractor = {
    getCenter: () => ({ x: pointerPos.x, y: pointerPos.y }),
  };

  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();

  let resizeTimeout: number;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      grid.respawn();
    }, 200);
  });

  const poofElement = (el: HTMLElement): PoofHandle => {
    const rect = el.getBoundingClientRect();
    return spawnPoof(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      rect.width,
      rect.height,
    );
  };

  const replaceOverlay = async (
    next: StickerOverlay | TextOverlay,
  ): Promise<void> => {
    const token = ++replaceToken;

    const center = currentAttractor.getCenter();
    currentAttractor = staticAttractor(center.x, center.y);

    let poofDone: Promise<void>;
    if (activeOverlay) {
      const overlay = activeOverlay;
      activeOverlay = null;
      const poof = poofElement(overlay.el);
      await poof.covered;
      if (token !== replaceToken) return;
      overlay.destroy();
      poofDone = poof.done;
    } else {
      poofDone = Promise.resolve();
    }

    await poofDone;
    if (token !== replaceToken) return;

    document.body.appendChild(next.el);
    activeOverlay = next;
    currentAttractor = next;
  };

  const mountPostOnboarding = (): void => {
    const hud = new Hud();
    const hudRoot = document.getElementById("hud-root");
    if (!hudRoot) throw new Error("Missing #hud-root container");
    hud.attachTo(hudRoot);

    const galleryPanel = new GalleryPanel();
    const protestPanel = new ProtestPanel();

    filterPanel.attachTo(hud.getSettingsButton());
    galleryPanel.attachTo(hud.getGalleryButton());
    protestPanel.attachTo(hud.getAttackButton());

    filterPanel.onQuantityChange((qty) => {
      grid.setQuantity(qty);
    });

    filterPanel.onRepelChange((value) => {
      grid.setRepelMultiplier(value);
    });

    filterPanel.onBugModeToggle((active) => {
      bugSwarm.setActive(active);
    });

    hud.onModeChange((mode) => {
      grid.switchMode(mode);
    });

    hud.getSettingsButton().addEventListener("click", () => {
      galleryPanel.close();
      protestPanel.close();
      filterPanel.toggle();
    });

    hud.getGalleryButton().addEventListener("click", () => {
      filterPanel.close();
      protestPanel.close();
      galleryPanel.toggle();
    });

    hud.onAttackPress(() => {
      filterPanel.close();
      galleryPanel.close();
      protestPanel.toggle();
    });

    galleryPanel.onStickerSelect((src) => {
      const sticker = new StickerOverlay(src);
      void replaceOverlay(sticker);
    });

    galleryPanel.onTextSelect((font) => {
      if (activeOverlay instanceof TextOverlay) {
        const overlay = activeOverlay;
        const poof = poofElement(overlay.el);
        void poof.covered.then(() => {
          overlay.el.style.visibility = "hidden";
        });
        void poof.done.then(() => {
          overlay.setFont(font);
          overlay.el.style.visibility = "visible";
        });
        return;
      }
      const text = new TextOverlay(font);
      void replaceOverlay(text);
    });
  };

  const carousel = new OnboardingCarousel();
  carousel.attachTo(document.body);
  carousel.onComplete(async (center) => {
    window.removeEventListener("pointermove", onPointerMove);
    await spawnPoof(center.x, center.y).done;
    const defs = getStickerDefs();
    const def = defs[Math.floor(Math.random() * defs.length)];
    const sticker = new StickerOverlay(def.src, center.x - 80, center.y - 80);
    document.body.appendChild(sticker.el);
    activeOverlay = sticker;
    currentAttractor = sticker;
    mountPostOnboarding();
    grid.clearRepulsor();
    filterPanel.setQuantity(DEFAULT_CREATURE_QUANTITY);
  });
}

main().catch(console.error);
