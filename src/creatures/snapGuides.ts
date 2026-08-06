import "./snapGuides.css";
import { getSnapTargets } from "./snapGrid";

const SNAP_MARGIN = 100;
const SNAP_THRESHOLD = 28;

let guideX: HTMLDivElement | null = null;
let guideY: HTMLDivElement | null = null;

function ensureGuides(): { x: HTMLDivElement; y: HTMLDivElement } {
  if (!guideX) {
    guideX = document.createElement("div");
    guideX.className = "snap-guide snap-guide--x";
    document.body.appendChild(guideX);
  }
  if (!guideY) {
    guideY = document.createElement("div");
    guideY.className = "snap-guide snap-guide--y";
    document.body.appendChild(guideY);
  }
  return { x: guideX, y: guideY };
}

export function updateSnapGuides(el: HTMLElement): void {
  const { x: xGuide, y: yGuide } = ensureGuides();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const curLeft = rect.left;
  const curTop = rect.top;

  const targets = getSnapTargets(w, h);
  const xLines: readonly number[] = [SNAP_MARGIN, (vw - w) / 2, targets.left];
  const yLines: readonly number[] = [SNAP_MARGIN, (vh - h) / 2, targets.top];

  let bestDx = SNAP_THRESHOLD;
  let bestXLine: number | null = null;
  for (const line of xLines) {
    const dx = Math.abs(curLeft - line);
    if (dx < bestDx) {
      bestDx = dx;
      bestXLine = line;
    }
  }

  let bestDy = SNAP_THRESHOLD;
  let bestYLine: number | null = null;
  for (const line of yLines) {
    const dy = Math.abs(curTop - line);
    if (dy < bestDy) {
      bestDy = dy;
      bestYLine = line;
    }
  }

  if (bestXLine !== null) {
    xGuide.style.left = `${bestXLine}px`;
    xGuide.style.display = "block";
  } else {
    xGuide.style.display = "none";
  }

  if (bestYLine !== null) {
    yGuide.style.top = `${bestYLine}px`;
    yGuide.style.display = "block";
  } else {
    yGuide.style.display = "none";
  }
}

export function hideSnapGuides(): void {
  if (guideX) guideX.style.display = "none";
  if (guideY) guideY.style.display = "none";
}
