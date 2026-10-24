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

// GET /accounts?username=<name> -> Account | 404 NOT_FOUND  (username login lookup)

// Admin views (operator console). Additive, read-only.

// GET /admin/accounts -> AdminAccount[]
export const AdminAccount = Account.extend({
  ledgerSum: z.number().int(),
  consistent: z.boolean(),
});
export type AdminAccount = z.infer<typeof AdminAccount>;
export const AdminAccountList = z.array(AdminAccount);

// GET /admin/transactions?limit=100 -> AdminTransaction[] (newest first, all accounts)
export const AdminTransaction = Transaction.extend({
  username: z.string(),
  /** Times this idempotency key was replayed (duplicates blocked). */
  replays: z.number().int().nonnegative(),
});
export type AdminTransaction = z.infer<typeof AdminTransaction>;
export const AdminTransactionList = z.array(AdminTransaction);

// GET /admin/stats -> EngineStats
export const EngineStats = z.object({
  accounts: z.number().int().nonnegative(),
  transactions: z.number().int().nonnegative(),
  deposits: z.number().int().nonnegative(),
  bets: z.number().int().nonnegative(),
  payouts: z.number().int().nonnegative(),
  totalDeposited: z.number().int().nonnegative(),
  totalStaked: z.number().int().nonnegative(),
  totalPaid: z.number().int().nonnegative(),
  duplicatesBlocked: z.number().int().nonnegative(),
  inconsistentAccounts: z.number().int().nonnegative(),
});
export type EngineStats = z.infer<typeof EngineStats>;
