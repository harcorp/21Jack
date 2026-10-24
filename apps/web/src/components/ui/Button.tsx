import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "wood" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "voxel-block bg-gold text-ink hover:bg-gold-light",
  wood: "voxel-block bg-wood text-gold-light hover:brightness-110",
  danger: "voxel-block bg-carpet text-parchment hover:brightness-110",
  ghost: "border-2 border-transparent text-parchment underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-6 text-xl",
};

export function buttonClasses(variant: ButtonVariant = "wood", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-display font-semibold select-none transition-[filter,transform]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-torch",
    "active:voxel-pressed disabled:cursor-not-allowed disabled:bg-stone disabled:text-parchment/60 disabled:active:transform-none",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; busy?: boolean };

export function Button({ variant, size, busy, className, disabled, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
