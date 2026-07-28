import { Engine } from "./core/Engine";
import { CreatureGrid } from "./creatures/CreatureGrid";
import { DraggableAvatar } from "./creatures/DraggableAvatar";

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

  const engine = new Engine();
  engine.onTick(() => {
    const center = avatar.getCenter();
    grid.update(center.x, center.y);
  });
  engine.start();
}

main().catch(console.error);
