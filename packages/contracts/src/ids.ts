import { z } from "zod";

export const Uuid = z.uuid();

/** handId is `${roundId}:0` or `${roundId}:1` (second hand only after a split). */
export const HandId = z.string().regex(/^[0-9a-f-]{36}:[01]$/);

export const handIdFor = (roundId: string, index: 0 | 1) => `${roundId}:${index}`;

/** Idempotency keys enforced as UNIQUE by the engine. */
export const idempotencyKeys = {
  initialBet: (roundId: string, handId: string) => `bet:${roundId}:${handId}:initial`,
  splitBet: (roundId: string, handId: string) => `bet:${roundId}:${handId}:split`,
  doubleBet: (roundId: string, handId: string) => `bet:${roundId}:${handId}:double`,
  payout: (roundId: string, handId: string) => `payout:${roundId}:${handId}`,
};

export const Credits = z.number().int().positive();
