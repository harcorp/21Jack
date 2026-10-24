import { MULTI_TABLE_ID, WebTableActionRequest } from "@21jack/contracts";
import { parseBody, proxy, requireSession } from "@/lib/http";

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const body = await parseBody(req, WebTableActionRequest);
  if (!body.ok) return body.response;
  return proxy("game", `/tables/${MULTI_TABLE_ID}/actions`, {
    method: "POST",
    body: JSON.stringify({ ...body.data, accountId: session.accountId }),
  });
}
