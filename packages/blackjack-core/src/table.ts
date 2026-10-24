import {
  BOSS_MAX_HP,
  handIdFor,
  MULTI_BET_SECONDS,
  MULTI_MAX_SEATS,
  MULTI_RESULT_SECONDS,
  MULTI_TURN_SECONDS,
  payoutFor,
  type Action,
  type BossPayoutMetadata,
  type Card,
  type HandView,
  type TablePhase,
  type TableView,
} from "@21jack/contracts";
import { applyBossDamage } from "./boss";
import { handValue, isBlackjack, isBust, isPair } from "./hand";
import { outcomeFor, type HandState } from "./round";

/** Shared multiplayer table: pure rules, no I/O. The service owns money and persistence. */

export type TableHand = HandState & { boss?: BossPayoutMetadata; paid?: boolean };

export type TableSeat = {
  accountId: string;
  username: string;
  bet: number | null;
  seatRoundId: string | null;
  hands: TableHand[];
};

export type TableBoss = { hp: number; maxHp: number; delta: number; defeated: boolean; defeats: number; nextHp: number };

export type TableTimings = { betMs: number; turnMs: number; resultMs: number };

export const DEFAULT_TABLE_TIMINGS: TableTimings = {
  betMs: MULTI_BET_SECONDS * 1000,
  turnMs: MULTI_TURN_SECONDS * 1000,
  resultMs: MULTI_RESULT_SECONDS * 1000,
};

export type TableState = {
  tableId: string;
  phase: TablePhase;
  roundNumber: number;
  /** Epoch ms when the current window ends. */
  deadline: number | null;
  deck: Card[];
  dealer: Card[];
  seats: (TableSeat | null)[];
  /** Players who left with a bet in the current round; still dealt (auto-stood) and paid. */
  departed: TableSeat[];
  turn: { seat: number; handIndex: number } | null;
  boss: TableBoss;
  timings: TableTimings;
};

export type TableErrorCode = "CONFLICT" | "INVALID_ACTION";

export class TableError extends Error {
  constructor(
    readonly code: TableErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TableError";
  }
}

export const MULTI_BOSS_MAX_HP = BOSS_MAX_HP * 2;

export function createTable(tableId: string, timings: TableTimings = DEFAULT_TABLE_TIMINGS): TableState {
  return {
    tableId,
    phase: "waiting",
    roundNumber: 0,
    deadline: null,
    deck: [],
    dealer: [],
    seats: Array.from({ length: MULTI_MAX_SEATS }, () => null),
    departed: [],
    turn: null,
    boss: { hp: MULTI_BOSS_MAX_HP, maxHp: MULTI_BOSS_MAX_HP, delta: 0, defeated: false, defeats: 0, nextHp: MULTI_BOSS_MAX_HP },
    timings,
  };
}

const clone = (s: TableState): TableState => structuredClone(s);

export const seatOf = (s: TableState, accountId: string): number => s.seats.findIndex((x) => x?.accountId === accountId);

/** Seats and departed players that placed a bet this round, in deal order. */
export const participants = (s: TableState): TableSeat[] => [
  ...s.seats.filter((x): x is TableSeat => x !== null && x.bet !== null),
  ...s.departed,
];

function draw(s: TableState): Card {
  const card = s.deck.shift();
  if (!card) throw new Error("Deck is empty");
  return card;
}

export function joinTable(prev: TableState, accountId: string, username: string): TableState {
  if (seatOf(prev, accountId) !== -1) return prev;
  const free = prev.seats.findIndex((x) => x === null);
  if (free === -1) throw new TableError("CONFLICT", "The table is full");
  const s = clone(prev);
  s.seats[free] = { accountId, username, bet: null, seatRoundId: null, hands: [] };
  return s;
}

export function leaveTable(prev: TableState, accountId: string, now: number): TableState {
  const i = seatOf(prev, accountId);
  if (i === -1) return prev;
  const s = clone(prev);
  const seat = s.seats[i]!;
  s.seats[i] = null;
  if (seat.bet === null) return s;
  for (const h of seat.hands) if (h.status === "playing") h.status = "stood";
  s.departed.push(seat);
  if (s.phase === "playing" && s.turn?.seat === i) return advanceTurn(s, now);
  return s;
}

/** Throws if the account cannot bet now. */
export function assertCanBet(s: TableState, accountId: string): void {
  if (s.phase !== "waiting" && s.phase !== "betting") throw new TableError("INVALID_ACTION", "Betting is closed");
  const i = seatOf(s, accountId);
  if (i === -1) throw new TableError("INVALID_ACTION", "Join the table first");
  if (s.seats[i]!.bet !== null) throw new TableError("CONFLICT", "You already placed a bet this round");
}

