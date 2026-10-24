import type { ButtonHTMLAttributes } from "react";

type Variant = "wood" | "gold" | "ghost";

const VARIANTS: Record<Variant, string> = {
  wood: "bg-wood text-gold-light",
  gold: "bg-gold text-ink",
  ghost: "bg-stone-dark text-parchment",
};

/** Voxel block button: pressed state drops 2px and loses its bevel; disabled turns to stone. `glow` = coach recommendation ring. */
export function ActionButton({
  variant = "wood",
  hotkey,
  glow = false,
  className,
  children,
  ...button
}: { variant?: Variant; hotkey?: string; glow?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`voxel-block relative min-h-11 min-w-20 cursor-pointer px-4 py-2 font-display text-base font-semibold tracking-wide outline-offset-2 focus-visible:outline-[3px] focus-visible:outline-torch enabled:hover:brightness-110 enabled:active:voxel-pressed disabled:cursor-not-allowed disabled:bg-stone disabled:text-parchment/50 sm:text-lg ${VARIANTS[variant]} ${className ?? ""}`}
      {...button}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 border-2 border-torch shadow-[0_0_10px_var(--color-torch)] motion-safe:animate-pulse"
        />
      )}
      {children}
      {glow && <span className="sr-only"> (Claudalf recommends)</span>}
      {hotkey && <span className="ml-1.5 font-pixel text-[10px] opacity-60 max-sm:hidden">{hotkey}</span>}
    </button>
  );
}
