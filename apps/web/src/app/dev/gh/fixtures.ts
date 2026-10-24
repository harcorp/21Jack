import type { Action, BossView, Card, HandOutcome, HandStatus, HandView, HiddenCard } from "@21jack/contracts";

const ROUND = "00000000-0000-4000-8000-000000000000";

/** "Ks" -> King of spades, "10h" -> ten of hearts, "down" -> hidden card. */
export function c(code: string): Card | HiddenCard {
  if (code === "down") return { hidden: true };
  const suit = code.slice(-1).toUpperCase() as Card["suit"];
  const rank = code.slice(0, -1).toUpperCase() as Card["rank"];
  return { rank, suit };
}

export function cards(...codes: string[]): Array<Card | HiddenCard> {
  return codes.map(c);
}

export function hand(
  codes: string[],
  o: {
    total: number;
    soft?: boolean;
    stake?: number;
    status?: HandStatus;
    outcome?: HandOutcome;
    payout?: number;
    index?: 0 | 1;
    fromSplit?: boolean;
    splitAces?: boolean;
    allowed?: Action[];
  },
): HandView {
  return {
    handId: `${ROUND}:${o.index ?? 0}`,
    cards: codes.map(c) as Card[],
    total: o.total,
    soft: o.soft ?? false,
    stake: o.stake ?? 10,
    status: o.status ?? "playing",
    fromSplit: o.fromSplit ?? false,
    splitAces: o.splitAces ?? false,
    outcome: o.outcome,
    payout: o.payout,
    allowedActions: o.allowed ?? [],
  };
}

export function boss(hp: number, o: Partial<BossView> = {}): BossView {
  return { hp, maxHp: 10, delta: 0, defeated: false, defeats: 0, ...o };
}
