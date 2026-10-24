import { proxy, requireSession } from "@/lib/http";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const requested = Number(new URL(req.url).searchParams.get("limit") ?? 100);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 500) : 100;
  return proxy("engine", `/admin/transactions?limit=${limit}`);
}
