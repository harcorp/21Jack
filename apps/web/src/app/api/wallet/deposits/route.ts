import { WebDepositRequest } from "@21jack/contracts";
import { parseBody, proxy, requireSession } from "@/lib/http";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const body = await parseBody(req, WebDepositRequest);
  if (!body.ok) return body.response;
  return proxy("engine", `/accounts/${session.accountId}/deposits`, {
    method: "POST",
    body: JSON.stringify(body.data),
  });
}
