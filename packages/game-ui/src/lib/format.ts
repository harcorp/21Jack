import type { HandOutcome, HandStatus, HandView, RoundView } from "@21jack/contracts";
import type { BannerTone } from "../primitives";

export function handTotalLabel(hand: Pick<HandView, "total" | "soft" | "status">): string {
  if (hand.status === "blackjack") return "Blackjack";
  if (hand.status === "bust") return `Bust ${hand.total}`;
  return hand.soft && hand.total < 21 ? `soft ${hand.total}` : String(hand.total);
}

export const STATUS_LABELS: Record<HandStatus, string> = {
  playing: "Your move",
  stood: "Stood",
  bust: "Bust",
  blackjack: "Blackjack",
  doubled: "Doubled",
  twentyone: "Twenty-one",
};

export const OUTCOME_LABELS: Record<HandOutcome, string> = {
  win: "Win",
  blackjack: "Blackjack!",
  push: "Push",
  loss: "Lose",
};

export function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0";
}

/** Round summary for the result banner; null until the round is settled. */
export function roundResult(round: RoundView): { tone: BannerTone; title: string; detail: string; net: number } | null {
  if (round.status !== "settled") return null;
  const staked = round.hands.reduce((sum, h) => sum + h.stake, 0);
  const paid = round.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0);
  const net = paid - staked;
  const outcomes = round.hands.map((h) => h.outcome);
  const detail = `${signed(net)} credits`;
  if (outcomes.includes("blackjack") && net > 0) return { tone: "blackjack", title: "Blackjack!", detail, net };
  if (round.hands.length === 1) {
    const hand = round.hands[0];
    if (hand?.status === "bust") return { tone: "loss", title: "Bust", detail, net };
    if (round.dealer.total !== null && round.dealer.total > 21 && net > 0)
      return { tone: "win", title: "Dealer busts!", detail, net };
  }
  if (net > 0) return { tone: "win", title: "You win!", detail, net };
  if (net < 0) return { tone: "loss", title: "The king wins", detail, net };
  return { tone: "push", title: "Push", detail: "Stake returned", net };
}

export function dealerTotalLabel(round: RoundView): string {
  const t = round.dealer.total;
  if (t === null) return "?";
  return t > 21 ? `Bust ${t}` : String(t);
}
