import type { Card } from "@21jack/contracts";

export type HandValue = { total: number; soft: boolean };

export const rankValue = (rank: Card["rank"]): number =>
  rank === "A" ? 1 : rank === "J" || rank === "Q" || rank === "K" ? 10 : Number(rank);

/** Aces count 11 when that does not bust the hand, otherwise 1. */
export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === "A") aces++;
  }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}

/** Two-card 21 that did not come from a split. */
export const isBlackjack = (cards: Card[], fromSplit = false): boolean =>
  !fromSplit && cards.length === 2 && handValue(cards).total === 21;

/** Same rank only: K+Q is not a pair. */
export const isPair = (cards: Card[]): boolean => cards.length === 2 && cards[0]!.rank === cards[1]!.rank;

export const isBust = (cards: Card[]): boolean => handValue(cards).total > 21;
