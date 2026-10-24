import { coinSrc } from "./sprites";
import { cx } from "./cx";

/** Grand Hall coin sprite (16px art). */
export function CoinIcon({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite
  return <img src={coinSrc} alt="" aria-hidden="true" width={20} height={20} className={cx("gh-pixelated size-5 shrink-0", className)} />;
}
