import { z } from "zod";
import { Credits, Uuid } from "./ids";
import { Action, Card, HandView, HiddenCard, BossView } from "./game";

/**
 * Multiplayer (WIP): one shared table, up to MULTI_MAX_SEATS players against the same dealer and King.
 * Each seat's participation in a table round gets its own engine roundId (`seatRoundId`), so bets and
 * payouts reuse the single-player idempotency keys (`${seatRoundId}:0|1`) unchanged.
 */
export const MULTI_MAX_SEATS = 5;
export const MULTI_TABLE_ID = "kings-hall";
/** Seconds the betting window stays open after the first bet. */
export const MULTI_BET_SECONDS = 10;
/** Seconds a player has to act before auto-stand. */
export const MULTI_TURN_SECONDS = 30;
/** Seconds results stay on screen before the next betting window. */
export const MULTI_RESULT_SECONDS = 6;

export const TablePhase = z.enum(["waiting", "betting", "playing", "settled"]);
export type TablePhase = z.infer<typeof TablePhase>;

export const SeatView = z.object({
  seat: z.number().int().min(0).max(MULTI_MAX_SEATS - 1),
  accountId: Uuid,
  username: z.string(),
  /** Bet placed for the current/next round, null while not betting. */
  bet: Credits.nullable(),
  /** Engine roundId for this seat in the current table round. */
  seatRoundId: Uuid.nullable(),
  hands: z.array(HandView).max(2),
  /** Sum of payouts of the settled round for this seat. */
  payout: z.number().int().nonnegative().nullable(),
});
export type SeatView = z.infer<typeof SeatView>;

export const TableView = z.object({
  tableId: z.string(),
  phase: TablePhase,
  roundNumber: z.number().int().nonnegative(),
  /** ISO time when the current window ends (betting countdown, turn timer or results), null when idle. */
  deadline: z.iso.datetime().nullable(),
  dealer: z.object({
    cards: z.array(z.union([Card, HiddenCard])),
    total: z.number().int().nullable(),
  }),
  /** Fixed length MULTI_MAX_SEATS; null = empty seat. */
  seats: z.array(SeatView.nullable()).length(MULTI_MAX_SEATS),
  /** Whose turn it is during "playing". */
  turn: z.object({ seat: z.number().int(), handIndex: z.number().int().min(0).max(1) }).nullable(),
  /** The King shared by everyone at this table. */
  boss: BossView,
  /** The requesting player's view. */
  you: z.object({
    seat: z.number().int().nullable(),
    balance: z.number().int().nonnegative().nullable(),
    allowedActions: z.array(Action),
  }),
});
export type TableView = z.infer<typeof TableView>;

// Game service (:3001, x-service-key). Browser-facing equivalents live under /api/multi/* in apps/web.
// GET  /tables/:id?accountId=                              -> TableView
// POST /tables/:id/join     { accountId, username }         -> TableView   (409 CONFLICT when full)
// POST /tables/:id/leave    { accountId }                   -> TableView
// POST /tables/:id/bet      { accountId, bet, requestId }   -> TableView   (402 INSUFFICIENT_FUNDS)
// POST /tables/:id/actions  { accountId, action, handIndex, actionId } -> TableView
export const JoinTableRequest = z.object({ accountId: Uuid, username: z.string().min(1).max(24) });
export const LeaveTableRequest = z.object({ accountId: Uuid });
export const TableBetRequest = z.object({ accountId: Uuid, bet: Credits, requestId: Uuid });
export const TableActionRequest = z.object({
  accountId: Uuid,
  action: Action,
  handIndex: z.number().int().min(0).max(1),
  actionId: Uuid,
});

// Browser API (apps/web, session cookie supplies accountId/username):
// GET  /api/multi/table            -> TableView
// POST /api/multi/join             {}                               -> TableView
// POST /api/multi/leave            {}                               -> TableView
// POST /api/multi/bet              { bet, requestId }               -> TableView
// POST /api/multi/actions          { action, handIndex, actionId }  -> TableView
export const WebTableBetRequest = TableBetRequest.omit({ accountId: true });
export const WebTableActionRequest = TableActionRequest.omit({ accountId: true });
