import { Logo, NavLink } from "@/components/ui";
import { HeaderBalance } from "./HeaderBalance";
import { LogoutButton } from "./LogoutButton";

/** Shared HUD header for signed-in pages. Must render inside <BalanceProvider>. */
export function SiteHeader({ username }: { username: string }) {
  return (
    <header className="relative z-10 bg-[linear-gradient(180deg,var(--gh-stone-800),var(--gh-stone-900))] shadow-[0_2px_0_var(--gh-ink),0_6px_0_rgb(0_0_0/0.35)]">
      <a
        href="#main"
        className="gh-btn gh-btn--sm sr-only focus:not-sr-only focus:absolute! focus:top-2 focus:left-4 focus:z-20"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-3 pb-1 sm:py-3">
        <Logo />
        <nav aria-label="Main" className="order-3 -mx-1.5 flex w-[calc(100%+0.75rem)] justify-between sm:order-none sm:mx-0 sm:w-auto sm:justify-start sm:gap-1">
          <NavLink href="/play" icon="swords">
            Play
          </NavLink>
          <NavLink href="/wallet" icon="chest">
            Treasury
          </NavLink>
          <NavLink href="/history" icon="scroll">
            Ledger
          </NavLink>
          <NavLink href="/engine" icon="crown">
            Engine
          </NavLink>
        </nav>
        <div className="flex min-w-0 items-center gap-3">
          <span className="gh-tag gh-tag--ghost hidden max-w-40 truncate normal-case tracking-normal lg:inline-flex" title={`Signed in as ${username}`}>
            <span className="sr-only">Signed in as </span>
            {username}
          </span>
          <HeaderBalance />
          <LogoutButton iconOnly />
        </div>
      </div>
      <hr className="gh-rule" />
    </header>
  );
}
