import type { Card } from "@21jack/contracts";

/** Owner: P1 (Game Logic). Pure rules only — no I/O. See PLAN.md §4 for the full checklist. */

export type HandValue = { total: number; soft: boolean };

const rankValue = (rank: Card["rank"]): number =>
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
