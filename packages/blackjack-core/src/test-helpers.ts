import type { Card, Rank } from "@21jack/contracts";

export const c = (rank: Rank, suit: Card["suit"] = "S"): Card => ({ rank, suit });
export const cards = (...ranks: Rank[]): Card[] => ranks.map((r) => c(r));

/** Deck dealt in order: player, dealer up, player, dealer hole, then draws. Padded with low cards. */
export const rigged = (...ranks: Rank[]): Card[] => [...cards(...ranks), ...cards(...(Array(20).fill("2") as Rank[]))];
