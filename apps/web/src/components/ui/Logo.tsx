import Link from "next/link";
import { crestRing48Src } from "./sprites";
import { cx } from "./cx";

/** House Flamingo crest + "21Jack" wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="21Jack — home" className={cx("inline-flex min-h-11 items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite */}
      <img src={crestRing48Src} alt="" aria-hidden="true" width={40} height={40} className="gh-pixelated size-10 shrink-0" />
      <span className="gh-display gh-shadow-text hidden text-2xl text-gold-light min-[400px]:inline sm:inline">21Jack</span>
    </Link>
  );
}
