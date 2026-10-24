import { ApiError } from "@21jack/contracts";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const friendly: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Not enough credits in your treasury.",
  UNAUTHORIZED: "Your session has ended. Sign in again.",
  SERVICE_UNAVAILABLE: "The castle is unreachable right now. Try again in a moment.",
};

/** Browser fetch against this app's /api routes. Throws ApiRequestError with a readable message. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...init.headers },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiRequestError(0, "NETWORK", "Network error. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const raw = body as { error?: { code?: string; message?: string } } | null;
    const parsed = ApiError.safeParse(body);
    const code = parsed.success ? parsed.data.error.code : (raw?.error?.code ?? "UNKNOWN");
    const message = friendly[code] ?? raw?.error?.message ?? `Request failed (${res.status}).`;
    throw new ApiRequestError(res.status, code, message);
  }
  return body as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
