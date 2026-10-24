import type { Action, Card, CoachView } from "@21jack/contracts";
import { handValue, isPair, rankValue } from "./hand";
import { allowedActions, type RoundState } from "./round";
import { recommend } from "./strategy";

export type CoachEntry = CoachView["history"][number];

const upValue = (card: Card): number => (card.rank === "A" ? 11 : rankValue(card.rank));
const upLabel = (up: number): string => (up === 11 ? "an Ace" : up === 8 ? "an 8" : `a ${up}`);

/** One short teaching sentence from Claudalf explaining `recommended` for this hand. */
export function explain(cards: Card[], dealerUp: Card, recommended: Action): string {
  const up = upValue(dealerUp);
  const vs = upLabel(up);
  const weak = up <= 6;

  if (recommended === "split" && isPair(cards)) {
    const rank = cards[0]!.rank;
    if (rank === "A") return "Always split Aces: two fresh starts at 21 beat one clumsy 12.";
    if (rankValue(rank) === 8) return "Always split 8s: two chances beat one bad 16.";
    return `Split the ${rank}s against ${vs}: he is weak, so make him face two hands.`;
  }

  const { total, soft } = handValue(cards);
  const kind = soft ? "Soft" : "Hard";

  if (recommended === "double") {
    if (soft) return `Soft ${total} against ${vs}: no card can bust you, so double while he is weak.`;
    return weak
      ? `${total} against ${vs}: double and strike while he is weak.`
      : `${total} against ${vs}: your start beats his. Double and press the advantage.`;
  }

  if (recommended === "hit") {
    if (soft) {
      return total >= 18
        ? `Soft ${total} against ${vs} is weaker than it looks. Hit.`
        : `Soft ${total} cannot bust with one card. Hit and improve it.`;
    }
    if (total <= 11) return `${total} cannot bust with one card. Hit without fear.`;
    if (weak) return `Hard ${total} against ${vs}: he is not weak enough yet. Hit.`;
    const holds = up === 11 ? "a strong hand" : String(up + 10);
    return `Hard ${total} against ${vs}: the King likely holds ${holds}. Hit.`;
  }

  if (recommended === "stand") {
    if (total >= 17 || (soft && total >= 18)) return `${kind} ${total} is strong enough. Stand and let him come to you.`;
    if (weak) return `${kind} ${total} against ${vs}: let the King risk the bust. Stand.`;
    return `${kind} ${total} against ${vs}: patience is the wiser spell. Stand.`;
  }

  return `${kind} ${total} against ${vs}: trust the plan and ${recommended}.`;
}

/** Recommendation for the active hand; both null when no hand is in play. */
export function coachHint(state: RoundState): Pick<CoachView, "recommended" | "reason"> {
  const i = state.activeHandIndex;
  const hand = i === null ? undefined : state.hands[i];
  const recommended = hand && i !== null ? recommend(hand.cards, state.dealer[0]!, allowedActions(state, i)) : null;
  if (!hand || !recommended) return { recommended: null, reason: null };
  return { recommended, reason: explain(hand.cards, state.dealer[0]!, recommended) };
}

/** Records the player's move against the recommendation. Call BEFORE applying the action. No-op when coach is off. */
export function recordCoach(state: RoundState, handIndex: number, action: Action): RoundState {
  const hand = state.hands[handIndex];
  if (!state.coach || !hand) return state;
  const recommended = recommend(hand.cards, state.dealer[0]!, allowedActions(state, handIndex));
  if (!recommended) return state;
  const entry: CoachEntry = { action, recommended, matched: action === recommended };
  return { ...state, coachHistory: [...(state.coachHistory ?? []), entry] };
}

/** CoachView for a coached round; undefined when coach is off. */
export function coachViewFor(state: RoundState): CoachView | undefined {
  if (!state.coach) return undefined;
  const history = (state.coachHistory ?? []).map((e) => ({ ...e }));
  return {
    ...coachHint(state),
    history,
    score: { matched: history.filter((e) => e.matched).length, total: history.length },
  };
}
