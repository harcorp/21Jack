import { randomUUID } from "node:crypto";
import type {
  Account,
  AdminAccount,
  AdminTransaction,
  BetKind,
  EngineStats,
  ErrorCode,
  HandOutcome,
  MoneyResponse,
  Transaction,
} from "@21jack/contracts";
import type { Db, Queryable } from "./db";

export class EngineError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface AccountRow {
  id: string;
  username: string;
  balance: number;
  created_at: Date | string;
}

interface TransactionRow {
  id: string;
  account_id: string;
  type: Transaction["type"];
  kind: BetKind | null;
  amount: number;
  balance_after: number;
  round_id: string | null;
  hand_id: string | null;
  outcome: HandOutcome | null;
  final_stake: number | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
}

/** A money write: `amount` is signed (negative = debit). */
export interface Entry {
  accountId: string;
  type: Transaction["type"];
  amount: number;
  idempotencyKey: string;
  kind?: BetKind;
  roundId?: string;
  handId?: string;
  outcome?: HandOutcome;
  finalStake?: number;
  metadata?: Record<string, unknown>;
}

const iso = (d: Date | string) => new Date(d).toISOString();

const toAccount = (r: AccountRow): Account => ({
  id: r.id,
  username: r.username,
  balance: r.balance,
  createdAt: iso(r.created_at),
});

const toTransaction = (r: TransactionRow): Transaction => ({
  id: r.id,
  accountId: r.account_id,
  type: r.type,
  ...(r.kind != null && { kind: r.kind }),
  amount: r.amount,
  balanceAfter: r.balance_after,
  ...(r.round_id != null && { roundId: r.round_id }),
  ...(r.hand_id != null && { handId: r.hand_id }),
  ...(r.outcome != null && { outcome: r.outcome }),
  ...(r.final_stake != null && { finalStake: r.final_stake }),
  ...(r.metadata != null && { metadata: r.metadata }),
  createdAt: iso(r.created_at),
});

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "23505";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class Duplicate extends Error {}

