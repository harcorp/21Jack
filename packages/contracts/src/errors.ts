import { z } from "zod";

export const ErrorCode = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "INSUFFICIENT_FUNDS",
  "NOT_FOUND",
  "INVALID_ACTION",
  "ROUND_SETTLED",
  "CONFLICT",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const errorStatus: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INSUFFICIENT_FUNDS: 402,
  NOT_FOUND: 404,
  INVALID_ACTION: 409,
  ROUND_SETTLED: 409,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export const ApiError = z.object({
  error: z.object({ code: ErrorCode, message: z.string() }),
});
export type ApiError = z.infer<typeof ApiError>;

export const apiError = (code: ErrorCode, message: string): ApiError => ({ error: { code, message } });
