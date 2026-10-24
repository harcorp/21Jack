import type { BossView, Card, CoachView, HandView, RoundView } from "@21jack/contracts";

const ACCOUNT = "5d2c8a10-7b3e-4f61-9a2d-0c1e2f3a4b5c";
const rid = (n: number) => `0f6b2c4e-1a2b-4c3d-8e4f-${String(n).padStart(12, "0")}`;
const c = (code: string): Card => {
  const suit = code.slice(-1) as Card["suit"];
  return { rank: code.slice(0, -1) as Card["rank"], suit };
};
const cards = (...codes: string[]) => codes.map(c);
const HIDDEN = { hidden: true } as const;

function hand(roundId: string, index: 0 | 1, h: Omit<HandView, "handId" | "fromSplit" | "splitAces"> & Partial<HandView>): HandView {
  return { handId: `${roundId}:${index}`, fromSplit: false, splitAces: false, ...h };
}

function round(n: number, r: Omit<RoundView, "roundId" | "accountId" | "hands"> & { hands: ((id: string) => HandView)[] }): RoundView {
  const roundId = rid(n);
  return { roundId, accountId: ACCOUNT, ...r, hands: r.hands.map((f) => f(roundId)) };
}

const base = {
  playerTurn: round(1, {
    status: "player_turn",
    dealer: { cards: [c("KS"), HIDDEN], total: null },
    activeHandIndex: 0,
    balance: 990,
    hands: [
      (id) =>
        hand(id, 0, {
          cards: cards("AH", "6C"),
          total: 17,
          soft: true,
          stake: 10,
          status: "playing",
          allowedActions: ["hit", "stand", "double"],
        }),
    ],
  }),
  pairCanSplit: round(2, {
    status: "player_turn",
    dealer: { cards: [c("6D"), HIDDEN], total: null },
    activeHandIndex: 0,
    balance: 975,
    hands: [
      (id) =>
        hand(id, 0, {
          cards: cards("8S", "8D"),
          total: 16,
          soft: false,
          stake: 25,
          status: "playing",
          allowedActions: ["hit", "stand", "double", "split"],
        }),
    ],
  }),
  splitSecondHand: round(3, {
    status: "player_turn",
    dealer: { cards: [c("6D"), HIDDEN], total: null },
    activeHandIndex: 1,
    balance: 950,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("8S", "3D", "9C"), total: 20, soft: false, stake: 25, status: "stood", fromSplit: true, allowedActions: [] }),
      (id) =>
        hand(id, 1, {
          cards: cards("8D", "5C"),
          total: 13,
          soft: false,
          stake: 25,
          status: "playing",
          fromSplit: true,
          allowedActions: ["hit", "stand", "double"],
        }),
    ],
  }),
  doubledWin: round(4, {
    status: "settled",
    dealer: { cards: cards("10C", "7S"), total: 17 },
    activeHandIndex: null,
    balance: 1020,
    hands: [
      (id) =>
        hand(id, 0, {
          cards: cards("5S", "6H", "9D"),
          total: 20,
          soft: false,
          stake: 20,
          status: "doubled",
          outcome: "win",
          payout: 40,
          allowedActions: [],
        }),
    ],
  }),
  settledWin: round(5, {
    status: "settled",
    dealer: { cards: cards("10D", "6S", "QC"), total: 26 },
    activeHandIndex: null,
    balance: 1010,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("KH", "9S"), total: 19, soft: false, stake: 10, status: "stood", outcome: "win", payout: 20, allowedActions: [] }),
    ],
  }),
  settledBust: round(6, {
    status: "settled",
    dealer: { cards: cards("9C", "7H"), total: 16 },
    activeHandIndex: null,
    balance: 990,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("10S", "6D", "9H"), total: 25, soft: false, stake: 10, status: "bust", outcome: "loss", payout: 0, allowedActions: [] }),
    ],
  }),
  blackjack: round(7, {
    status: "settled",
    dealer: { cards: cards("8H", "9C"), total: 17 },
    activeHandIndex: null,
    balance: 1010,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("AS", "KD"), total: 21, soft: true, stake: 10, status: "blackjack", outcome: "blackjack", payout: 20, allowedActions: [] }),
    ],
  }),
  push: round(8, {
    status: "settled",
    dealer: { cards: cards("QS", "8C"), total: 18 },
    activeHandIndex: null,
    balance: 1000,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("10H", "8D"), total: 18, soft: false, stake: 10, status: "stood", outcome: "push", payout: 10, allowedActions: [] }),
    ],
  }),
  splitSettled: round(9, {
    status: "settled",
    dealer: { cards: cards("6D", "10H", "4S"), total: 20 },
    activeHandIndex: null,
    balance: 975,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("8S", "3D", "9C"), total: 20, soft: false, stake: 25, status: "stood", fromSplit: true, outcome: "push", payout: 25, allowedActions: [] }),
      (id) =>
        hand(id, 1, { cards: cards("8D", "5C", "KH"), total: 23, soft: false, stake: 25, status: "bust", fromSplit: true, outcome: "loss", payout: 0, allowedActions: [] }),
    ],
  }),
} satisfies Record<string, RoundView>;

