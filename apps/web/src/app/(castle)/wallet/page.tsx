import type { Metadata } from "next";
import { DepositPanel } from "@/components/wallet/DepositPanel";
import { Crest, PageShell, Panel, PixelIcon } from "@/components/ui";

export const metadata: Metadata = { title: "Treasury · 21Jack" };

export default function WalletPage() {
  return (
    <PageShell eyebrow="House Flamingo vault" title="Treasury" intro="Fill your purse with fictional credits.">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <DepositPanel />
        <Panel tone="stone" framed as="div" className="flex flex-col items-center gap-4 text-center">
          <Crest size={128} />
          <h2 className="gh-panel-title">Rules of the vault</h2>
          <ul className="flex flex-col gap-2 text-left text-sm text-cream-muted">
            <li className="flex gap-2">
              <PixelIcon name="check" size={12} className="mt-1 text-gold" />
              New accounts start at 0 credits.
            </li>
            <li className="flex gap-2">
              <PixelIcon name="check" size={12} className="mt-1 text-gold" />
              Deposits are whole numbers, counted once even if you tap twice.
            </li>
            <li className="flex gap-2">
              <PixelIcon name="check" size={12} className="mt-1 text-gold" />
              Credits are fictional and have no cash value.
            </li>
          </ul>
        </Panel>
      </div>
    </PageShell>
  );
}
