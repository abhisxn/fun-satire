import { Engine } from "./core/Engine";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { DraggableAvatar } from "./creatures/DraggableAvatar";
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
    cols: 12,
    rows: 8,
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

  hud.getSettingsButton().addEventListener("click", () => {
    galleryPanel.close();
  });

  hud.getGalleryButton().addEventListener("click", () => {
    filterPanel.close();
  });

  let resizeTimeout: number;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const cols = vw < 768 ? 8 : 12;
      const rows = vh < 768 ? 6 : 8;

      grid.setCols(cols);
      grid.setRows(rows);
      grid.respawn();
    }, 200);
  });

  const engine = new Engine();
  engine.onTick(() => {
    const center = avatar.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();
}

main().catch(console.error);
