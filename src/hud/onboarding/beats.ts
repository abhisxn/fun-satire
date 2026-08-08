export interface OnboardingBeat {
  readonly lines: readonly [string, string];
}

export const BEATS: readonly OnboardingBeat[] = [
  {
    lines: [
      "Another promise came and went. Then a word, tossed down like it would end the conversation:",
      "disposable.",
    ],
  },
  {
    lines: [
      "We didn't hand the word back. We picked it up and wore it.",
      "Turns out it fits better than they meant it to.",
    ],
  },
  {
    lines: [
      "They're built for watching from far away — a podium, a headline, a scroll.",
      "Not for this. Not for being surrounded.",
    ],
  },
  {
    lines: [
      "No leader to arrest. No face to blame. Just thousands, done waiting.",
      "Move. They'll notice.",
    ],
  },
] as const;
