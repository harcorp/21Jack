import {
  BOSS_MAX_HP,
  handIdFor,
  idempotencyKeys,
  type ActionRequest,
  type BossView,
  type Card,
  type RoundView,
  type StartRoundRequest,
} from "@21jack/contracts";
import {
  applyAction,
  applyBossDamage,
  createDeck,
  extraStakeFor,
  extraStakeHandIndex,
  InvalidActionError,
  shuffle as cryptoShuffle,
  startRound,
  toRoundView,
} from "@21jack/blackjack-core";
import type { EngineClient } from "./engine";
import { GameError } from "./errors";
import { createKeyedMutex } from "./mutex";
import type { BossRecord, RoundStore, StoredRound } from "./store";

export type GameDeps = {
  engine: EngineClient;
  store: RoundStore;
  /** Injectable for rigged decks in tests. */
  shuffle?: (deck: Card[]) => Card[];
  log?: (msg: string, err?: unknown) => void;
};

export function createGameService({ engine, store, shuffle = cryptoShuffle, log = console.error }: GameDeps) {
  const lock = createKeyedMutex();
  const hid = (roundId: string, i: number) => handIdFor(roundId, i as 0 | 1);

  async function bossView(accountId: string): Promise<BossView> {
    const { hp, defeats } = await store.getBoss(accountId);
    return { hp, maxHp: BOSS_MAX_HP, delta: 0, defeated: false, defeats };
  }

  const view = async (r: StoredRound): Promise<RoundView> =>
    toRoundView(r.state, r.balance, { boss: r.boss?.view ?? (await bossView(r.accountId)) });

  /** Fixes the boss result once, when the round first becomes settled. Returns the record to persist with it. */
  async function withBoss(round: StoredRound): Promise<{ round: StoredRound; boss?: BossRecord }> {
    if (round.state.phase !== "settled" || round.boss) return { round };
    const current = await store.getBoss(round.accountId);
    const result = applyBossDamage(current.hp, round.state.hands.map((h) => h.outcome!));
    const defeats = current.defeats + (result.defeated ? 1 : 0);
    const bossState: BossView = { hp: result.hp, maxHp: BOSS_MAX_HP, delta: result.delta, defeated: result.defeated, defeats };
    return {
      round: { ...round, boss: { view: bossState, hands: result.hands } },
      boss: { hp: result.nextHp, defeats },
    };
  }
  /** Sends one idempotent payout per hand (losses included), then closes the round. Caller holds the round lock. */
  async function payOut(round: StoredRound): Promise<StoredRound> {
    if (round.closed || round.state.phase !== "settled") return round;
    let balance = round.balance;
    for (const [i, hand] of round.state.hands.entries()) {
      const handId = hid(round.roundId, i);
      const res = await engine.payout({
        accountId: round.accountId,
        roundId: round.roundId,
        handId,
        outcome: hand.outcome!,
        finalStake: hand.stake,
        amount: hand.payout ?? 0,
        idempotencyKey: idempotencyKeys.payout(round.roundId, handId),
        ...(round.boss?.hands[i] ? { metadata: { boss: round.boss.hands[i] } } : {}),
      });
      balance = res.balance;
    }
    const closed = { ...round, closed: true, balance, version: round.version + 1 };
    await store.updateRound(closed, round.version);
    return closed;
  }

  /** Settlement failures are retried by a later GET/action/start, so they never lose the round. */
  async function tryPayOut(round: StoredRound): Promise<StoredRound> {
    try {
      return await payOut(round);
    } catch (err) {
      log(`payout failed for round ${round.roundId}, will retry`, err);
      return round;
    }
  }

  async function load(roundId: string): Promise<StoredRound> {
    const round = await store.getRound(roundId);
    if (!round) throw new GameError("NOT_FOUND", "Round not found");
    return round;
  }

  async function start(req: StartRoundRequest): Promise<RoundView> {
    const roundId = req.requestId;
    return lock(`account:${req.accountId}`, async () => {
      const existing = await store.getRound(roundId);
      if (existing) {
        if (existing.accountId !== req.accountId) throw new GameError("CONFLICT", "requestId already used");
        return lock(roundId, async () => view(await tryPayOut(await load(roundId))));
      }

      const open = await store.findOpenRound(req.accountId);
      if (open) {
        const current = await lock(open.roundId, async () => tryPayOut(await load(open.roundId)));
        if (!current.closed) throw new GameError("CONFLICT", "Finish the current round first");
      }

      return lock(roundId, async () => {
        const handId = hid(roundId, 0);
        const bet = await engine.placeBet({
          accountId: req.accountId,
          roundId,
          handId,
          kind: "initial",
          amount: req.bet,
          idempotencyKey: idempotencyKeys.initialBet(roundId, handId),
        });
        const state = startRound({ deck: shuffle(createDeck()), bet: req.bet, roundId, accountId: req.accountId });
        const { round, boss } = await withBoss({
          roundId,
          accountId: req.accountId,
          state,
          version: 1,
          closed: false,
          balance: bet.balance,
          boss: null,
        });
        await store.insertRound(round, boss);
        return view(await tryPayOut(round));
      });
    });
  }

  async function act(roundId: string, req: ActionRequest): Promise<RoundView> {
    return lock(roundId, async () => {
      const round = await load(roundId);
      const prior = await store.getActionResponse(roundId, req.actionId);
      if (prior) return round.state.phase === "settled" ? view(await tryPayOut(round)) : prior;
      if (round.state.phase === "settled") {
        await tryPayOut(round);
        throw new GameError("ROUND_SETTLED", "Round is already settled");
      }

      let extra: number;
      try {
        extra = extraStakeFor(round.state, req.handIndex, req.action);
      } catch (err) {
        if (err instanceof InvalidActionError) throw new GameError("INVALID_ACTION", err.message);
        throw err;
      }

      let balance = round.balance;
      if (extra > 0 && (req.action === "split" || req.action === "double")) {
        const handId = hid(roundId, extraStakeHandIndex(req.handIndex, req.action));
        const key = req.action === "split" ? idempotencyKeys.splitBet : idempotencyKeys.doubleBet;
        const res = await engine.placeBet({
          accountId: round.accountId,
          roundId,
          handId,
          kind: req.action,
          amount: extra,
          idempotencyKey: key(roundId, handId),
        });
        balance = res.balance;
      }

      const { round: next, boss } = await withBoss({
        ...round,
        state: applyAction(round.state, req.handIndex, req.action),
        version: round.version + 1,
        balance,
      });
      await store.updateRound(next, round.version, { action: { actionId: req.actionId, response: await view(next) }, boss });
      return view(await tryPayOut(next));
    });
  }

  async function get(roundId: string): Promise<RoundView> {
    return lock(roundId, async () => view(await tryPayOut(await load(roundId))));
  }

  /** Unfinished round for the account (player turn, or settled while payouts are pending). */
  async function active(accountId: string): Promise<RoundView> {
    const open = await store.findOpenRound(accountId);
    if (!open) throw new GameError("NOT_FOUND", "No active round");
    const round = await lock(open.roundId, async () => tryPayOut(await load(open.roundId)));
    if (round.closed) throw new GameError("NOT_FOUND", "No active round");
    return view(round);
  }

  return { start, act, get, active, boss: bossView };
}
export type GameService = ReturnType<typeof createGameService>;
