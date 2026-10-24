"use client";

import type { Card, HiddenCard, RoundView } from "@21jack/contracts";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

export type DealerCard = Card | HiddenCard;

/** Reveal timings (ms). */
export const REVEAL_TIMING = {
  /** Time for the opening deal of a round that settles at once (naturals). */
  openingDeal: 1000,
  pause: 600,
  bustPause: 400,
  flip: 600,
  drawGap: 950,
  cardLand: 650,
  finalBeat: 500,
} as const;

export interface DealerReveal {
  /** Dealer cards currently visible (the hole card stays `{ hidden: true }` until flipped). */
  cards: DealerCard[];
  /** Running dealer total of the visible cards; null while the hole card is hidden. */
  total: number | null;
  /** A reveal sequence is playing: hold back everything that shows the outcome. */
  revealing: boolean;
  /** Settled and fully revealed (true at once for resumed rounds and reduced motion). */
  done: boolean;
  /** True on the step where the hole card turns over, so it can use the slower flip. */
  holeFlipping: boolean;
  caption: string | null;
  skip(): void;
}

const HIDDEN: HiddenCard = { hidden: true };

export function dealerTotal(cards: readonly DealerCard[]): number | null {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if ("hidden" in card) return null;
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else total += card.rank === "J" || card.rank === "Q" || card.rank === "K" ? 10 : Number(card.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

type Mode = "waiting" | "anim" | "instant";
interface Track {
  roundId: string;
  mode: Mode;
  /** 0 = hole card hidden, k = cards 0..k visible. */
  step: number;
  finished: boolean;
  fresh: boolean;
}

/**
 * Stages the dealer's settlement one card at a time. Keyed by roundId: re-renders, polling and
 * StrictMode never replay it. A round first seen already settled is shown final at once unless
 * its id equals `freshRoundId` (a round this client just dealt that settled immediately).
 */
export function useDealerReveal(round: RoundView | null, freshRoundId: string | null = null): DealerReveal {
  const reduce = !!useReducedMotion();
  const [track, setTrack] = useState<Track | null>(null);

  let next = track;
  if (round) {
    const settled = round.status === "settled";
    const animatable = settled && !reduce && round.dealer.cards.length >= 2;
    if (!track || track.roundId !== round.roundId) {
      const fresh = round.roundId === freshRoundId;
      next = {
        roundId: round.roundId,
        mode: !settled ? "waiting" : animatable && fresh ? "anim" : "instant",
        step: 0,
        finished: false,
        fresh,
      };
    } else if (track.mode === "waiting" && settled) {
      next = { ...track, mode: animatable ? "anim" : "instant", fresh: false };
    }
    if (next !== track) setTrack(next);
  }

  const cards = round?.dealer.cards ?? [];
  const n = cards.length;
  const animating = !!round && next?.roundId === round.roundId && next.mode === "anim" && !next.finished && !reduce;
  const step = animating ? next!.step : 0;
  const allBust = !!round && round.hands.every((h) => h.status === "bust");

  useEffect(() => {
    if (!animating || !next) return;
    const T = REVEAL_TIMING;
    let wait: number;
    if (step === 0) wait = (next.fresh ? T.openingDeal : 0) + (allBust ? T.bustPause : T.pause);
    else if (step < n - 1) wait = step === 1 ? T.flip + T.drawGap - T.cardLand : T.drawGap;
    else wait = (step === 1 ? T.flip : T.cardLand) + T.finalBeat;
    const id = next.roundId;
    const timer = setTimeout(() => {
      setTrack((t) => {
        if (!t || t.roundId !== id) return t;
        return t.step + 1 >= n ? { ...t, finished: true } : { ...t, step: t.step + 1 };
      });
    }, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, next?.roundId, step, n, allBust]);

  const skip = useCallback(() => setTrack((t) => (t && t.mode === "anim" ? { ...t, finished: true } : t)), []);

  if (!round) return { cards: [], total: null, revealing: false, done: false, holeFlipping: false, caption: null, skip };

  if (animating) {
    const visible = step === 0 ? [cards[0]!, HIDDEN] : cards.slice(0, step + 1);
    return {
      cards: visible,
      total: step === 0 ? null : dealerTotal(visible),
      revealing: true,
      done: false,
      holeFlipping: step === 1,
      caption: step >= 1 && n > 2 ? "The King draws…" : "The King reveals…",
      skip,
    };
  }

  const settled = round.status === "settled";
  return {
    cards,
    total: round.dealer.total ?? (settled ? dealerTotal(cards) : null),
    revealing: false,
    done: settled,
    holeFlipping: false,
    caption: null,
    skip,
  };
}
