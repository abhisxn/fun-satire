import "./snapGuides.css";
import { getSnapLines, findNearestSnap } from "./snapGrid";

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
  const { x, y } = getSnapLines(el);
  const snapX = findNearestSnap(x);
  const snapY = findNearestSnap(y);

  if (snapX !== null) {
    xGuide.style.left = `${snapX.guideLine}px`;
    xGuide.style.display = "block";
  } else {
    xGuide.style.display = "none";
  }

  if (snapY !== null) {
    yGuide.style.top = `${snapY.guideLine}px`;
    yGuide.style.display = "block";
  } else {
    yGuide.style.display = "none";
  }
}

export function hideSnapGuides(): void {
  if (guideX) guideX.style.display = "none";
  if (guideY) guideY.style.display = "none";
}
