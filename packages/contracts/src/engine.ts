import { z } from "zod";
import { Credits, HandId, Uuid } from "./ids";

/** Casino engine API (apps/engine, :3002). Every request needs the `x-service-key` header. */

export const Account = z.object({
  id: Uuid,
  username: z.string(),
  balance: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});
export type Account = z.infer<typeof Account>;

export const TransactionType = z.enum(["deposit", "bet", "payout"]);
export const BetKind = z.enum(["initial", "split", "double"]);
export type BetKind = z.infer<typeof BetKind>;
export const HandOutcome = z.enum(["win", "blackjack", "push", "loss"]);
export type HandOutcome = z.infer<typeof HandOutcome>;

export const Transaction = z.object({
  id: Uuid,
  accountId: Uuid,
  type: TransactionType,
  kind: BetKind.optional(),
  /** Signed: deposits and payouts positive, bets negative. */
  amount: z.number().int(),
  balanceAfter: z.number().int().nonnegative(),
  roundId: Uuid.optional(),
  handId: HandId.optional(),
  outcome: HandOutcome.optional(),
  finalStake: z.number().int().optional(),
  /** Twist data (e.g. coach score or boss damage) once the team picks one. */
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.iso.datetime(),
});
export type Transaction = z.infer<typeof Transaction>;

// POST /accounts
export const CreateAccountRequest = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
});
export type CreateAccountRequest = z.infer<typeof CreateAccountRequest>;

// POST /accounts/:id/deposits
export const DepositRequest = z.object({
  amount: Credits,
  idempotencyKey: z.string().min(8),
});
export type DepositRequest = z.infer<typeof DepositRequest>;

export const MoneyResponse = z.object({ transaction: Transaction, balance: z.number().int().nonnegative() });
export type MoneyResponse = z.infer<typeof MoneyResponse>;

// POST /bets  -> MoneyResponse | 402 INSUFFICIENT_FUNDS
export const BetRequest = z.object({
  accountId: Uuid,
  roundId: Uuid,
  handId: HandId,
  kind: BetKind,
  amount: Credits,
  idempotencyKey: z.string(),
});
export type BetRequest = z.infer<typeof BetRequest>;

// POST /payouts -> MoneyResponse (amount may be 0 for a loss, still recorded once)
export const PayoutRequest = z.object({
  accountId: Uuid,
  roundId: Uuid,
  handId: HandId,
  outcome: HandOutcome,
  finalStake: Credits,
  amount: z.number().int().nonnegative(),
  idempotencyKey: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type PayoutRequest = z.infer<typeof PayoutRequest>;

// GET /accounts/:id/transactions?limit=50 -> Transaction[] (newest first)
export const TransactionList = z.array(Transaction);

/** House payout rule: win and natural pay 2x final stake, push returns the stake, loss returns 0. */
export const payoutFor = (outcome: HandOutcome, finalStake: number) =>
  outcome === "win" || outcome === "blackjack" ? finalStake * 2 : outcome === "push" ? finalStake : 0;
