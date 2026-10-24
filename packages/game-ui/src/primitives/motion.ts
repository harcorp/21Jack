/** Stepped easing for the pixel feel: snaps progress into `n` discrete frames. */
export const stepped =
  (n: number) =>
  (t: number): number =>
    t >= 1 ? 1 : Math.floor(t * n) / n;

export const DEAL_SPRING = { type: "spring", stiffness: 260, damping: 24 } as const;
export const DEAL_STAGGER = 0.12;
