import { randomInt } from "node:crypto";
import { Rank, Suit, type Card } from "@21jack/contracts";

/** Returns an integer in [0, maxExclusive). */
export type Rng = (maxExclusive: number) => number;

export const cryptoRandomInt: Rng = (maxExclusive) => randomInt(maxExclusive);

export function createDeck(): Card[] {
  return Suit.options.flatMap((suit) => Rank.options.map((rank) => ({ rank, suit })));
}

/** Fisher–Yates; returns a new array. */
export function shuffle(deck: Card[], rng: Rng = cryptoRandomInt): Card[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
