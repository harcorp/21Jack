import type { ReactNode } from "react";
import { cx } from "./cx";

export function PageShell({ title, intro, children, className }: { title?: ReactNode; intro?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <main id="main" className={cx("mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8", className)}>
      {title ? <h1 className="font-display text-4xl font-bold text-gold-light">{title}</h1> : null}
      {intro ? <p className="-mt-3 text-lg opacity-90">{intro}</p> : null}
      {children}
    </main>
  );
}
