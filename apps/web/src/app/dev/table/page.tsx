"use client";

import type { RoundView } from "@21jack/contracts";
import { TableView, fixtures } from "@21jack/game-ui";
import { PageShell } from "@/components/ui";

const previews: Array<[string, RoundView | null]> = [["betting", null], ...Object.entries(fixtures)];
const noop = () => {};

export default function DevTablePage() {
  return (
    <PageShell title="Table previews" className="max-w-6xl">
      {previews.map(([name, round]) => (
        <section key={name} aria-labelledby={`preview-${name}`} className="flex flex-col gap-2">
          <h2 id={`preview-${name}`} className="font-pixel text-sm text-gold-light">
            {name}
          </h2>
          <TableView
            round={round}
            balance={round?.balance ?? 1000}
            busy={false}
            error={null}
            onBet={noop}
            onAction={noop}
            onNewRound={noop}
          />
        </section>
      ))}
    </PageShell>
  );
}
