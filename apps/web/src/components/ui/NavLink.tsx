"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import { cx } from "./cx";

/** HUD navigation tab: Pixelify caps, gold bar under the current page. */
export function NavLink({ href, icon, children }: { href: string; icon?: PixelIconName; children: ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "gh-label relative inline-flex min-h-11 items-center gap-2 px-1.5 text-[13px] tracking-[.06em] sm:px-2 sm:text-[15px] sm:tracking-[.08em]",
        "after:absolute after:inset-x-1.5 after:bottom-1 sm:after:inset-x-2 after:h-1 after:content-['']",
        active
          ? "text-gold-light [text-shadow:0_2px_0_var(--gh-ink)] after:bg-gold after:shadow-[0_2px_0_var(--gh-ink)]"
          : "text-cream-muted hover:text-gold-light",
      )}
    >
      {icon ? <PixelIcon name={icon} size={16} className="hidden sm:block" /> : null}
      {children}
    </Link>
  );
}
