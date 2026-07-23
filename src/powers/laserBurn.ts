import type { WorldAPI } from "../effects/EffectSystem";

export type PowerPressParams = {
  cursor: { x: number; y: number; active: boolean };
  targetId: number | null;
  nowMs: number;
};

export type PowerTickParams = {
  cursor: { x: number; y: number; active: boolean };
  targetId: number | null;
  nowMs: number;
  dtMs: number;
  chargeT: number;
};

export type PowerReleaseParams = {
  cursor: { x: number; y: number; active: boolean };
  targetId: number | null;
  nowMs: number;
  chargeT: number;
  fired: boolean;
};

export type Power = {
  id: string;
  effectId: string;
  onPress?: (params: PowerPressParams, world: WorldAPI) => void;
  onTick?: (params: PowerTickParams, world: WorldAPI) => void;
  onRelease?: (params: PowerReleaseParams, world: WorldAPI) => void;
};

export const laserBurnPower: Power = {
  id: "laserBurn",
  effectId: "laserBurn",
};