/** Records an already-debited bet. The first bet of a round opens the betting window. */
export function placeTableBet(prev: TableState, input: { accountId: string; bet: number; seatRoundId: string; now: number }): TableState {
  assertCanBet(prev, input.accountId);
  if (!Number.isInteger(input.bet) || input.bet <= 0) throw new TableError("INVALID_ACTION", "Bet must be a positive integer");
  const s = clone(prev);
  const seat = s.seats[seatOf(s, input.accountId)]!;
  seat.bet = input.bet;
  seat.seatRoundId = input.seatRoundId;
  if (s.phase === "waiting") {
    s.phase = "betting";
    s.roundNumber += 1;
    s.deadline = input.now + s.timings.betMs;
  }
  return s;
}

function deal(prev: TableState, deck: Card[], now: number): TableState {
  const s = clone(prev);
  s.deck = [...deck];
  s.dealer = [];
  const players = participants(s);
  for (const p of players) p.hands = [{ cards: [], stake: p.bet!, status: "playing", fromSplit: false, splitAces: false }];
  for (let r = 0; r < 2; r++) {
    for (const p of players) p.hands[0]!.cards.push(draw(s));
    s.dealer.push(draw(s));
  }
  for (const p of players) if (isBlackjack(p.hands[0]!.cards)) p.hands[0]!.status = "blackjack";
  for (const p of s.departed) if (p.hands[0]!.status === "playing") p.hands[0]!.status = "stood";
  s.phase = "playing";
  if (isBlackjack(s.dealer)) {
    for (const p of players) for (const h of p.hands) if (h.status === "playing") h.status = "stood";
    return settleTable(s, now);
  }
  return advanceTurn(s, now);
}

function nextTurn(s: TableState): { seat: number; handIndex: number } | null {
  for (const [seat, x] of s.seats.entries()) {
    if (!x || x.bet === null) continue;
    const handIndex = x.hands.findIndex((h) => h.status === "playing");
    if (handIndex !== -1) return { seat, handIndex };
  }
  return null;
}

function advanceTurn(s: TableState, now: number): TableState {
  s.turn = nextTurn(s);
  if (s.turn) {
    s.deadline = now + s.timings.turnMs;
    return s;
  }
  return settleTable(playTableDealer(s), now);
}

function playTableDealer(s: TableState): TableState {
  const hands = participants(s).flatMap((p) => p.hands);
  if (hands.every((h) => h.status === "bust" || h.status === "blackjack")) return s;
  while (handValue(s.dealer).total < 17) s.dealer.push(draw(s));
  return s;
}

function settleTable(s: TableState, now: number): TableState {
  const hands = participants(s).flatMap((p) => p.hands);
  for (const h of hands) {
    if (h.status === "playing") h.status = "stood";
    h.outcome = outcomeFor(h, s.dealer);
    h.payout = payoutFor(h.outcome, h.stake);
  }
  const start = s.boss.hp;
  const result = applyBossDamage(start, hands.map((h) => h.outcome!), s.boss.maxHp);
  hands.forEach((h, i) => (h.boss = result.hands[i]));
  s.boss = {
    ...s.boss,
    hp: result.hp,
    delta: result.delta,
    defeated: result.defeated,
    defeats: s.boss.defeats + (result.defeated ? 1 : 0),
    nextHp: result.nextHp,
  };
  s.phase = "settled";
  s.turn = null;
  s.deadline = now + s.timings.resultMs;
  return s;
}

export function tableAllowedActions(s: TableState, seat: number, handIndex: number): Action[] {
  if (s.phase !== "playing" || s.turn?.seat !== seat || s.turn.handIndex !== handIndex) return [];
  const x = s.seats[seat];
  const hand = x?.hands[handIndex];
  if (!x || !hand || hand.status !== "playing" || hand.splitAces) return [];
  const actions: Action[] = ["hit", "stand"];
  if (hand.cards.length === 2) {
    actions.push("double");
    if (x.hands.length === 1 && isPair(hand.cards)) actions.push("split");
  }
  return actions;
}

/** Validates the move and returns the extra stake to debit first (split/double), else 0. */
export function tableExtraStake(s: TableState, accountId: string, handIndex: number, action: Action): number {
  const seat = seatOf(s, accountId);
  if (s.phase !== "playing") throw new TableError("INVALID_ACTION", "No hand is being played");
  if (seat === -1 || s.turn?.seat !== seat) throw new TableError("INVALID_ACTION", "It is not your turn");
  if (!tableAllowedActions(s, seat, handIndex).includes(action)) {
    throw new TableError("INVALID_ACTION", `Action '${action}' is not allowed on hand ${handIndex}`);
  }
  return action === "split" || action === "double" ? s.seats[seat]!.hands[handIndex]!.stake : 0;
}

function autoFinish(hand: HandState): void {
  if (hand.status !== "playing") return;
  const { total } = handValue(hand.cards);
  if (total > 21) hand.status = "bust";
  else if (total === 21) hand.status = "twentyone";
}

