export interface OnboardingBeat {
  readonly lines: readonly [string, string];
}

export const BEATS: readonly OnboardingBeat[] = [
  {
    lines: [
      "They called us cockroaches. Gutter generation.",
      "We picked the names up. We're still wearing them.",
    ],
  },
  {
    lines: [
      "Different states, different faiths, one square.",
      "At Jantar Mantar, that was all of us.",
    ],
  },
  {
    lines: [
      "Drag a face of power into the square.",
      "The crowd closes in. That's Gutter Generation.",
    ],
  },
  {
    lines: [
      "Exam papers leaked. The answers we got were thin.",
      "So we started watching. That's what the eyes are.",
    ],
  },
  {
    lines: [
      "They met us with tear gas and lathis.",
      "We answered with memes. Then a minister stepped down.",
    ],
  },
  {
    lines: [
      "No single leader to arrest.",
      "Thousands moved together. Your turn.",
    ],
  },
] as const;
