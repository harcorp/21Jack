import {
  handIdFor,
  payoutFor,
  type Action,
  type Card,
  type HandOutcome,
  type HandStatus,
  type RoundView,
} from "@21jack/contracts";
import { handValue, isBlackjack, isBust, isPair } from "./hand";

export type HandState = {
  cards: Card[];
  stake: number;
  status: HandStatus;
  fromSplit: boolean;
  splitAces: boolean;
  outcome?: HandOutcome;
  payout?: number;
};

export type RoundPhase = "player_turn" | "settled";

/** Serializable round state. Keep server-side: it contains the deck and the hole card. */
export type RoundState = {
  roundId: string;
  accountId: string;
  phase: RoundPhase;
  deck: Card[];
  dealer: Card[];
  hands: HandState[];
  activeHandIndex: number | null;
  /** Coach Mode; missing on old rounds = off. */
  coach?: boolean;
  coachHistory?: { action: Action; recommended: Action; matched: boolean }[];
};

export class InvalidActionError extends Error {
  readonly code = "INVALID_ACTION" as const;
  constructor(message: string) {
    super(message);
    this.name = "InvalidActionError";
  }
}

const clone = (state: RoundState): RoundState => structuredClone(state);

function draw(state: RoundState): Card {
  const card = state.deck.shift();
  if (!card) throw new Error("Deck is empty");
  return card;
}

export function startRound(input: {
  deck: Card[];
  bet: number;
  roundId: string;
  accountId: string;
  coach?: boolean;
}): RoundState {
  if (!Number.isInteger(input.bet) || input.bet <= 0) throw new InvalidActionError("Bet must be a positive integer");
  const state: RoundState = {
    roundId: input.roundId,
    accountId: input.accountId,
    phase: "player_turn",
    deck: [...input.deck],
    dealer: [],
    hands: [{ cards: [], stake: input.bet, status: "playing", fromSplit: false, splitAces: false }],
    activeHandIndex: 0,
    ...(input.coach ? { coach: true, coachHistory: [] } : {}),
  };
  const hand = state.hands[0]!;
  hand.cards.push(draw(state));
  state.dealer.push(draw(state));
  hand.cards.push(draw(state));
  state.dealer.push(draw(state));

  const playerNatural = isBlackjack(hand.cards);
  const dealerNatural = isBlackjack(state.dealer);
  if (playerNatural || dealerNatural) {
    hand.status = playerNatural ? "blackjack" : "stood";
    state.activeHandIndex = null;
    return settle(state);
  }
  return state;
}

export function allowedActions(state: RoundState, handIndex: number): Action[] {
  if (state.phase !== "player_turn" || state.activeHandIndex !== handIndex) return [];
  const hand = state.hands[handIndex];
  if (!hand || hand.status !== "playing" || hand.splitAces) return [];
  const actions: Action[] = ["hit", "stand"];
  if (hand.cards.length === 2) {
    actions.push("double");
    if (state.hands.length === 1 && isPair(hand.cards)) actions.push("split");
  }
  return actions;
}

function assertAllowed(state: RoundState, handIndex: number, action: Action): void {
  if (state.phase === "settled") throw new InvalidActionError("Round is already settled");
  if (!allowedActions(state, handIndex).includes(action)) {
    throw new InvalidActionError(`Action '${action}' is not allowed on hand ${handIndex}`);
  }
}

/** Extra stake to debit before applying split/double (0 for hit/stand). Throws if the move is illegal. */
export function extraStakeFor(state: RoundState, handIndex: number, action: Action): number {
  assertAllowed(state, handIndex, action);
  return action === "split" || action === "double" ? state.hands[handIndex]!.stake : 0;
}

/** Index of the hand that receives the extra stake for split/double. */
export const extraStakeHandIndex = (handIndex: number, action: Action): number => (action === "split" ? 1 : handIndex);

/** Marks a hand finished when it hits 21 or busts. */
function autoFinish(hand: HandState): void {
  if (hand.status !== "playing") return;
  const { total } = handValue(hand.cards);
  if (total > 21) hand.status = "bust";
  else if (total === 21) hand.status = "twentyone";
}

