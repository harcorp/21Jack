import { formatSigned } from "./format";
import { cx } from "./cx";

/** Signed credit amount: gains in gold, losses in carpet red. */
export function Amount({ value, className, onLight }: { value: number; className?: string; onLight?: boolean }) {
  const tone = value > 0 ? (onLight ? "text-wood" : "text-gold-light") : value < 0 ? "text-carpet" : "opacity-70";
  return (
    <span className={cx("font-pixel tabular-nums", tone, className)}>
      <span className="sr-only">{value > 0 ? "gain " : value < 0 ? "loss " : ""}</span>
      {formatSigned(value)}
    </span>
  );
}
