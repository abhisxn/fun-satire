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

const ctx = stage.getContext('2d');
if (!ctx) {
  throw new Error('Fun Satire: 2D canvas context unavailable.');
}

ctx.fillStyle = PALETTE.cream;
ctx.fillRect(0, 0, stage.width, stage.height);
