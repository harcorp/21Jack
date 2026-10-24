import { z } from "zod";
import { CreateAccountRequest, DepositRequest } from "./engine";
import { ActionRequest, StartRoundRequest } from "./game";

/**
 * Browser-facing API served by apps/web (:3000). The account always comes from the signed
 * session cookie, never from the request body.
 *
 * POST   /api/session                 SessionRequest        -> Account   (creates the account or logs in)
 * DELETE /api/session                                       -> 204
 * GET    /api/me                                            -> Account   | 401
 * POST   /api/wallet/deposits         DepositRequest        -> MoneyResponse
 * GET    /api/wallet/transactions                           -> Transaction[]
 * POST   /api/game/rounds             WebStartRoundRequest  -> RoundView
 * GET    /api/game/boss                                     -> BossView
 * GET    /api/game/rounds/active                            -> RoundView | 404
 * GET    /api/game/rounds/:id                               -> RoundView
 * POST   /api/game/rounds/:id/actions WebActionRequest      -> RoundView
 */
export const SessionRequest = CreateAccountRequest;
export type SessionRequest = z.infer<typeof SessionRequest>;

export const WebDepositRequest = DepositRequest;
export type WebDepositRequest = z.infer<typeof WebDepositRequest>;

export const WebStartRoundRequest = StartRoundRequest.omit({ accountId: true });
export type WebStartRoundRequest = z.infer<typeof WebStartRoundRequest>;

export const WebActionRequest = ActionRequest;
export type WebActionRequest = z.infer<typeof WebActionRequest>;

export const SESSION_COOKIE = "21jack_session";
