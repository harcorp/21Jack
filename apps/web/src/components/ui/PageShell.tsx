import type { ReactNode } from "react";
import { cx } from "./cx";

/** Page column with the Grand Hall heading: gold eyebrow, Pixelify title, gold rule. */
export function PageShell({
  title,
  eyebrow,
  intro,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  /** Right-aligned controls next to the title (wraps below it on mobile). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main id="main" className={cx("mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-10 *:min-w-0", className)}>
      {title ? (
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              {eyebrow ? <p className="gh-eyebrow">{eyebrow}</p> : null}
              <h1 className="gh-display gh-shadow-text text-[32px] text-gold-light sm:text-[40px]">{title}</h1>
            </div>
            {actions}
          </div>
          {intro ? <p className="max-w-2xl text-base text-cream-muted sm:text-lg">{intro}</p> : null}
          <hr className="gh-rule mt-1" />
        </header>
      ) : null}
      {children}
    </main>
  );
}
