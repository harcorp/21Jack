import { formatSigned } from "./format";
import { cx } from "./cx";

/** Signed credit amount: gains in gold, losses in crimson. Numbers use Press Start 2P. */
export function Amount({ value, className, onLight }: { value: number; className?: string; onLight?: boolean }) {
  const tone =
    value > 0 ? (onLight ? "text-wood-dark" : "text-gold-light") : value < 0 ? (onLight ? "text-carpet" : "text-danger") : "text-cream-dim";
  return (
    <span className={cx("gh-num text-xs whitespace-nowrap", tone, className)}>
      <span className="sr-only">{value > 0 ? "gain " : value < 0 ? "loss " : ""}</span>
      {formatSigned(value)}
    </span>
  );
}
