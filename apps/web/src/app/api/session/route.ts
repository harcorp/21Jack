import { Account, SessionRequest } from "@21jack/contracts";
import { errorResponse, parseBody, relay, unavailable } from "@/lib/http";
import { callService } from "@/lib/services";
import { clearSession, setSession } from "@/lib/session";

async function findOrCreate(username: string): Promise<Response> {
  const lookup = await callService("engine", `/accounts?username=${encodeURIComponent(username)}`);
  if (lookup.status !== 404) return lookup;
  const created = await callService("engine", "/accounts", { method: "POST", body: JSON.stringify({ username }) });
  // Someone registered the same name in between: log in to it instead.
  if (created.status === 409) return callService("engine", `/accounts?username=${encodeURIComponent(username)}`);
  return created;
}

export async function POST(req: Request) {
  const body = await parseBody(req, SessionRequest);
  if (!body.ok) return body.response;

  let res: Response;
  try {
    res = await findOrCreate(body.data.username);
  } catch {
    return unavailable("engine");
  }
  if (!res.ok) return relay(res);

  const account = Account.safeParse(await res.json());
  if (!account.success) return errorResponse(502, "VALIDATION_ERROR", "Unexpected account payload from engine.");
  await setSession(account.data.id);
  return Response.json(account.data, { status: 200 });
}

export async function DELETE() {
  await clearSession();
  return new Response(null, { status: 204 });
}
