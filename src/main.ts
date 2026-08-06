import { Engine } from "./core/Engine";
import { BugSwarm } from "./creatures/BugSwarm";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { DraggableAvatar } from "./creatures/DraggableAvatar";
import { spawnPoof } from "./creatures/poofEffect";
import { StickerOverlay } from "./creatures/StickerOverlay";
import { TextOverlay } from "./creatures/TextOverlay";
import { Hud } from "./hud/Hud";
import { FilterPanel } from "./hud/FilterPanel";
import { GalleryPanel } from "./hud/GalleryPanel";

async function main(): Promise<void> {
  const container = document.getElementById("stage");
  if (!container) throw new Error("Missing #stage container");

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const avatar = new DraggableAvatar(
    vw / 2 - 70,
    vh / 2 - 70,
  );
  document.body.appendChild(avatar.el);
  avatar.attach();

  const filterPanel = new FilterPanel();

  const grid = new CreatureGrid({
    container,
    mode: "eyes",
    initialQuantity: filterPanel.getQuantity(),
  });
  await grid.init();

  const bugSwarm = new BugSwarm(container);

  const hud = new Hud();
  const hudRoot = document.getElementById("hud-root");
  if (!hudRoot) throw new Error("Missing #hud-root container");
  hud.attachTo(hudRoot);

  const galleryPanel = new GalleryPanel();

  filterPanel.attachTo(hud.getSettingsButton());
  galleryPanel.attachTo(hud.getGalleryButton());

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
    filterPanel.toggle();
  });

  hud.getGalleryButton().addEventListener("click", () => {
    filterPanel.close();
    galleryPanel.toggle();
  });

  let resizeTimeout: number;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      grid.respawn();
    }, 200);
  });

  type Attractor = { getCenter(): { x: number; y: number } };
  const staticAttractor = (x: number, y: number): Attractor => ({
    getCenter: () => ({ x, y }),
  });

  let currentAttractor: Attractor = avatar;
  let avatarActive = true;
  let activeOverlay: StickerOverlay | TextOverlay | null = null;
  let replaceToken = 0;

  const engine = new Engine();
  engine.onTick(() => {
    const center = currentAttractor.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();

  const poofElement = (el: HTMLElement): Promise<void> => {
    const rect = el.getBoundingClientRect();
    return spawnPoof(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const replaceOverlay = async (
    next: StickerOverlay | TextOverlay,
  ): Promise<void> => {
    const token = ++replaceToken;

    // Freeze the attractor at the last known center while the old content
    // poofs away, since the element it's read from is about to be removed.
    const center = currentAttractor.getCenter();
    currentAttractor = staticAttractor(center.x, center.y);

    let poofDone: Promise<void>;
    if (avatarActive) {
      poofDone = poofElement(avatar.el);
      avatar.detach();
      avatar.el.remove();
      avatarActive = false;
    } else if (activeOverlay) {
      const overlay = activeOverlay;
      activeOverlay = null;
      poofDone = poofElement(overlay.el);
      overlay.destroy();
    } else {
      poofDone = Promise.resolve();
    }

    await poofDone;
    if (token !== replaceToken) return; // superseded by a newer replace

    document.body.appendChild(next.el);
    activeOverlay = next;
    currentAttractor = next;
  };

  galleryPanel.onStickerSelect((src) => {
    const sticker = new StickerOverlay(src);
    void replaceOverlay(sticker);
  });

  galleryPanel.onTextSelect((font) => {
    if (activeOverlay instanceof TextOverlay) {
      const overlay = activeOverlay;
      const poofDone = poofElement(overlay.el);
      overlay.el.style.visibility = "hidden";
      void poofDone.then(() => {
        overlay.setFont(font);
        overlay.el.style.visibility = "visible";
      });
      return;
    }
    const text = new TextOverlay(font);
    void replaceOverlay(text);
  });
}

main().catch(console.error);
