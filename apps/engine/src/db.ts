import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

export interface Queryable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const SCHEMA = `
CREATE SCHEMA IF NOT EXISTS casino;
CREATE TABLE IF NOT EXISTS casino.accounts (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS casino.transactions (
  id uuid PRIMARY KEY,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  account_id uuid NOT NULL REFERENCES casino.accounts(id),
  type text NOT NULL CHECK (type IN ('deposit', 'bet', 'payout')),
  kind text CHECK (kind IN ('initial', 'split', 'double')),
  amount integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  round_id uuid,
  hand_id text,
  outcome text CHECK (outcome IN ('win', 'blackjack', 'push', 'loss')),
  final_stake integer,
  metadata jsonb,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_one_payout_per_hand
  ON casino.transactions (hand_id) WHERE type = 'payout';
CREATE INDEX IF NOT EXISTS transactions_account_seq ON casino.transactions (account_id, seq DESC);
`;

export function pgliteDb(pg: PGlite): Db {
  return {
    query: async (sql, params) => (await pg.query(sql, params)).rows as never,
    transaction: (fn) => pg.transaction((tx) => fn({ query: async (sql, params) => (await tx.query(sql, params)).rows as never })),
    close: () => pg.close(),
  };
}

export function postgresDb(url: string): Db {
  const sql = postgres(url, { onnotice: () => {} });
  const wrap = (s: postgres.Sql | postgres.TransactionSql): Queryable => ({
    query: (text, params) => s.unsafe(text, (params ?? []) as never[]) as never,
  });
  return {
    ...wrap(sql),
    transaction: (fn) => sql.begin((tx) => fn(wrap(tx))) as never,
    close: () => sql.end(),
  };
}

export async function migrate(db: Db) {
  for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await db.query(stmt);
}

/** Postgres when DATABASE_URL is set, otherwise embedded PGlite under <repo>/.data/engine. */
export async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    db = postgresDb(url);
  } else {
    const dir = fileURLToPath(new URL("../../../.data/engine", import.meta.url));
    mkdirSync(dir, { recursive: true });
    db = pgliteDb(new PGlite(dir));
  }
  await migrate(db);
  return db;
}

export async function createMemoryDb(): Promise<Db> {
  const db = pgliteDb(new PGlite());
  await migrate(db);
  return db;
}
