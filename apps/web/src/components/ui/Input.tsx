import { useId, type ComponentProps } from "react";
import { cx } from "./cx";

type InputProps = ComponentProps<"input"> & { label: string; hint?: string; error?: string | null };

export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="font-pixel text-sm">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "voxel-block min-h-12 bg-parchment px-3 font-display text-lg text-ink placeholder:text-ink/50",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-torch",
          error && "border-carpet",
        )}
        {...rest}
      />
      {hint ? (
        <p id={`${inputId}-hint`} className="text-sm opacity-80">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="text-sm font-bold text-torch">
          {error}
        </p>
      ) : null}
    </div>
  );
}
