"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./cx";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "inline-flex min-h-11 items-center px-2 font-display text-lg focus-visible:outline-2 focus-visible:outline-torch",
        active ? "text-gold-light underline decoration-4 underline-offset-8" : "text-parchment hover:text-gold-light",
      )}
    >
      {children}
    </Link>
  );
}
