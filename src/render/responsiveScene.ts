export type ControlVariant = "desktop" | "tablet" | "portrait-sheet" | "landscape-tray";

export type ScenePolicy = Readonly<{
  crowdScale: number;
  targetCrowdCount: number;
  controlVariant: ControlVariant;
}>;

const DESKTOP_MIN_WIDTH = 1200;
const TABLET_MIN_WIDTH = 900;
const PHONE_TABLET_FLOOR = 700;

const POLICY_TABLE: Readonly<Record<ControlVariant, ScenePolicy>> = Object.freeze({
  desktop: Object.freeze({ crowdScale: 1, targetCrowdCount: 18, controlVariant: "desktop" }),
  tablet: Object.freeze({ crowdScale: 0.9, targetCrowdCount: 16, controlVariant: "tablet" }),
  "portrait-sheet": Object.freeze({ crowdScale: 0.72, targetCrowdCount: 15, controlVariant: "portrait-sheet" }),
  "landscape-tray": Object.freeze({ crowdScale: 0.68, targetCrowdCount: 12, controlVariant: "landscape-tray" }),
});

const TABLET_PORTRAIT_OVERRIDE: ScenePolicy = Object.freeze({
  crowdScale: 0.82,
  targetCrowdCount: 16,
  controlVariant: "tablet",
});

export function resolveScenePolicy(width: number, height: number): ScenePolicy {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  if (w >= DESKTOP_MIN_WIDTH) {
    return { ...POLICY_TABLE.desktop };
  }
  if (w >= TABLET_MIN_WIDTH) {
    if (h > w) return { ...TABLET_PORTRAIT_OVERRIDE };
    return { ...POLICY_TABLE.tablet };
  }
  const shorter = Math.min(w, h);
  if (shorter >= PHONE_TABLET_FLOOR) {
    if (h > w) return { ...TABLET_PORTRAIT_OVERRIDE };
    return { ...POLICY_TABLE.tablet };
  }
  if (h >= w) {
    return { ...POLICY_TABLE["portrait-sheet"] };
  }
  return { ...POLICY_TABLE["landscape-tray"] };
}

export type CrowdMetrics = Readonly<{
  visualSizePx: number;
  collisionRadiusPx: number;
}>;

export function resolveCrowdMetrics(baseSizePx: number, scenePolicy: ScenePolicy): CrowdMetrics {
  const visualSizePx = baseSizePx * scenePolicy.crowdScale;
  const collisionRadiusPx = visualSizePx * 0.5;
  return { visualSizePx, collisionRadiusPx };
}
