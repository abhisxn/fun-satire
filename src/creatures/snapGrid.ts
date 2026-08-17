const SNAP_MARGIN = 100;
const SNAP_THRESHOLD = 28;

/** A candidate snap line at a fixed screen position, plus how far the
 * element's reference point (its edge or center) sits from its own center. */
interface SnapCandidate {
  readonly line: number;
  readonly refOffset: number;
}

export interface SnapAxis {
  readonly candidates: readonly SnapCandidate[];
  readonly curCenter: number;
  readonly curPos: number;
}

export interface SnapLines {
  readonly x: SnapAxis;
  readonly y: SnapAxis;
}

export interface SnapResult {
  readonly guideLine: number;
  readonly pos: number;
}

function getAxisCandidates(viewportSize: number, elSize: number): readonly SnapCandidate[] {
  const half = elSize / 2;
  return [
    { line: SNAP_MARGIN, refOffset: -half }, // near edge
    { line: viewportSize / 2, refOffset: 0 }, // center
    { line: viewportSize - SNAP_MARGIN, refOffset: half }, // far edge
  ];
}

export function getSnapLines(el: HTMLElement): SnapLines {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();

  return {
    x: {
      candidates: getAxisCandidates(vw, rect.width),
      curCenter: rect.left + rect.width / 2,
      curPos: rect.left,
    },
    y: {
      candidates: getAxisCandidates(vh, rect.height),
      curCenter: rect.top + rect.height / 2,
      curPos: rect.top,
    },
  };
}

/** Finds the candidate whose reference point (element center + refOffset) is
 * nearest to its line, within SNAP_THRESHOLD. */
export function findNearestSnap(axis: SnapAxis): SnapResult | null {
  let bestDist = SNAP_THRESHOLD;
  let best: SnapCandidate | null = null;
  for (const candidate of axis.candidates) {
    const refPoint = axis.curCenter + candidate.refOffset;
    const dist = Math.abs(refPoint - candidate.line);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  if (best === null) return null;
  // Shift curPos by the same amount needed to move the reference point onto the line.
  const refPoint = axis.curCenter + best.refOffset;
  return { guideLine: best.line, pos: axis.curPos + (best.line - refPoint) };
}

export function snapToGrid(el: HTMLElement): void {
  const { x, y } = getSnapLines(el);
  const snapX = findNearestSnap(x);
  const snapY = findNearestSnap(y);

  const rect = el.getBoundingClientRect();
  const styleLeft = parseFloat(el.style.left);
  const styleTop = parseFloat(el.style.top);
  const curLeft = isNaN(styleLeft) ? rect.left : styleLeft;
  const curTop = isNaN(styleTop) ? rect.top : styleTop;
  const deltaX = rect.left - curLeft;
  const deltaY = rect.top - curTop;

  if (snapX !== null) el.style.left = `${snapX.pos - deltaX}px`;
  if (snapY !== null) el.style.top = `${snapY.pos - deltaY}px`;
}

export function clampToViewport(el: HTMLElement): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();
  const styleLeft = parseFloat(el.style.left);
  const styleTop = parseFloat(el.style.top);
  const curLeft = isNaN(styleLeft) ? rect.left : styleLeft;
  const curTop = isNaN(styleTop) ? rect.top : styleTop;
  const deltaX = rect.left - curLeft;
  const deltaY = rect.top - curTop;
  const width = rect.width || el.offsetWidth || 0;
  const height = rect.height || el.offsetHeight || 0;

  const minLeft = Math.min(0, vw - width);
  const maxLeft = Math.max(0, vw - width);
  const minTop = Math.min(0, vh - height);
  const maxTop = Math.max(0, vh - height);

  const clampedRectLeft = Math.max(minLeft, Math.min(maxLeft, rect.left));
  const clampedRectTop = Math.max(minTop, Math.min(maxTop, rect.top));

  el.style.left = `${clampedRectLeft - deltaX}px`;
  el.style.top = `${clampedRectTop - deltaY}px`;
}
