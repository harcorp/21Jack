import { Logo, NavLink } from "@/components/ui";
import { HeaderBalance } from "./HeaderBalance";
import { LogoutButton } from "./LogoutButton";

/** Shared header for signed-in pages. Must render inside <BalanceProvider>. */
export function SiteHeader({ username }: { username: string }) {
  return (
    <header className="border-b-4 border-ink bg-wood-dark">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-gold focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Logo />
        <nav aria-label="Main" className="order-3 flex w-full flex-wrap gap-x-2 sm:order-none sm:w-auto">
          <NavLink href="/play">Play</NavLink>
          <NavLink href="/wallet">Treasury</NavLink>
          <NavLink href="/history">Ledger</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden font-pixel text-xs sm:inline" aria-label={`Signed in as ${username}`}>
            {username}
          </span>
          <HeaderBalance />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
