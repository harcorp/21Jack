import type { z } from "zod";
import { apiFetch } from "@/lib/api-client";

/** Fetches a same-origin /api route and validates the body against a contracts schema. */
export async function fetchParsed<S extends z.ZodType>(path: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  const body = await apiFetch<unknown>(path, init);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error(`Unexpected response from ${path.split("?")[0]}.`);
  return parsed.data;
}
