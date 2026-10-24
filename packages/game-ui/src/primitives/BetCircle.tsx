import type { ReactNode } from "react";

/** Gold betting ring printed on the felt. */
export function BetCircle({ children, label, active }: { children?: ReactNode; label?: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-16 w-16 items-end justify-center rounded-full border-4 border-dashed pb-2 sm:h-20 sm:w-20 ${
          active ? "border-gold-light" : "border-gold/70"
        } bg-felt-dark/40`}
      >
        {children}
      </div>
      {label && <span className="font-pixel text-xs text-gold-light">{label}</span>}
    </div>
  );
}
