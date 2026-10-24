import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, Uuid } from "@21jack/contracts";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return "dev-only-session-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSession(accountId: string) {
  return `${accountId}.${sign(accountId)}`;
}

export function decodeSession(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const accountId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(accountId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Uuid.safeParse(accountId).success ? accountId : null;
}

/** The signed cookie is the only source of the account id. */
export async function getSessionAccountId() {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function setSession(accountId: string) {
  (await cookies()).set(SESSION_COOKIE, encodeSession(accountId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
