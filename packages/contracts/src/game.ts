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
  /** Boss Fight twist: the dealer king's health for this account. */
  boss: z.lazy(() => BossView).optional(),
  /** Coach Mode twist (stretch goal). */
  coach: z.lazy(() => CoachView).optional(),
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

// GET /rounds/active?accountId=<id> -> RoundView | 404 NOT_FOUND  (resume an unfinished round)

/**
 * Round lifecycle notes:
 * - `requestId` from StartRoundRequest IS the roundId, so a retried start reuses the same
 *   idempotency keys and can never debit twice.
 * - One unfinished round per account: POST /rounds while one is open -> 409 CONFLICT.
 */

/**
 * Boss Fight twist. The dealer king has BOSS_MAX_HP hearts per account, persisted by apps/game.
 * Applied once per round at settlement, per hand: win -1, blackjack -2, push 0, loss +1 (capped at max).
 * At 0 hp the king is defeated ("Kingslayer"), `defeats` +1 and hp resets to max for the next round.
 */
export const BOSS_MAX_HP = 5;
export const BOSS_DAMAGE: Record<HandOutcome, number> = { win: -1, blackjack: -2, push: 0, loss: 1 };

export const BossView = z.object({
  hp: z.number().int().min(0),
  maxHp: z.number().int().positive(),
  /** hp change caused by this round (0 until settled). */
  delta: z.number().int(),
  /** true only on the round that brought the king to 0 hp (hp shown is 0 for that round). */
  defeated: z.boolean(),
  defeats: z.number().int().nonnegative(),
});
export type BossView = z.infer<typeof BossView>;

/** Stored in engine payout `metadata.boss` for each hand so history can show damage and Kingslayer. */
export const BossPayoutMetadata = z.object({
  damage: z.number().int(),
  hpAfter: z.number().int().min(0),
  defeated: z.boolean(),
});
export type BossPayoutMetadata = z.infer<typeof BossPayoutMetadata>;

// GET /boss?accountId=<id> -> BossView (delta 0, defeated false) for the lobby.

/** Coach Mode (stretch): basic-strategy hint for the active hand and how the player followed it. */
export const CoachView = z.object({
  recommended: Action.nullable(),
  history: z.array(z.object({ action: Action, recommended: Action, matched: z.boolean() })),
  score: z.object({ matched: z.number().int(), total: z.number().int() }),
});
export type CoachView = z.infer<typeof CoachView>;
