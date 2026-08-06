const SNAP_MARGIN = 100;
const SNAP_THRESHOLD = 28;

export interface SnapTarget {
  readonly left: number;
  readonly top: number;
}

export function getSnapTargets(width: number, height: number): SnapTarget {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: vw - 100 - width,
    top: vh - 100 - height,
  };
}

export function snapToGrid(el: HTMLElement): void {
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
  let bestX = curLeft;
  for (const line of xLines) {
    const dx = Math.abs(curLeft - line);
    if (dx < bestDx) {
      bestDx = dx;
      bestX = line;
    }
  }

  let bestDy = SNAP_THRESHOLD;
  let bestY = curTop;
  for (const line of yLines) {
    const dy = Math.abs(curTop - line);
    if (dy < bestDy) {
      bestDy = dy;
      bestY = line;
    }
  }

  if (bestX !== curLeft) el.style.left = `${bestX}px`;
  if (bestY !== curTop) el.style.top = `${bestY}px`;
}