function advance(state: RoundState): RoundState {
  const next = state.hands.findIndex((h) => h.status === "playing");
  if (next !== -1) {
    state.activeHandIndex = next;
    return state;
  }
  state.activeHandIndex = null;
  return settle(playDealer(state));
}

export function applyAction(prev: RoundState, handIndex: number, action: Action): RoundState {
  assertAllowed(prev, handIndex, action);
  const state = clone(prev);
  const hand = state.hands[handIndex]!;

  switch (action) {
    case "hit":
      hand.cards.push(draw(state));
      autoFinish(hand);
      break;
    case "stand":
      hand.status = "stood";
      break;
    case "double":
      hand.stake *= 2;
      hand.cards.push(draw(state));
      hand.status = isBust(hand.cards) ? "bust" : "doubled";
      break;
    case "split": {
      const [first, second] = hand.cards as [Card, Card];
      const splitAces = first.rank === "A";
      const left: HandState = { cards: [first], stake: hand.stake, status: "playing", fromSplit: true, splitAces };
      const right: HandState = { cards: [second], stake: hand.stake, status: "playing", fromSplit: true, splitAces };
      left.cards.push(draw(state));
      right.cards.push(draw(state));
      for (const h of [left, right]) {
        if (splitAces) h.status = handValue(h.cards).total === 21 ? "twentyone" : "stood";
        else autoFinish(h);
      }
      state.hands = [left, right];
      break;
    }
  }
  return advance(state);
}

/** Dealer draws below 17 and stands on every 17 (incl. soft). No draw if every player hand busted. */
export function playDealer(prev: RoundState): RoundState {
  const state = clone(prev);
  if (state.hands.every((h) => h.status === "bust")) return state;
  while (handValue(state.dealer).total < 17) state.dealer.push(draw(state));
  return state;
}

export function outcomeFor(hand: HandState, dealer: Card[]): HandOutcome {
  const playerNatural = isBlackjack(hand.cards, hand.fromSplit);
  const dealerNatural = isBlackjack(dealer);
  if (playerNatural && dealerNatural) return "push";
  if (playerNatural) return "blackjack";
  if (dealerNatural) return "loss";
  const player = handValue(hand.cards).total;
  if (player > 21) return "loss";
  const house = handValue(dealer).total;
  if (house > 21 || player > house) return "win";
  return player === house ? "push" : "loss";
}

/** Resolves every hand against the same dealer hand. */
export function settle(prev: RoundState): RoundState {
  const state = clone(prev);
  for (const hand of state.hands) {
    if (hand.status === "playing") hand.status = "stood";
    hand.outcome = outcomeFor(hand, state.dealer);
    hand.payout = payoutFor(hand.outcome, hand.stake);
  }
  state.phase = "settled";
  state.activeHandIndex = null;
  return state;
}

export function toRoundView(
  state: RoundState,
  balance: number,
  extras: Pick<RoundView, "boss" | "coach"> = {},
): RoundView {
  const settled = state.phase === "settled";
  const dealerValue = handValue(state.dealer);
  return {
    roundId: state.roundId,
    accountId: state.accountId,
    status: settled ? "settled" : "player_turn",
    dealer: settled
      ? { cards: state.dealer.map((c) => ({ ...c })), total: dealerValue.total }
      : { cards: [{ ...state.dealer[0]! }, { hidden: true }], total: null },
    hands: state.hands.map((hand, i) => {
      const value = handValue(hand.cards);
      return {
        handId: handIdFor(state.roundId, i as 0 | 1),
        cards: hand.cards.map((c) => ({ ...c })),
        total: value.total,
        soft: value.soft,
        stake: hand.stake,
        status: hand.status,
        fromSplit: hand.fromSplit,
        splitAces: hand.splitAces,
        ...(hand.outcome !== undefined ? { outcome: hand.outcome, payout: hand.payout ?? 0 } : {}),
        allowedActions: allowedActions(state, i),
      };
    }),
    activeHandIndex: state.activeHandIndex,
    balance,
    ...extras,
  };
}
