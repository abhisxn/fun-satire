export type HudMode = "eyes" | "bugs" | "pointedFinger";
export type HudSkin = "figure" | "lotus";
export type HudPower = "laserBurn" | "electricBurn" | "bugEat";

export const HUD_TEAR_PATH =
  "M4 8 L36 2 L70 6 L104 1 L138 5 L172 2 L196 9 L198 30 L195 52 L162 58 L128 62 L94 57 L60 61 L26 56 L2 34 Z";

export type HudIcons = {
  modeIcon: Record<HudMode, string>;
  skinIcon: Record<HudSkin, string>;
  powerIcon: Record<HudPower, string>;
};

/**
 * Per spec §2a: power is not independently selectable. Each HudMode locks to
 * exactly one HudPower, and switching mode switches the active power as a
 * side effect. This is the single source of truth for that lock — main.ts's
 * mode-change handler reads it to drive powerCtrl.setPower()/hud.setPower(),
 * replacing the old keyboard-shortcut (1/2/3) + POWER_CONFIGS wiring.
 */
export const MODE_POWER_MAP: Record<HudMode, HudPower> = {
  eyes: "laserBurn",
  pointedFinger: "electricBurn",
  bugs: "bugEat",
};

export const hudIcons: HudIcons = {
  modeIcon: {
    eyes:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="9" ry="5.5" stroke="#2A2420" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#5B7A8C"/></svg>',
    bugs:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="13" rx="7" ry="4.5" fill="#6D7A5E" stroke="#2A2420" stroke-width="1.2"/><path d="M6 9 L3 5 M18 9 L21 5 M6 15 L2 17 M18 15 L22 17" stroke="#2A2420" stroke-width="1.2" stroke-linecap="round"/></svg>',
    pointedFinger:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 20 L9 11 Q9 8 11 8 Q13 8 13 11 L13 4 Q13 2 15 2 Q17 2 17 4 L17 14 L19 14 Q21 14 21 16 L21 20 Z" fill="#E8A9A0" stroke="#2A2420" stroke-width="1.2"/></svg>',
  },
  skinIcon: {
    figure:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="4" fill="#5B7A8C" stroke="#2A2420" stroke-width="1.2"/><path d="M5 21 Q5 13 12 13 Q19 13 19 21 Z" fill="#5B7A8C" stroke="#2A2420" stroke-width="1.2"/></svg>',
    lotus:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2.4" fill="#E8A9A0" stroke="#2A2420" stroke-width="1"/><path d="M12 12 L12 3 M12 12 L19.5 8 M12 12 L19.5 16 M12 12 L12 21 M12 12 L4.5 16 M12 12 L4.5 8" stroke="#6D7A5E" stroke-width="1.4" stroke-linecap="round"/></svg>',
  },
  powerIcon: {
    laserBurn:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20 L20 4" stroke="#E8A9A0" stroke-width="2.5" stroke-linecap="round"/></svg>',
    electricBurn:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 L5 14 L11 14 L9 22 L19 9 L13 9 Z" fill="#E8A9A0" stroke="#2A2420" stroke-width="1"/></svg>',
    bugEat:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12 A8 8 0 1 1 12 20 L4 12 Z" fill="#6D7A5E" stroke="#2A2420" stroke-width="1.2"/></svg>',
  },
};
