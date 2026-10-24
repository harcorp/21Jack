import { proxy, requireSession } from "@/lib/http";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  return proxy("game", `/boss?accountId=${session.accountId}`);
}
