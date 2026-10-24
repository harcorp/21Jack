import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { BOSS_MAX_HP, type BossPayoutMetadata, type BossView, type RoundView } from "@21jack/contracts";
import type { RoundState } from "@21jack/blackjack-core";
import { GameError } from "./errors";

/** `closed` = settled AND every payout acknowledged by the engine. */
export type StoredRound = {
  roundId: string;
  accountId: string;
  state: RoundState;
  version: number;
  closed: boolean;
  balance: number;
  /** Boss result fixed once at settlement; null while the round is open. */
  boss: RoundBoss | null;
};

export type RoundBoss = { view: BossView; hands: BossPayoutMetadata[] };
export type BossRecord = { hp: number; defeats: number };
const defaultBoss = (): BossRecord => ({ hp: BOSS_MAX_HP, defeats: 0 });

export type ProcessedAction = { actionId: string; response: RoundView };

export interface RoundStore {
  getRound(roundId: string): Promise<StoredRound | null>;
  findOpenRound(accountId: string): Promise<StoredRound | null>;
  /** Throws CONFLICT if the account already has an open round. `boss` is saved in the same transaction. */
  insertRound(round: StoredRound, boss?: BossRecord): Promise<void>;
  /** Optimistic write on `expectedVersion`; action and boss are saved in the same transaction. */
  updateRound(round: StoredRound, expectedVersion: number, opts?: { action?: ProcessedAction; boss?: BossRecord }): Promise<void>;
  getBoss(accountId: string): Promise<BossRecord>;
  getActionResponse(roundId: string, actionId: string): Promise<RoundView | null>;
  close(): Promise<void>;
}

export function createMemoryStore(): RoundStore {
  const rounds = new Map<string, StoredRound>();
  const actions = new Map<string, RoundView>();
  const bosses = new Map<string, BossRecord>();
  const copy = <T>(v: T): T => structuredClone(v);
  return {
    async getRound(id) {
      const r = rounds.get(id);
      return r ? copy(r) : null;
    },
    async findOpenRound(accountId) {
      for (const r of rounds.values()) if (r.accountId === accountId && !r.closed) return copy(r);
      return null;
    },
    async insertRound(round, boss) {
      if (rounds.has(round.roundId)) throw new GameError("CONFLICT", "Round already exists");
      for (const r of rounds.values()) {
        if (r.accountId === round.accountId && !r.closed) throw new GameError("CONFLICT", "Account already has an open round");
      }
      rounds.set(round.roundId, copy(round));
      if (boss) bosses.set(round.accountId, { ...boss });
    },
    async updateRound(round, expectedVersion, { action, boss } = {}) {
      const current = rounds.get(round.roundId);
      if (!current || current.version !== expectedVersion) throw new Error(`Stale round version for ${round.roundId}`);
      rounds.set(round.roundId, copy(round));
      if (action) actions.set(`${round.roundId}/${action.actionId}`, copy(action.response));
      if (boss) bosses.set(round.accountId, { ...boss });
    },
    async getBoss(accountId) {
      return { ...(bosses.get(accountId) ?? defaultBoss()) };
    },
    async getActionResponse(roundId, actionId) {
      const v = actions.get(`${roundId}/${actionId}`);
      return v ? copy(v) : null;
    },
    async close() {},
  };
}

/** Minimal SQL surface shared by PGlite and postgres.js. */
type Db = {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
  transaction<R>(fn: (q: Db) => Promise<R>): Promise<R>;
  exec(text: string): Promise<void>;
  close(): Promise<void>;
};

