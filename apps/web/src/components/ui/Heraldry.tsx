import type { CSSProperties } from "react";
import { crest64Src, crestRing64Src } from "./sprites";
import { cx } from "./cx";

/** House Flamingo crest. Scale by whole multiples of the 64px art (64, 128, 192…) to stay crisp. */
export function Crest({ size = 128, ring = true, className }: { size?: number; ring?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite
    <img
      src={ring ? crestRing64Src : crest64Src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cx("gh-pixelated shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Crimson crest banner hanging from a gold rod (decorative). */
export function CrestBanner({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={cx("relative flex w-28 flex-col items-center", className)} style={style}>
      <span className="h-2 w-[calc(100%+12px)] bg-gold shadow-[0_0_0_2px_var(--gh-ink)]" />
      <span
        className="relative -mt-0.5 flex aspect-[3/4.4] w-full items-start justify-center bg-gold pt-[18%] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
      >
        <span className="absolute inset-[4px] bg-[linear-gradient(180deg,var(--gh-crimson-600),var(--gh-crimson-800))] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite */}
        <img src={crest64Src} alt="" width={64} height={64} className="gh-pixelated relative w-[64%]" />
      </span>
    </div>
  );
}

/** Rising torch embers (decorative, stops with reduced motion). */
export function Embers({ count = 14, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("gh-embers", className)}>
      {Array.from({ length: count }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, animationDelay: `${-((i * 1.7) % 9)}s`, animationDuration: `${9 + (i % 4)}s` }} />
      ))}
    </div>
  );
}
