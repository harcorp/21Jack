import { SignedInFrame } from "@/components/site/SignedInFrame";
import { LogoutButton } from "@/components/site/LogoutButton";
import { LoginForm } from "@/components/lobby/LoginForm";
import { HeaderBalance } from "@/components/site/HeaderBalance";
import { Badge, ButtonLink, HeartMeter, Logo, PageShell, Panel } from "@/components/ui";
import { loadBoss } from "@/lib/boss";
import { getCurrentAccount } from "@/lib/current";

export default async function LobbyPage() {
  const account = await getCurrentAccount();

  if (!account) {
    return (
      <PageShell className="max-w-lg justify-center sm:min-h-dvh">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo />
          <h1 className="font-display text-4xl font-bold text-gold-light">The Castle Gate</h1>
          <p className="text-lg">Sit at the King&apos;s blackjack table. Fictional credits only.</p>
        </div>
        <Panel tone="wood" framed title="Enter the castle">
          <LoginForm />
        </Panel>
      </PageShell>
    );
  }

  const boss = await loadBoss(account.id);

  return (
    <SignedInFrame account={account}>
      <PageShell title={`Welcome, ${account.username}`} intro="Wins and naturals pay even money. The King stands on every 17.">
        <Panel tone="wood" framed title="The King awaits">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <HeaderBalance />
              {boss ? (
                <>
                  <HeartMeter hp={boss.hp} maxHp={boss.maxHp} />
                  <Badge tone="gold">Kings slain: {boss.defeats}</Badge>
                </>
              ) : (
                <span className="font-pixel text-xs">The King&apos;s health is hidden right now.</span>
              )}
            </div>
            <p className="text-lg">
              Every winning hand strikes the King, every loss heals him. Empty his hearts to earn the Kingslayer badge.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/play" variant="primary" size="lg">
                Enter the King&apos;s hall
              </ButtonLink>
              <ButtonLink href="/multi" variant="wood" size="lg">
                Multi (WIP)
              </ButtonLink>
            </div>
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="Treasury">
            <p className="mb-4">Add credits to your purse before you play.</p>
            <ButtonLink href="/wallet">Open the treasury</ButtonLink>
          </Panel>
          <Panel title="Ledger">
            <p className="mb-4">Every bet, split, double and payout, hand by hand.</p>
            <ButtonLink href="/history">Read the ledger</ButtonLink>
          </Panel>
        </div>
        <div>
          <LogoutButton variant="wood" />
        </div>
      </PageShell>
    </SignedInFrame>
  );
}
