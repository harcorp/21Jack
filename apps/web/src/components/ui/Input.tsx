import { useId, type ComponentProps } from "react";
import { PixelIcon } from "./PixelIcon";
import { cx } from "./cx";

type InputProps = ComponentProps<"input"> & { label: string; hint?: string; error?: string | null };

/** Grand Hall text field (`.gh-field` + `.gh-input`). Numeric inputs use the number face. */
export function Input({ label, hint, error, className, id, inputMode, ...rest }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;
  const numeric = inputMode === "numeric" || inputMode === "decimal" || rest.type === "number";
  return (
    <div className={cx("gh-field min-w-0", className)}>
      <label htmlFor={inputId} className="gh-field__label">
        {label}
      </label>
      <input
        id={inputId}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx("gh-input disabled:cursor-not-allowed disabled:opacity-60", numeric && "gh-input--num", error && "is-error")}
        {...rest}
      />
      {hint ? (
        <p id={`${inputId}-hint`} className="gh-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="gh-field__error">
          <PixelIcon name="info" size={12} />
          {error}
        </p>
      ) : null}
    </div>
  );
}
