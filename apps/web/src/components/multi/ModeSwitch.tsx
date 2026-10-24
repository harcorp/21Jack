import Link from "next/link";

const MODES = [
  { key: "single", label: "Single", href: "/play" },
  { key: "multi", label: "Multi", href: "/multi" },
] as const;

export function ModeSwitch({ active }: { active: (typeof MODES)[number]["key"] }) {
  return (
    <nav aria-label="Game mode" className="flex justify-center">
      <div className="inline-flex gap-1 bg-ink/60 p-1">
        {MODES.map((mode) => {
          const on = mode.key === active;
          return (
            <Link
              key={mode.key}
              href={mode.href}
              aria-current={on ? "page" : undefined}
              className={`voxel-block inline-flex min-h-11 min-w-24 items-center justify-center px-4 font-display text-base font-semibold tracking-wide outline-offset-2 focus-visible:outline-[3px] focus-visible:outline-torch ${
                on ? "voxel-pressed bg-gold text-ink" : "bg-wood text-gold-light hover:brightness-110"
              }`}
            >
              {mode.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
