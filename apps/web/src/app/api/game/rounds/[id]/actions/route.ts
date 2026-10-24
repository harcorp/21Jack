import { WebActionRequest } from "@21jack/contracts";
import { parseBody, proxy, requireSession } from "@/lib/http";
import { loadOwnedRound } from "@/lib/rounds";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const body = await parseBody(req, WebActionRequest);
  if (!body.ok) return body.response;
  const { id } = await ctx.params;
  const owned = await loadOwnedRound(id, session.accountId);
  if (!owned.ok) return owned.response;
  return proxy("game", `/rounds/${id}/actions`, { method: "POST", body: JSON.stringify(body.data) });
}
