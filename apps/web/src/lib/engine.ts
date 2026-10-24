import "server-only";
import { Account, TransactionList, type Transaction } from "@21jack/contracts";
import { callService } from "./services";

export type Loaded<T> = { status: "ok"; data: T } | { status: "missing" } | { status: "error" };

/** Server-side reads used by pages; failures are reported, never thrown. */
export async function loadAccount(accountId: string): Promise<Loaded<Account>> {
  try {
    const res = await callService("engine", `/accounts/${accountId}`);
    if (res.status === 404) return { status: "missing" };
    if (!res.ok) return { status: "error" };
    const parsed = Account.safeParse(await res.json());
    return parsed.success ? { status: "ok", data: parsed.data } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function loadTransactions(accountId: string, limit = 200): Promise<Loaded<Transaction[]>> {
  try {
    const res = await callService("engine", `/accounts/${accountId}/transactions?limit=${limit}`);
    if (!res.ok) return { status: "error" };
    const parsed = TransactionList.safeParse(await res.json());
    return parsed.success ? { status: "ok", data: parsed.data } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
