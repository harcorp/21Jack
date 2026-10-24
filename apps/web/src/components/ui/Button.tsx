import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

/** primary = gold, wood = treasury brown, ghost = gold outline, danger = crimson; stone/felt are secondary/confirm. */
export type ButtonVariant = "primary" | "wood" | "ghost" | "danger" | "stone" | "felt";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "",
  wood: "gh-btn--wood",
  ghost: "gh-btn--ghost",
  danger: "gh-btn--crimson",
  stone: "gh-btn--stone",
  felt: "gh-btn--felt",
};

const sizes: Record<ButtonSize, string> = {
  sm: "gh-btn--sm",
  md: "",
  lg: "gh-btn--lg",
};

export function buttonClasses(variant: ButtonVariant = "wood", size: ButtonSize = "md", className?: string) {
  // Labels may wrap on narrow screens instead of overflowing the viewport.
  return cx("gh-btn max-w-full text-center whitespace-normal select-none", variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; busy?: boolean };

export function Button({ variant, size, busy, className, disabled, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, cx(busy && "is-loading", className))}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className="gh-spinner shrink-0" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
