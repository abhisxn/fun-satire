import { Engine } from "./core/Engine";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { DraggableAvatar } from "./creatures/DraggableAvatar";
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

  const grid = new CreatureGrid({
    container,
    mode: "eyes",
  });
  await grid.init();

  const hud = new Hud();
  const hudRoot = document.getElementById("hud-root");
  if (!hudRoot) throw new Error("Missing #hud-root container");
  hud.attachTo(hudRoot);

  const filterPanel = new FilterPanel();
  const galleryPanel = new GalleryPanel();

  filterPanel.attachTo(hud.getSettingsButton());
  galleryPanel.attachTo(hud.getGalleryButton());

  filterPanel.onQuantityChange((qty) => {
    grid.setQuantity(qty);
  });

  filterPanel.onRepelChange((value) => {
    grid.setRepelMultiplier(value);
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

  const engine = new Engine();
  engine.onTick(() => {
    const center = avatar.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();

  let activeOverlay: StickerOverlay | TextOverlay | null = null;

  const clearOverlay = (): void => {
    if (!activeOverlay) return;
    activeOverlay.destroy();
    activeOverlay = null;
  };

  galleryPanel.onStickerSelect((src) => {
    if (activeOverlay instanceof TextOverlay) clearOverlay();
    if (activeOverlay instanceof StickerOverlay) {
      activeOverlay.setImage(src);
    } else {
      const sticker = new StickerOverlay(src);
      document.body.appendChild(sticker.el);
      activeOverlay = sticker;
    }
  });

  galleryPanel.onTextSelect((font) => {
    if (activeOverlay instanceof StickerOverlay) clearOverlay();
    if (activeOverlay instanceof TextOverlay) {
      activeOverlay.setFont(font);
    } else {
      const text = new TextOverlay(font);
      document.body.appendChild(text.el);
      activeOverlay = text;
    }
  });
}

main().catch(console.error);
