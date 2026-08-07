export interface OnboardingBeat {
  readonly lines: readonly [string, string];
}

export const BEATS: readonly OnboardingBeat[] = [
  {
    lines: [
      "Someone with a podium and a title looked down at all of us and picked a word.",
      "Small. Disposable. Something you step on.",
    ],
  },
  {
    lines: [
      "We didn't argue. We didn't ask for the word back.",
      "We just... kept it. Turned out it fit better than they meant it to.",
    ],
  },
  {
    lines: [
      "They're used to being watched from a distance — a podium, a headline, a screen.",
      "Not from this close. Not surrounded.",
    ],
  },
  {
    lines: [
      "This is the crowd now. It doesn't have a face — it has thousands.",
      "Move. They'll notice.",
    ],
  },
] as const;
