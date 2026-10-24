import "server-only";
import { BossView } from "@21jack/contracts";
import { callService } from "./services";

/** King's health for the lobby; null when the game service is down or has no data. */
export async function loadBoss(accountId: string): Promise<BossView | null> {
  try {
    const res = await callService("game", `/boss?accountId=${accountId}`);
    if (!res.ok) return null;
    const parsed = BossView.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
