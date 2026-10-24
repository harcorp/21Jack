import type { Action, Card } from "@21jack/contracts";
import { handValue, isPair, rankValue } from "./hand";

const upValue = (card: Card): number => (card.rank === "A" ? 11 : rankValue(card.rank));
const between = (up: number, lo: number, hi: number) => up >= lo && up <= hi;

/** Ideal S17 basic-strategy move (double after split allowed, no surrender), before availability checks. */
function ideal(cards: Card[], up: number, canSplit: boolean): Action | "doubleOrStand" {
  if (canSplit && isPair(cards)) {
    const pair = rankValue(cards[0]!.rank);
    if (cards[0]!.rank === "A" || pair === 8) return "split";
    if (pair === 9 && (between(up, 2, 6) || up === 8 || up === 9)) return "split";
    if ((pair === 7 || pair === 2 || pair === 3) && between(up, 2, 7)) return "split";
    if (pair === 6 && between(up, 2, 6)) return "split";
    if (pair === 4 && between(up, 5, 6)) return "split";
  }
  const { total, soft } = handValue(cards);
  const two = cards.length === 2;
  if (soft) {
    if (total >= 19) return "stand";
    if (total === 18) {
      if (two && between(up, 3, 6)) return "doubleOrStand";
      return up >= 9 ? "hit" : "stand";
    }
    if (two && total === 17 && between(up, 3, 6)) return "double";
    if (two && (total === 16 || total === 15) && between(up, 4, 6)) return "double";
    if (two && (total === 14 || total === 13) && between(up, 5, 6)) return "double";
    return "hit";
  }
  if (total >= 17) return "stand";
  if (total >= 13) return up <= 6 ? "stand" : "hit";
  if (total === 12) return between(up, 4, 6) ? "stand" : "hit";
  if (two && total === 11) return up === 11 ? "hit" : "double";
  if (two && total === 10) return up <= 9 ? "double" : "hit";
  if (two && total === 9) return between(up, 3, 6) ? "double" : "hit";
  return "hit";
}

/** Basic-strategy recommendation restricted to `allowed`; null when no action is available. */
export function recommend(cards: Card[], dealerUpCard: Card, allowed: Action[]): Action | null {
  if (allowed.length === 0) return null;
  const up = upValue(dealerUpCard);
  let move = ideal(cards, up, allowed.includes("split"));
  if (move === "doubleOrStand") move = allowed.includes("double") ? "double" : "stand";
  if (move === "double" && !allowed.includes("double")) move = "hit";
  if (!allowed.includes(move)) return allowed.includes("stand") ? "stand" : (allowed[0] ?? null);
  return move;
}
