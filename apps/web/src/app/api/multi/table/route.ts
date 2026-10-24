import { MULTI_TABLE_ID } from "@21jack/contracts";
import { proxy, requireSession } from "@/lib/http";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  return proxy("game", `/tables/${MULTI_TABLE_ID}?accountId=${session.accountId}`);
}
