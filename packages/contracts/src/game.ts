import { z } from "zod";
import { Credits, HandId, Uuid } from "./ids";
import { HandOutcome } from "./engine";

/** Game API (apps/game, :3001). Called only by the web proxy /api/game/* with `x-service-key`. */

export const Rank = z.enum(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
export type Rank = z.infer<typeof Rank>;
export const Suit = z.enum(["S", "H", "D", "C"]);
export type Suit = z.infer<typeof Suit>;

export const Card = z.object({ rank: Rank, suit: Suit });
export type Card = z.infer<typeof Card>;

/** The dealer hole card is sent as `{ hidden: true }` until the round is resolved. */
export const HiddenCard = z.object({ hidden: z.literal(true) });
export type HiddenCard = z.infer<typeof HiddenCard>;

export const Action = z.enum(["hit", "stand", "double", "split"]);
export type Action = z.infer<typeof Action>;

export const HandStatus = z.enum(["playing", "stood", "bust", "blackjack", "doubled", "twentyone"]);
export type HandStatus = z.infer<typeof HandStatus>;

export const HandView = z.object({
  handId: HandId,
  cards: z.array(Card),
  total: z.number().int(),
  soft: z.boolean(),
  stake: Credits,
  status: HandStatus,
  fromSplit: z.boolean(),
  splitAces: z.boolean(),
  outcome: HandOutcome.optional(),
  payout: z.number().int().nonnegative().optional(),
  allowedActions: z.array(Action),
});
export type HandView = z.infer<typeof HandView>;

export const RoundStatus = z.enum(["player_turn", "settled"]);
export type RoundStatus = z.infer<typeof RoundStatus>;

export const RoundView = z.object({
  roundId: Uuid,
  accountId: Uuid,
  status: RoundStatus,
  dealer: z.object({
    cards: z.array(z.union([Card, HiddenCard])),
    /** null while the hole card is hidden. */
    total: z.number().int().nullable(),
  }),
  hands: z.array(HandView).min(1).max(2),
  activeHandIndex: z.number().int().min(0).max(1).nullable(),
  balance: z.number().int().nonnegative(),
  /** Twist state goes here once the team picks Coach Mode or Boss Fight. */
  twist: z.record(z.string(), z.unknown()).optional(),
});
export type RoundView = z.infer<typeof RoundView>;

// POST /rounds
export const StartRoundRequest = z.object({
  accountId: Uuid,
  bet: Credits,
  requestId: Uuid,
});
export type StartRoundRequest = z.infer<typeof StartRoundRequest>;

// POST /rounds/:id/actions
export const ActionRequest = z.object({
  action: Action,
  handIndex: z.number().int().min(0).max(1),
  actionId: Uuid,
});
export type ActionRequest = z.infer<typeof ActionRequest>;
