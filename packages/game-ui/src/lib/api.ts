import type { ApiError, RoundView } from "@21jack/contracts";

export class GameApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Not enough credits for that move",
  UNAUTHORIZED: "Your session has ended. Please sign in again.",
  ROUND_SETTLED: "This round is already over.",
};

async function toError(res: Response): Promise<GameApiError> {
  let body: Partial<ApiError> | null = null;
  try {
    body = (await res.json()) as Partial<ApiError>;
  } catch {
    // non-JSON error body
  }
  const code = body?.error?.code ?? (res.status === 402 ? "INSUFFICIENT_FUNDS" : undefined);
  const message = (code && FRIENDLY[code]) ?? body?.error?.message ?? `Request failed (${res.status})`;
  return new GameApiError(message, res.status, code);
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

/**
 * Sends a request and retries exactly once on network failure or gateway errors.
 * Safe because the body carries the same idempotency key (requestId / actionId) both times.
 */
export async function requestJson<T>(url: string, init: RequestInit & { retry?: boolean } = {}): Promise<T> {
  const { retry = true, ...rest } = init;
  const opts: RequestInit = {
    credentials: "same-origin",
    ...rest,
    headers: { accept: "application/json", ...(rest.body ? { "content-type": "application/json" } : {}), ...rest.headers },
  };
  let res: Response;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    if (!retry || opts.signal?.aborted) throw err;
    res = await fetch(url, opts).catch(() => {
      throw new GameApiError("Connection lost. Check your network and try again.", 0);
    });
  }
  if (retry && RETRYABLE_STATUS.has(res.status)) res = await fetch(url, opts);
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

export const requestRound = (url: string, init?: RequestInit & { retry?: boolean }) => requestJson<RoundView>(url, init);