const SCHEMA = `
CREATE SCHEMA IF NOT EXISTS game;
CREATE TABLE IF NOT EXISTS game.rounds (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL,
  state jsonb NOT NULL,
  version integer NOT NULL,
  closed boolean NOT NULL DEFAULT false,
  balance integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE game.rounds ADD COLUMN IF NOT EXISTS boss jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS rounds_one_open_per_account ON game.rounds (account_id) WHERE NOT closed;
CREATE TABLE IF NOT EXISTS game.actions (
  round_id uuid NOT NULL REFERENCES game.rounds(id),
  action_id uuid NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, action_id)
);
CREATE TABLE IF NOT EXISTS game.bosses (
  account_id uuid PRIMARY KEY,
  hp integer NOT NULL,
  defeats integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

type RoundRow = {
  id: string;
  account_id: string;
  state: RoundState;
  version: number;
  closed: boolean;
  balance: number;
  boss: RoundBoss | null;
};
const fromRow = (r: RoundRow): StoredRound => ({
  roundId: r.id,
  accountId: r.account_id,
  state: r.state,
  version: r.version,
  closed: r.closed,
  balance: r.balance,
  boss: r.boss ?? null,
});
const COLUMNS = "id, account_id, state, version, closed, balance, boss";
const json = (v: unknown) => (v == null ? null : JSON.stringify(v));

async function upsertBoss(q: Db, accountId: string, boss: BossRecord): Promise<void> {
  await q.query(
    `INSERT INTO game.bosses (account_id, hp, defeats) VALUES ($1, $2, $3)
     ON CONFLICT (account_id) DO UPDATE SET hp = excluded.hp, defeats = excluded.defeats, updated_at = now()`,
    [accountId, boss.hp, boss.defeats],
  );
}

function pgliteDb(pg: PGlite): Db {
  type Q = Pick<PGlite, "query">;
  const wrap = (q: Q): Db => ({
    query: async <T>(text: string, params: unknown[] = []) => (await q.query<T>(text, params)).rows,
    transaction: (fn) => pg.transaction((tx) => fn(wrap(tx))),
    exec: async (text) => void (await pg.exec(text)),
    close: () => pg.close(),
  });
  return wrap(pg);
}

function postgresDb(sql: postgres.Sql | postgres.TransactionSql): Db {
  return {
    query: async <T>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as any[])) as unknown as T[],
    transaction: (fn) => (sql as postgres.Sql).begin((tx) => fn(postgresDb(tx))) as never,
    exec: async (text) => void (await sql.unsafe(text)),
    close: () => (sql as postgres.Sql).end(),
  };
}

export async function createSqlStore(db: Db): Promise<RoundStore> {
  await db.exec(SCHEMA);
  return {
    async getRound(id) {
      const [row] = await db.query<RoundRow>(`SELECT ${COLUMNS} FROM game.rounds WHERE id = $1`, [id]);
      return row ? fromRow(row) : null;
    },
    async findOpenRound(accountId) {
      const [row] = await db.query<RoundRow>(
        `SELECT ${COLUMNS} FROM game.rounds WHERE account_id = $1 AND NOT closed LIMIT 1`,
        [accountId],
      );
      return row ? fromRow(row) : null;
    },
    async insertRound(r, boss) {
      await db.transaction(async (tx) => {
        const rows = await tx.query(
          `INSERT INTO game.rounds (id, account_id, state, version, closed, balance, boss)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb) ON CONFLICT DO NOTHING RETURNING id`,
          [r.roundId, r.accountId, JSON.stringify(r.state), r.version, r.closed, r.balance, json(r.boss)],
        );
        if (rows.length === 0) throw new GameError("CONFLICT", "Account already has an open round");
        if (boss) await upsertBoss(tx, r.accountId, boss);
      });
    },
    async updateRound(r, expectedVersion, { action, boss } = {}) {
      await db.transaction(async (tx) => {
        const rows = await tx.query(
          `UPDATE game.rounds SET state = $1::jsonb, version = $2, closed = $3, balance = $4, boss = $5::jsonb,
             updated_at = now()
           WHERE id = $6 AND version = $7 RETURNING id`,
          [JSON.stringify(r.state), r.version, r.closed, r.balance, json(r.boss), r.roundId, expectedVersion],
        );
        if (rows.length === 0) throw new Error(`Stale round version for ${r.roundId}`);
        if (boss) await upsertBoss(tx, r.accountId, boss);
        if (action) {
          await tx.query(
            `INSERT INTO game.actions (round_id, action_id, response) VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING`,
            [r.roundId, action.actionId, JSON.stringify(action.response)],
          );
        }
      });
    },
    async getActionResponse(roundId, actionId) {
      const [row] = await db.query<{ response: RoundView }>(
        `SELECT response FROM game.actions WHERE round_id = $1 AND action_id = $2`,
        [roundId, actionId],
      );
      return row?.response ?? null;
    },
    async getBoss(accountId) {
      const [row] = await db.query<BossRecord>(`SELECT hp, defeats FROM game.bosses WHERE account_id = $1`, [accountId]);
      return row ? { hp: row.hp, defeats: row.defeats } : defaultBoss();
    },
    close: () => db.close(),
  };
}

/** In-memory PGlite when `dataDir` is omitted (tests). */
export async function createPgliteStore(dataDir?: string): Promise<RoundStore> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  return createSqlStore(pgliteDb(await PGlite.create(dataDir)));
}

const DEFAULT_DATA_DIR = fileURLToPath(new URL("../../../.data/game", import.meta.url));

/** Postgres when DATABASE_URL is set, otherwise embedded PGlite at <repo>/.data/game. */
export async function createStoreFromEnv(env: NodeJS.ProcessEnv): Promise<RoundStore> {
  if (env.DATABASE_URL) return createSqlStore(postgresDb(postgres(env.DATABASE_URL, { onnotice: () => {} })));
  return createPgliteStore(DEFAULT_DATA_DIR);
}
