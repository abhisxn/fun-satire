import { PALETTE } from "../config/tokens";

export type HudMode = "eyes" | "bugs" | "pointedFinger";
export type HudSkin = "figure" | "lotus";
export type HudPower = "laserBurn" | "electricBurn" | "bugEat";

export const HUD_TEAR_PATH =
  "M4 8 L36 2 L70 6 L104 1 L138 5 L172 2 L196 9 L198 30 L195 52 L162 58 L128 62 L94 57 L60 61 L26 56 L2 34 Z";

export type HudIcons = {
  modeIcon: Record<HudMode, string>;
  skinIcon: Record<HudSkin, string>;
  powerIcon: Record<HudPower, string>;
  subjectToggleIcon: string;
  hand: string;
  bug: string;
  eye: string;
  visibilityOn: string;
  visibilityOff: string;
  dragHandle: string;
  grid: string;
  move: string;
  textBox: string;
  attack: string;
  filterLines: string;
  filterKnob: string;
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

const I = PALETTE.ink;
const C = PALETTE.coral;
const CREAM = PALETTE.cream;
const S = PALETTE.slate;

export const hudIcons: HudIcons = {
  modeIcon: {
    eyes:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="9" ry="5.5" stroke="${I}" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="${S}"/></svg>`,
    bugs:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="13" rx="7" ry="4.5" fill="${PALETTE.sage}" stroke="${I}" stroke-width="1.2"/><path d="M6 9 L3 5 M18 9 L21 5 M6 15 L2 17 M18 15 L22 17" stroke="${I}" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    pointedFinger:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 20 L9 11 Q9 8 11 8 Q13 8 13 11 L13 4 Q13 2 15 2 Q17 2 17 4 L17 14 L19 14 Q21 14 21 16 L21 20 Z" fill="${C}" stroke="${I}" stroke-width="1.2"/></svg>`,
  },
  skinIcon: {
    figure:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="7" r="4" fill="${S}" stroke="${I}" stroke-width="1.2"/><path d="M5 21 Q5 13 12 13 Q19 13 19 21 Z" fill="${S}" stroke="${I}" stroke-width="1.2"/></svg>`,
    lotus:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2.4" fill="${C}" stroke="${I}" stroke-width="1"/><path d="M12 12 L12 3 M12 12 L19.5 8 M12 12 L19.5 16 M12 12 L12 21 M12 12 L4.5 16 M12 12 L4.5 8" stroke="${PALETTE.sage}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  },
  powerIcon: {
    laserBurn:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20 L20 4" stroke="${C}" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    electricBurn:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 L5 14 L11 14 L9 22 L19 9 L13 9 Z" fill="${C}" stroke="${I}" stroke-width="1"/></svg>`,
    bugEat:
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12 A8 8 0 1 1 12 20 L4 12 Z" fill="${PALETTE.sage}" stroke="${I}" stroke-width="1.2"/></svg>`,
  },
  subjectToggleIcon: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="${I}" stroke-width="1.4"/><path d="M4 9 H20 M9 9 V20" stroke="${I}" stroke-width="1.4"/></svg>`,

  // --- Phase C Lane 1 chrome icons (Figma node 103:2490, 24×24, thin-line) ---
  // Hand tool — open palm, two fingers up
  hand: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 13 L8 7 Q8 5.5 9.2 5.5 Q10.4 5.5 10.4 7 L10.4 11 M10.4 11 L10.4 4.5 Q10.4 3 11.6 3 Q12.8 3 12.8 4.5 L12.8 11 M12.8 11 L12.8 5 Q12.8 3.5 14 3.5 Q15.2 3.5 15.2 5 L15.2 11 M15.2 11 L15.2 7 Q15.2 5.5 16.4 5.5 Q17.6 5.5 17.6 7 L17.6 14 Q17.6 19 13 19 Q9 19 8 15.5 L7 12 Q6.5 10.5 7.8 10.2 Q9 10 9.5 11.2 L10.4 13" stroke="${I}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="${CREAM}"/></svg>`,

  // Bug — body + antennae + legs
  bug: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="14" rx="6.5" ry="4.5" fill="${PALETTE.sage}" stroke="${I}" stroke-width="1.2"/><path d="M12 9.5 L12 5.5 M9 6.5 L12 9.5 L15 6.5" stroke="${I}" stroke-width="1.2" stroke-linecap="round"/><path d="M5.5 11 L3 9 M5.5 14 L2.5 14 M5.5 17 L3 19 M18.5 11 L21 9 M18.5 14 L21.5 14 M18.5 17 L21 19" stroke="${I}" stroke-width="1.2" stroke-linecap="round"/><line x1="12" y1="9.5" x2="12" y2="18.5" stroke="${I}" stroke-width="0.8" opacity="0.5"/></svg>`,

  // Eye — almond + pupil
  eye: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12 Q12 4 21 12 Q12 20 3 12 Z" fill="${CREAM}" stroke="${I}" stroke-width="1.3"/><circle cx="12" cy="12" r="3.2" fill="${S}"/><circle cx="12" cy="12" r="1.2" fill="${I}"/></svg>`,

  // Visibility ON (open eye, matching node icn4)
  visibilityOn: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12 Q12 4 21 12 Q12 20 3 12 Z" fill="${CREAM}" stroke="${I}" stroke-width="1.3"/><circle cx="12" cy="12" r="3" fill="${S}"/></svg>`,

  // Visibility OFF (eye with diagonal slash)
  visibilityOff: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 13 Q5 10 7 8 Q4.5 10 3 12 Q4 14 5.5 15.5" stroke="${I}" stroke-width="1.3" fill="none"/><path d="M9 7 Q12 4 21 12 Q19 14.5 16 16" stroke="${I}" stroke-width="1.3" fill="none"/><circle cx="13" cy="11" r="2.5" fill="none" stroke="${I}" stroke-width="1.2"/><line x1="4" y1="20" x2="20" y2="4" stroke="${C}" stroke-width="1.8" stroke-linecap="round"/></svg>`,

  // Drag handle — 6-dot grip (2 columns × 3 rows)
  dragHandle: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="6" r="1.3" fill="${I}"/><circle cx="15" cy="6" r="1.3" fill="${I}"/><circle cx="9" cy="12" r="1.3" fill="${I}"/><circle cx="15" cy="12" r="1.3" fill="${I}"/><circle cx="9" cy="18" r="1.3" fill="${I}"/><circle cx="15" cy="18" r="1.3" fill="${I}"/></svg>`,

  // Grid — 2×2 squares (subject browser)
  grid: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.2" fill="${CREAM}" stroke="${I}" stroke-width="1.2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.2" fill="${CREAM}" stroke="${I}" stroke-width="1.2"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.2" fill="${CREAM}" stroke="${I}" stroke-width="1.2"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.2" fill="${CREAM}" stroke="${I}" stroke-width="1.2"/></svg>`,

  // Move / 4-directional arrows
  move: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3 L12 21 M3 12 L21 12" stroke="${I}" stroke-width="1.2" stroke-linecap="round"/><path d="M9 6 L12 3 L15 6 M9 18 L12 21 L15 18 M6 9 L3 12 L6 15 M18 9 L21 12 L18 15" stroke="${I}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,

  // Text box — rectangle with T
  textBox: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" fill="${CREAM}" stroke="${I}" stroke-width="1.3"/><path d="M8 9 L16 9 M12 9 L12 16" stroke="${I}" stroke-width="1.4" stroke-linecap="round"/></svg>`,

  // ATTACK — crosshair / target
  attack: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="none" stroke="${I}" stroke-width="1.3"/><circle cx="12" cy="12" r="4" fill="none" stroke="${I}" stroke-width="1.3"/><circle cx="12" cy="12" r="1.4" fill="${C}"/><line x1="12" y1="1.5" x2="12" y2="5" stroke="${I}" stroke-width="1.3" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22.5" stroke="${I}" stroke-width="1.3" stroke-linecap="round"/><line x1="1.5" y1="12" x2="5" y2="12" stroke="${I}" stroke-width="1.3" stroke-linecap="round"/><line x1="19" y1="12" x2="22.5" y2="12" stroke="${I}" stroke-width="1.3" stroke-linecap="round"/></svg>`,

  // Filter — three sliders (lines + knobs)
  filterLines: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="6" x2="21" y2="6" stroke="${I}" stroke-width="1.4" stroke-linecap="round"/><circle cx="9" cy="6" r="2.2" fill="${CREAM}" stroke="${I}" stroke-width="1.4"/><line x1="3" y1="12" x2="21" y2="12" stroke="${I}" stroke-width="1.4" stroke-linecap="round"/><circle cx="15" cy="12" r="2.2" fill="${CREAM}" stroke="${I}" stroke-width="1.4"/><line x1="3" y1="18" x2="21" y2="18" stroke="${I}" stroke-width="1.4" stroke-linecap="round"/><circle cx="7" cy="18" r="2.2" fill="${CREAM}" stroke="${I}" stroke-width="1.4"/></svg>`,

  filterKnob: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="6" fill="${CREAM}" stroke="${I}" stroke-width="1.4"/></svg>`,
};
