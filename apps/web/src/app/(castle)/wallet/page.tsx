import type { Metadata } from "next";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Treasury · 21Jack" };

export default function WalletPage() {
  return (
    <PageShell title="Treasury" intro="Fill your purse with fictional credits.">
      <DepositPanel />
    </PageShell>
  );
}
