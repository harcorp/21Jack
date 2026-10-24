import { CoinIcon } from "./CoinIcon";
import { formatCredits } from "./format";
import { cx } from "./cx";

/** Gold HUD pill shared by the site header and the game table. `null` = unknown (service down). */
export function BalancePill({ balance, className }: { balance: number | null; className?: string }) {
  return (
    <div
      className={cx("gold-frame inline-flex min-h-11 items-center gap-2 bg-wood px-3 font-display text-lg font-bold text-gold-light", className)}
      role="status"
      aria-live="polite"
      aria-label={balance === null ? "Balance unavailable" : `Balance: ${formatCredits(balance)} credits`}
    >
      <CoinIcon />
      <span className="tabular-nums">{balance === null ? "—" : formatCredits(balance)}</span>
    </div>
  );
}
