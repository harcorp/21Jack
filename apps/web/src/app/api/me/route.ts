import { errorResponse, relay, requireSession, unavailable } from "@/lib/http";
import { callService } from "@/lib/services";
import { clearSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const res = await callService("engine", `/accounts/${session.accountId}`);
    if (res.status === 404) {
      await clearSession();
      return errorResponse(401, "UNAUTHORIZED", "Account no longer exists. Sign in again.");
    }
    return relay(res);
  } catch {
    return unavailable("engine");
  }
}
