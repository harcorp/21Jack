import { SignedInFrame } from "@/components/site/SignedInFrame";
import { LogoutButton } from "@/components/site/LogoutButton";
import { LoginForm } from "@/components/lobby/LoginForm";
import { Badge, ButtonLink, Crest, CrestBanner, Embers, HeartMeter, PageShell, Panel, PixelIcon } from "@/components/ui";
import { loadBoss } from "@/lib/boss";
import { getCurrentAccount } from "@/lib/current";

export default async function LobbyPage() {
  const account = await getCurrentAccount();

  if (!account) {
    return (
      <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
        <Embers count={18} />
        {/* Crest banners flank the gate on wide screens. */}
        <div aria-hidden="true" className="absolute top-0 left-[8%] hidden lg:block">
          <CrestBanner className="w-32" />
        </div>
        <div aria-hidden="true" className="absolute top-0 right-[8%] hidden lg:block">
          <CrestBanner className="w-32" />
        </div>

        <div className="relative flex w-full max-w-md flex-col items-center gap-6 text-center">
          <div className="relative">
            <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgb(255_200_90/0.35),transparent_65%)] blur-md" />
            <Crest size={128} className="sm:size-48!" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="gh-eyebrow">House Flamingo · 21Jack</p>
            <h1 className="gh-display gh-shadow-text text-[40px] text-gold-light sm:text-[56px]">The Grand Hall</h1>
            <p className="text-base text-cream-muted sm:text-lg">
              Sit at the King&apos;s blackjack table. Beat him hand by hand. Fictional credits only.
            </p>
          </div>
          <Panel tone="wood" framed title="Enter the castle" className="w-full text-left">
            <LoginForm />
          </Panel>
          <p className="gh-footnote">Fictional credits only</p>
        </div>
      </main>
    );
  }

  const boss = await loadBoss(account.id);

  return (
    <SignedInFrame account={account}>
      <PageShell eyebrow="The castle gate" title={`Welcome, ${account.username}`} intro="Wins and naturals pay even money. The King stands on every 17.">
        <Panel tone="wood" framed className="relative overflow-hidden">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <h2 className="gh-panel-title text-[28px]">The King awaits</h2>
              {boss ? (
                <div className="flex flex-col gap-3">
                  <HeartMeter hp={boss.hp} maxHp={boss.maxHp} />
                  <div>
                    <Badge tone="gold">
                      <PixelIcon name="crown" size={12} />
                      Kings slain: {boss.defeats}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-cream-muted">The King&apos;s health is hidden right now.</p>
              )}
              <p className="text-base text-cream">
                Every winning hand strikes the King, every loss heals him. Empty his hearts to earn the Kingslayer badge.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <ButtonLink href="/play" variant="primary" size="lg">
                  <PixelIcon name="swords" size={24} />
                  Enter the hall
                </ButtonLink>
              </div>
            </div>
            <div className="hidden shrink-0 md:block">
              <Crest size={192} />
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel tone="stone" framed>
            <div className="flex items-start gap-4">
              <span className="gh-iconbtn pointer-events-none shrink-0" aria-hidden="true">
                <PixelIcon name="chest" size={24} />
              </span>
              <div className="flex min-w-0 flex-col gap-3">
                <h2 className="gh-panel-title">Treasury</h2>
                <p className="text-cream-muted">Add credits to your purse before you play.</p>
                <ButtonLink href="/wallet" variant="wood" size="sm" className="self-start">
                  Open the treasury
                </ButtonLink>
              </div>
            </div>
          </Panel>
          <Panel tone="stone" framed>
            <div className="flex items-start gap-4">
              <span className="gh-iconbtn pointer-events-none shrink-0" aria-hidden="true">
                <PixelIcon name="scroll" size={24} />
              </span>
              <div className="flex min-w-0 flex-col gap-3">
                <h2 className="gh-panel-title">Royal ledger</h2>
                <p className="text-cream-muted">Every bet, split, double and payout, hand by hand.</p>
                <ButtonLink href="/history" variant="stone" size="sm" className="self-start">
                  Read the ledger
                </ButtonLink>
              </div>
            </div>
          </Panel>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <LogoutButton variant="ghost" />
          <p className="gh-footnote">Fictional credits only</p>
        </div>
      </PageShell>
    </SignedInFrame>
  );
}
