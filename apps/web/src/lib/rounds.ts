import "server-only";
import { RoundView, Uuid } from "@21jack/contracts";
import { errorResponse, relay, unavailable } from "@/lib/http";
import { callService } from "@/lib/services";

export type OwnedRound = { ok: true; round: RoundView } | { ok: false; response: Response };

/** Loads a round and hides it (404) unless it belongs to the session account. */
export async function loadOwnedRound(roundId: string, accountId: string): Promise<OwnedRound> {
  const notFound = { ok: false as const, response: errorResponse(404, "NOT_FOUND", "Round not found.") };
  if (!Uuid.safeParse(roundId).success) return notFound;
  let res: Response;
  try {
    res = await callService("game", `/rounds/${roundId}`);
  } catch {
    return { ok: false, response: unavailable("game") };
  }
  if (!res.ok) return { ok: false, response: await relay(res) };
  const parsed = RoundView.safeParse(await res.json());
  if (!parsed.success) return { ok: false, response: errorResponse(502, "VALIDATION_ERROR", "Unexpected round payload.") };
  if (parsed.data.accountId !== accountId) return notFound;
  return { ok: true, round: parsed.data };
}