export function createLedger(db: Db) {
  async function getAccount(id: string, q: Queryable = db): Promise<Account> {
    const [row] = UUID_RE.test(id) ? await q.query<AccountRow>("SELECT * FROM casino.accounts WHERE id = $1", [id]) : [];
    if (!row) throw new EngineError("NOT_FOUND", "Account not found");
    return toAccount(row);
  }

  async function findByKey(key: string, q: Queryable = db) {
    const [row] = await q.query<TransactionRow>("SELECT * FROM casino.transactions WHERE idempotency_key = $1", [key]);
    return row;
  }

  function assertSamePayload(row: TransactionRow, e: Entry) {
    const same =
      row.account_id === e.accountId &&
      row.type === e.type &&
      row.amount === e.amount &&
      (row.kind ?? undefined) === e.kind &&
      (row.round_id ?? undefined) === e.roundId &&
      (row.hand_id ?? undefined) === e.handId &&
      (row.outcome ?? undefined) === e.outcome &&
      (row.final_stake ?? undefined) === e.finalStake;
    if (!same) throw new EngineError("CONFLICT", "Idempotency key already used with a different payload");
  }

  async function replay(row: TransactionRow, e: Entry): Promise<MoneyResponse> {
    assertSamePayload(row, e);
    await db.query("UPDATE casino.transactions SET replays = replays + 1 WHERE id = $1", [row.id]);
    const account = await getAccount(row.account_id);
    return { transaction: toTransaction(row), balance: account.balance };
  }

  /** Applies one money entry atomically and exactly once per idempotency key. */
  async function apply(e: Entry): Promise<MoneyResponse> {
    const existing = await findByKey(e.idempotencyKey);
    if (existing) return replay(existing, e);

    try {
      return await db.transaction(async (tx) => {
        const debit = e.amount < 0;
        const [updated] = UUID_RE.test(e.accountId)
          ? await tx.query<{ balance: number }>(
              debit
                ? "UPDATE casino.accounts SET balance = balance - $2::int WHERE id = $1 AND balance >= $2::int RETURNING balance"
                : "UPDATE casino.accounts SET balance = balance + $2::int WHERE id = $1 RETURNING balance",
              [e.accountId, Math.abs(e.amount)],
            )
          : [];
        if (!updated) {
          await getAccount(e.accountId, tx);
          throw new EngineError("INSUFFICIENT_FUNDS", "Insufficient funds");
        }
        const [row] = await tx.query<TransactionRow>(
          `INSERT INTO casino.transactions
             (id, account_id, type, kind, amount, balance_after, round_id, hand_id, outcome, final_stake, metadata, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING *`,
          [
            randomUUID(),
            e.accountId,
            e.type,
            e.kind ?? null,
            e.amount,
            updated.balance,
            e.roundId ?? null,
            e.handId ?? null,
            e.outcome ?? null,
            e.finalStake ?? null,
            e.metadata ? JSON.stringify(e.metadata) : null,
            e.idempotencyKey,
          ],
        );
        // A concurrent request with the same key committed first: roll back our balance change.
        if (!row) throw new Duplicate();
        return { transaction: toTransaction(row), balance: updated.balance };
      });
    } catch (err) {
      if (err instanceof Duplicate || isUniqueViolation(err)) {
        const original = await findByKey(e.idempotencyKey);
        if (original) return replay(original, e);
        throw new EngineError("CONFLICT", "This hand has already been paid");
      }
      throw err;
    }
  }

  return {
    getAccount,

    async createAccount(username: string): Promise<Account> {
      const [row] = await db.query<AccountRow>(
        "INSERT INTO casino.accounts (id, username) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING RETURNING *",
        [randomUUID(), username],
      );
      if (!row) throw new EngineError("CONFLICT", "Username already taken");
      return toAccount(row);
    },

    async findAccountByUsername(username: string): Promise<Account> {
      const [row] = await db.query<AccountRow>("SELECT * FROM casino.accounts WHERE username = $1", [username]);
      if (!row) throw new EngineError("NOT_FOUND", "Account not found");
      return toAccount(row);
    },

    async listTransactions(accountId: string, limit: number): Promise<Transaction[]> {
      await getAccount(accountId);
      const rows = await db.query<TransactionRow>(
        "SELECT * FROM casino.transactions WHERE account_id = $1 ORDER BY seq DESC LIMIT $2",
        [accountId, limit],
      );
      return rows.map(toTransaction);
    },

    apply,

    async adminAccounts(): Promise<AdminAccount[]> {
      const rows = await db.query<AccountRow & { ledger_sum: number }>(
        `SELECT a.*, COALESCE(SUM(t.amount), 0)::int AS ledger_sum
           FROM casino.accounts a LEFT JOIN casino.transactions t ON t.account_id = a.id
          GROUP BY a.id ORDER BY a.created_at DESC`,
      );
      return rows.map((r) => ({ ...toAccount(r), ledgerSum: r.ledger_sum, consistent: r.balance === r.ledger_sum }));
    },

    async adminTransactions(limit: number): Promise<AdminTransaction[]> {
      const rows = await db.query<TransactionRow & { username: string; replays: number }>(
        `SELECT t.*, a.username FROM casino.transactions t JOIN casino.accounts a ON a.id = t.account_id
          ORDER BY t.seq DESC LIMIT $1`,
        [limit],
      );
      return rows.map((r) => ({ ...toTransaction(r), username: r.username, replays: r.replays }));
    },

    async adminStats(): Promise<EngineStats> {
      const [row] = await db.query<EngineStats>(
        `SELECT
           (SELECT COUNT(*) FROM casino.accounts)::int AS "accounts",
           COUNT(*)::int AS "transactions",
           COUNT(*) FILTER (WHERE type = 'deposit')::int AS "deposits",
           COUNT(*) FILTER (WHERE type = 'bet')::int AS "bets",
           COUNT(*) FILTER (WHERE type = 'payout')::int AS "payouts",
           COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0)::int AS "totalDeposited",
           COALESCE(-SUM(amount) FILTER (WHERE type = 'bet'), 0)::int AS "totalStaked",
           COALESCE(SUM(amount) FILTER (WHERE type = 'payout'), 0)::int AS "totalPaid",
           COALESCE(SUM(replays), 0)::int AS "duplicatesBlocked",
           (SELECT COUNT(*) FROM casino.accounts a
             WHERE a.balance <> (SELECT COALESCE(SUM(amount), 0) FROM casino.transactions WHERE account_id = a.id))::int
             AS "inconsistentAccounts"
         FROM casino.transactions`,
      );
      return row!;
    },
  };
}

export type Ledger = ReturnType<typeof createLedger>;
