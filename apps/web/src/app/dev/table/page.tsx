"use client";

import type { BossView, RoundView } from "@21jack/contracts";
import { TableView, fixtures } from "@21jack/game-ui";
import { PageShell } from "@/components/ui";

// Solo states first (TableStage / MobileStage `solo-*`), then the older edge-case fixtures.
const previews: Array<[string, RoundView | null]> = [["soloBetting", null], ...Object.entries(fixtures)];
const bettingBoss: BossView = { hp: 7, maxHp: 10, delta: 0, defeated: false, defeats: 0 };
const noop = () => {};

function Preview({ round, width }: { round: RoundView | null; width: number }) {
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <TableView
        fit="container"
        round={round}
        balance={round?.balance ?? 1240}
        busy={false}
        error={null}
        boss={round ? null : bettingBoss}
        player={{ name: "Nicolas", avatar: "knight" }}
        resumedRoundId={round === fixtures.soloResume ? round.roundId : null}
        onBet={noop}
        onAction={noop}
        onNewRound={noop}
      />
    </div>
  );
}

export default function DevTablePage() {
  return (
    <PageShell title="Table previews" intro="Every fixture on the desktop (1100) and mobile (390) stage." className="max-w-[1560px]">
      {previews.map(([name, round]) => (
        <section key={name} aria-labelledby={`preview-${name}`} data-preview={name} className="flex flex-col gap-2">
          <h2 id={`preview-${name}`} className="font-pixel text-sm text-gold-light">
            {name}
          </h2>
          <div className="flex flex-wrap items-start gap-4">
            <Preview round={round} width={1100} />
            <Preview round={round} width={390} />
          </div>
        </section>
      ))}
    </PageShell>
  );
}
