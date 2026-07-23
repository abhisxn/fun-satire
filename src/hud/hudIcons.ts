import { PALETTE } from "../config/tokens";

export type HudMode = "eyes";
export type HudPower = "laserBurn";

export type HudIcons = {
  modeIcon: Record<HudMode, string>;
  powerIcon: Record<HudPower, string>;
};

const tear = "M4 0 H196 L192 5 L196 12 L192 18 L196 24 L192 30 L196 36 L192 42 L196 48 L192 54 L196 60 L196 64 H4 L8 58 L4 52 L8 46 L4 40 L8 34 L4 28 L8 22 L4 16 L8 10 L4 4 Z";

export const hudIcons: HudIcons = {
  modeIcon: {
    eyes: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12 Q12 4 22 12 Q12 20 2 12Z" fill="none" stroke="${PALETTE.ink}" stroke-width="1.4"/><circle cx="12" cy="12" r="3" fill="${PALETTE.ink}"/></svg>`,
  },
  powerIcon: {
    laserBurn: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 12 L18 12 M14 7 L19 12 L14 17" fill="none" stroke="${PALETTE.ink}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
};

export const HUD_TEAR_PATH = tear;
