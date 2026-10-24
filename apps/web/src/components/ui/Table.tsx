import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

/** Parchment ledger table. Scrolls horizontally on narrow screens. */
export function Table({ caption, children, className }: { caption: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-ink">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...rest }: ComponentProps<"th">) {
  return <th scope="col" className={cx("border-b-2 border-ink/40 px-2 py-2 font-pixel text-xs uppercase", className)} {...rest} />;
}

export function Td({ className, ...rest }: ComponentProps<"td">) {
  return <td className={cx("border-b border-ink/15 px-2 py-2 align-top", className)} {...rest} />;
}

export function Tr({ className, ...rest }: ComponentProps<"tr">) {
  return <tr className={className} {...rest} />;
}
