import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SessionAccount } from "@/components/site/SignedInFrame";
import { loadAccount } from "./engine";
import { getSessionAccountId } from "./session";

/** Session account for server components. Engine outage keeps the session but with an unknown balance. */
export const getCurrentAccount = cache(async (): Promise<SessionAccount | null> => {
  const accountId = await getSessionAccountId();
  if (!accountId) return null;
  const loaded = await loadAccount(accountId);
  if (loaded.status === "missing") return null;
  if (loaded.status === "error") return { id: accountId, username: "Adventurer", balance: null };
  return { id: loaded.data.id, username: loaded.data.username, balance: loaded.data.balance };
});

export async function requireCurrentAccount() {
  const account = await getCurrentAccount();
  if (!account) redirect("/");
  return account;
}
