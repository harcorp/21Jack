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

/**
 * UUID v4 that also works in browsers on plain HTTP (e.g. http://10.0.0.41:3000 on the LAN),
 * where crypto.randomUUID is unavailable outside secure contexts but getRandomValues is not.
 */
type WebCrypto = { randomUUID?: () => string; getRandomValues<T extends Uint8Array>(array: T): T };

export function newId(): string {
  const { crypto } = globalThis as unknown as { crypto: WebCrypto };
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
