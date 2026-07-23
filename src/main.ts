import "@fontsource-variable/fraunces/standard-italic.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./styles/global.css";

import { PALETTE } from "./config/tokens";

const stage = document.querySelector<HTMLCanvasElement>('#stage');
const hud = document.querySelector<HTMLElement>('#hud-root');

if (!stage || !hud) {
  throw new Error('Fun Satire: missing #stage canvas or #hud-root container.');
}

stage.dataset.layer = "canvas";
stage.style.zIndex = "var(--z-canvas)";

const ctx = stage.getContext('2d');
if (!ctx) {
  throw new Error('Fun Satire: 2D canvas context unavailable.');
}

ctx.fillStyle = PALETTE.cream;
ctx.fillRect(0, 0, stage.width, stage.height);

const grain = document.createElement("div");
grain.id = "grain-layer";
grain.dataset.layer = "grain";
grain.setAttribute("aria-hidden", "true");
document.body.appendChild(grain);

hud.dataset.layer = "hud";
hud.style.zIndex = "var(--z-hud)";
