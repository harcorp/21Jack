import { randomUUID } from "node:crypto";
import { handIdFor, idempotencyKeys, MULTI_TABLE_ID, type Action, type Card, type TableView } from "@21jack/contracts";
import {
  applyTableAction,
  assertCanBet,
  createDeck,
  createTable,
  joinTable,
  leaveTable,
  participants,
  placeTableBet,
  seatOf,
  shuffle as cryptoShuffle,
  tableExtraStake,
  TableError,
  tickTable,
  toTableView,
  type TableState,
  type TableTimings,
} from "@21jack/blackjack-core";
import type { EngineClient } from "./engine";
import { GameError } from "./errors";
import { createKeyedMutex } from "./mutex";

export type TableDeps = {
  engine: EngineClient;
  shuffle?: (deck: Card[]) => Card[];
  now?: () => number;
  timings?: TableTimings;
  log?: (msg: string, err?: unknown) => void;
};

/**
 * WIP: the shared table lives in memory, so a restart drops the current round. Money stays safe because every
 * engine call uses the deterministic idempotency keys of `@21jack/contracts`.
 */
export function createTableService({ engine, shuffle = cryptoShuffle, now = Date.now, timings, log = console.error }: TableDeps) {
  const lock = createKeyedMutex();
  let state: TableState = createTable(MULTI_TABLE_ID, timings);
  const balances = new Map<string, number>();
  /** requestId -> pending/done bet, so a retry reuses its seatRoundId and never debits twice. */
  const bets = new Map<string, { accountId: string; roundNumber: number; seatRoundId: string; done: boolean }>();
  const actions = new Set<string>();

  const wrap = <T>(fn: () => T): T => {
    try {
      return fn();
    } catch (err) {
      if (err instanceof TableError) throw new GameError(err.code, err.message);
      throw err;
    }
  };

  async function payOut(): Promise<void> {
    if (state.phase !== "settled") return;
    for (const p of participants(state)) {
      for (const [i, hand] of p.hands.entries()) {
        if (hand.paid) continue;
        const roundId = p.seatRoundId!;
        const handId = handIdFor(roundId, i as 0 | 1);
        try {
          const res = await engine.payout({
            accountId: p.accountId,
            roundId,
            handId,
            outcome: hand.outcome!,
            finalStake: hand.stake,
            amount: hand.payout ?? 0,
            idempotencyKey: idempotencyKeys.payout(roundId, handId),
            metadata: { boss: hand.boss, multi: { tableId: state.tableId, roundNumber: state.roundNumber } },
          });
          hand.paid = true;
          balances.set(p.accountId, res.balance);
        } catch (err) {
          log(`table payout failed for ${handId}, will retry`, err);
          return;
        }
      }
    }
  }

  async function tick(): Promise<void> {
    state = tickTable(state, now(), () => shuffle(createDeck()));
    await payOut();
    state = tickTable(state, now(), () => shuffle(createDeck()));
  }

  function assertTable(tableId: string): void {
    if (tableId !== MULTI_TABLE_ID) throw new GameError("NOT_FOUND", "Table not found");
  }

  /** Lazy timers run before and after every request, under one mutex. */
  function run(tableId: string, accountId: string | undefined, fn?: () => Promise<void>): Promise<TableView> {
    assertTable(tableId);
    return lock("table", async () => {
      await tick();
      if (fn) {
        await fn();
        await tick();
      }
      return toTableView(state, { ...(accountId ? { accountId } : {}), balance: accountId ? (balances.get(accountId) ?? null) : null });
    });
  }

  const get = (tableId: string, accountId?: string) => run(tableId, accountId);

  const join = (tableId: string, req: { accountId: string; username: string }) =>
    run(tableId, req.accountId, async () => {
      state = wrap(() => joinTable(state, req.accountId, req.username));
    });

  const leave = (tableId: string, req: { accountId: string }) =>
    run(tableId, req.accountId, async () => {
      state = leaveTable(state, req.accountId, now());
    });

  const bet = (tableId: string, req: { accountId: string; bet: number; requestId: string }) =>
    run(tableId, req.accountId, async () => {
      let entry = bets.get(req.requestId);
      if (entry) {
        if (entry.accountId !== req.accountId) throw new GameError("CONFLICT", "requestId already used");
        if (entry.done) return;
        const seat = state.seats[seatOf(state, req.accountId)];
        if (!seat || seat.bet !== null) return;
      }
      wrap(() => assertCanBet(state, req.accountId));
      const roundNumber = state.phase === "waiting" ? state.roundNumber + 1 : state.roundNumber;
      if (!entry || entry.roundNumber !== roundNumber) {
        entry = { accountId: req.accountId, roundNumber, seatRoundId: randomUUID(), done: false };
        bets.set(req.requestId, entry);
      }
      const seatRoundId = entry.seatRoundId;
      const handId = handIdFor(seatRoundId, 0);
      const res = await engine.placeBet({
        accountId: req.accountId,
        roundId: seatRoundId,
        handId,
        kind: "initial",
        amount: req.bet,
        idempotencyKey: idempotencyKeys.initialBet(seatRoundId, handId),
      });
      balances.set(req.accountId, res.balance);
      state = wrap(() => placeTableBet(state, { accountId: req.accountId, bet: req.bet, seatRoundId, now: now() }));
      entry.done = true;
    });

  const act = (tableId: string, req: { accountId: string; action: Action; handIndex: number; actionId: string }) =>
    run(tableId, req.accountId, async () => {
      const key = `${req.accountId}/${req.actionId}`;
      if (actions.has(key)) return;
      const extra = wrap(() => tableExtraStake(state, req.accountId, req.handIndex, req.action));
      if (extra > 0 && (req.action === "split" || req.action === "double")) {
        const seat = state.seats[seatOf(state, req.accountId)]!;
        const roundId = seat.seatRoundId!;
        const handId = handIdFor(roundId, req.action === "split" ? 1 : (req.handIndex as 0 | 1));
        const idem = req.action === "split" ? idempotencyKeys.splitBet : idempotencyKeys.doubleBet;
        const res = await engine.placeBet({
          accountId: req.accountId,
          roundId,
          handId,
          kind: req.action,
          amount: extra,
          idempotencyKey: idem(roundId, handId),
        });
        balances.set(req.accountId, res.balance);
      }
      state = wrap(() => applyTableAction(state, { ...req, now: now() }));
      actions.add(key);
    });

  return { get, join, leave, bet, act, peek: () => state };
}
export type TableService = ReturnType<typeof createTableService>;