export function applyTableAction(prev: TableState, input: { accountId: string; handIndex: number; action: Action; now: number }): TableState {
  tableExtraStake(prev, input.accountId, input.handIndex, input.action);
  const s = clone(prev);
  const seat = s.seats[seatOf(s, input.accountId)]!;
  const hand = seat.hands[input.handIndex]!;
  switch (input.action) {
    case "hit":
      hand.cards.push(draw(s));
      autoFinish(hand);
      break;
    case "stand":
      hand.status = "stood";
      break;
    case "double":
      hand.stake *= 2;
      hand.cards.push(draw(s));
      hand.status = isBust(hand.cards) ? "bust" : "doubled";
      break;
    case "split": {
      const [first, second] = hand.cards as [Card, Card];
      const splitAces = first.rank === "A";
      const split = [first, second].map((c): TableHand => ({ cards: [c, draw(s)], stake: hand.stake, status: "playing", fromSplit: true, splitAces }));
      for (const h of split) {
        if (splitAces) h.status = handValue(h.cards).total === 21 ? "twentyone" : "stood";
        else autoFinish(h);
      }
      seat.hands = split;
      break;
    }
  }
  return advanceTurn(s, input.now);
}

/** True once every settled hand has been acknowledged by the engine. */
export const allPaid = (s: TableState): boolean => participants(s).every((p) => p.hands.every((h) => h.paid));

/**
 * Lazy timers: closes betting, auto-stands on turn timeout and starts the next round when due.
 * `deck` is only called when a round is dealt.
 */
export function tickTable(prev: TableState, now: number, deck: () => Card[]): TableState {
  let s = prev;
  for (let guard = 0; guard < 10; guard++) {
    if (s.phase === "betting") {
      const seated = s.seats.filter((x): x is TableSeat => x !== null);
      const everyoneIn = seated.length > 0 && seated.every((x) => x.bet !== null);
      if (now >= s.deadline! || everyoneIn) {
        s = deal(s, deck(), now);
        continue;
      }
    } else if (s.phase === "playing" && s.turn && now >= s.deadline!) {
      const x = s.seats[s.turn.seat]!;
      s = applyTableAction(s, { accountId: x.accountId, handIndex: s.turn.handIndex, action: "stand", now });
      continue;
    } else if (s.phase === "settled" && now >= s.deadline! && allPaid(s)) {
      s = resetTable(s);
      continue;
    }
    break;
  }
  return s;
}

function resetTable(prev: TableState): TableState {
  const s = clone(prev);
  s.phase = "waiting";
  s.deadline = null;
  s.deck = [];
  s.dealer = [];
  s.departed = [];
  s.turn = null;
  for (const x of s.seats) if (x) Object.assign(x, { bet: null, seatRoundId: null, hands: [] });
  s.boss = { ...s.boss, hp: s.boss.nextHp, delta: 0, defeated: false };
  return s;
}

export function toTableView(s: TableState, viewer: { accountId?: string; balance: number | null }): TableView {
  const settled = s.phase === "settled";
  const you = viewer.accountId ? seatOf(s, viewer.accountId) : -1;
  const dealer =
    s.dealer.length === 0
      ? { cards: [], total: null }
      : settled
        ? { cards: s.dealer.map((c) => ({ ...c })), total: handValue(s.dealer).total }
        : { cards: [{ ...s.dealer[0]! }, { hidden: true as const }], total: null };
  const seats = s.seats.map((x, seat) => {
    if (!x) return null;
    const hands = x.hands.map((h, i): HandView => {
      const v = handValue(h.cards);
      return {
        handId: handIdFor(x.seatRoundId!, i as 0 | 1),
        cards: h.cards.map((c) => ({ ...c })),
        total: v.total,
        soft: v.soft,
        stake: h.stake,
        status: h.status,
        fromSplit: h.fromSplit,
        splitAces: h.splitAces,
        ...(h.outcome !== undefined ? { outcome: h.outcome, payout: h.payout ?? 0 } : {}),
        allowedActions: seat === you ? tableAllowedActions(s, seat, i) : [],
      };
    });
    return {
      seat,
      accountId: x.accountId,
      username: x.username,
      bet: x.bet,
      seatRoundId: x.seatRoundId,
      hands,
      payout: settled && x.bet !== null ? x.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0) : null,
    };
  });
  const { nextHp: _nextHp, ...boss } = s.boss;
  return {
    tableId: s.tableId,
    phase: s.phase,
    roundNumber: s.roundNumber,
    deadline: s.deadline === null ? null : new Date(s.deadline).toISOString(),
    dealer,
    seats,
    turn: s.turn ? { ...s.turn } : null,
    boss,
    you: {
      seat: you === -1 ? null : you,
      balance: viewer.balance,
      allowedActions: you !== -1 && s.turn?.seat === you ? tableAllowedActions(s, you, s.turn.handIndex) : [],
    },
  };
}
