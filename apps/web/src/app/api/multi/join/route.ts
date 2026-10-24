import { MULTI_TABLE_ID } from "@21jack/contracts";
import { loadAccount } from "@/lib/engine";
import { errorResponse, proxy, requireSession, unavailable } from "@/lib/http";

export async function POST() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const account = await loadAccount(session.accountId);
  if (account.status === "missing") return errorResponse(401, "UNAUTHORIZED", "Sign in first.");
  if (account.status === "error") return unavailable("engine");
  return proxy("game", `/tables/${MULTI_TABLE_ID}/join`, {
    method: "POST",
    body: JSON.stringify({ accountId: session.accountId, username: account.data.username }),
  });
}