/** Same table as `from`, under a fresh roundId, with Boss Fight state attached. */
function withBoss(from: RoundView, n: number, boss: Omit<BossView, "maxHp"> & { maxHp?: number }): RoundView {
  const roundId = rid(n);
  return {
    ...from,
    roundId,
    hands: from.hands.map((h, i) => ({ ...h, handId: `${roundId}:${i}` })),
    boss: { maxHp: 5, ...boss },
  };
}

const coachRounds = {
  coachPlayerTurn: {
    ...base.playerTurn,
    roundId: rid(31),
    hands: base.playerTurn.hands.map((h, i) => ({ ...h, handId: `${rid(31)}:${i}` })),
    coach: {
      recommended: "hit",
      reason: "Soft 17 against a King: no single card can bust you, and 17 rarely wins. Hit.",
      history: [],
      score: { matched: 0, total: 0 },
    } satisfies CoachView,
  },
  coachAfterMistake: round(32, {
    status: "player_turn",
    dealer: { cards: [c("5D"), HIDDEN], total: null },
    activeHandIndex: 0,
    balance: 990,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("10S", "2C", "3H"), total: 15, soft: false, stake: 10, status: "playing", allowedActions: ["hit", "stand"] }),
    ],
    coach: {
      recommended: "stand",
      reason: "Hard 15 against a 5: the King must draw and often busts. Stand.",
      history: [{ action: "hit", recommended: "stand", matched: false }],
      score: { matched: 0, total: 1 },
    },
  }),
  coachSettled: round(33, {
    status: "settled",
    dealer: { cards: cards("6D", "10H", "7S"), total: 23 },
    activeHandIndex: null,
    balance: 1075,
    hands: [
      (id) =>
        hand(id, 0, { cards: cards("8S", "3D", "9C"), total: 20, soft: false, stake: 50, status: "doubled", fromSplit: true, outcome: "win", payout: 100, allowedActions: [] }),
      (id) =>
        hand(id, 1, { cards: cards("8D", "5C", "6H"), total: 19, soft: false, stake: 25, status: "stood", fromSplit: true, outcome: "win", payout: 50, allowedActions: [] }),
    ],
    coach: {
      recommended: null,
      reason: null,
      history: [
        { action: "split", recommended: "split", matched: true },
        { action: "double", recommended: "double", matched: true },
        { action: "hit", recommended: "stand", matched: false },
        { action: "stand", recommended: "stand", matched: true },
      ],
      score: { matched: 3, total: 4 },
    },
  }),
} satisfies Record<string, RoundView>;

/** Sample rounds for the /dev/table preview. The betting state is `round = null`. */
export const fixtures = {
  ...base,
  bossMidFight: withBoss(base.playerTurn, 21, { hp: 3, delta: 0, defeated: false, defeats: 0 }),
  bossHit: withBoss(base.settledWin, 22, { hp: 2, delta: -1, defeated: false, defeats: 0 }),
  bossBlackjackHit: withBoss(base.blackjack, 23, { hp: 1, delta: -2, defeated: false, defeats: 1 }),
  bossDefeated: withBoss(base.doubledWin, 24, { hp: 0, delta: -1, defeated: true, defeats: 2 }),
  bossHealed: withBoss(base.settledBust, 25, { hp: 4, delta: 1, defeated: false, defeats: 0 }),
  ...coachRounds,
} satisfies Record<string, RoundView>;

/** Boss state for the betting screen (`TableView` with `round = null`). */
export const bossFixture: BossView = { hp: 3, maxHp: 5, delta: 0, defeated: false, defeats: 1 };
