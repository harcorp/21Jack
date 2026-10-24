import "server-only";
import { apiError, type ErrorCode } from "@21jack/contracts";
import type { z } from "zod";
import { callService } from "./services";
import { getSessionAccountId } from "./session";

export const errorResponse = (status: number, code: ErrorCode, message: string) =>
  Response.json(apiError(code, message), { status });

export const unavailable = (service: string) =>
  Response.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: `The ${service} service is unavailable. Try again shortly.` } },
    { status: 503 },
  );

/** Re-emits an upstream response with its status code and JSON body untouched. */
export async function relay(res: Response) {
  if (res.status === 204) return new Response(null, { status: 204 });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

type Service = Parameters<typeof callService>[0];

export async function proxy(service: Service, path: string, init?: RequestInit) {
  try {
    return relay(await callService(service, path, init));
  } catch {
    return unavailable(service);
  }
}

export type BodyResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<BodyResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: errorResponse(400, "VALIDATION_ERROR", "Request body must be JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return { ok: false, response: errorResponse(400, "VALIDATION_ERROR", message) };
  }
  return { ok: true, data: parsed.data };
}

export type SessionResult = { ok: true; accountId: string } | { ok: false; response: Response };

export async function requireSession(): Promise<SessionResult> {
  const accountId = await getSessionAccountId();
  if (!accountId) return { ok: false, response: errorResponse(401, "UNAUTHORIZED", "Sign in first.") };
  return { ok: true, accountId };
}
