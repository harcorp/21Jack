import { requireSession } from "@/lib/http";
import { loadOwnedRound } from "@/lib/rounds";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { id } = await ctx.params;
  const owned = await loadOwnedRound(id, session.accountId);
  return owned.ok ? Response.json(owned.round) : owned.response;
}
