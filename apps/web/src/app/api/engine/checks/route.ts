import { requireSession, unavailable } from "@/lib/http";
import { runMoneyChecks } from "@/lib/money-checks";

export async function POST() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    return Response.json(await runMoneyChecks());
  } catch {
    return unavailable("engine");
  }
}
