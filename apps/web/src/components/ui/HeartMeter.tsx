import { heartEmptySrc, heartFullSrc, kingPortraitSrc } from "./sprites";
import { cx } from "./cx";

/** The King's health as the Grand Hall boss bar: one segment per heart, crown portrait on top. */
export function HeartMeter({ hp, maxHp, className }: { hp: number; maxHp: number; className?: string }) {
  const defeated = hp <= 0;
  return (
    <div role="img" aria-label={`King's health: ${hp} of ${maxHp} hearts`} className={cx("gh-boss w-full max-w-[520px] pt-7", defeated && "is-defeated", className)}>
      <div className="gh-boss__frame mx-2">
        <div className="gh-boss__track" style={{ gridTemplateColumns: `repeat(${Math.max(maxHp, 1)}, minmax(0, 1fr))` }}>
          {Array.from({ length: maxHp }, (_, i) => (
            <span key={i} className={cx("gh-boss__hp", i >= hp && "is-empty")} />
          ))}
        </div>
      </div>
      <span className="gh-portrait gh-portrait--sm absolute top-0 left-1/2 -translate-x-1/2" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite */}
        <img src={kingPortraitSrc} alt="" width={36} height={36} />
      </span>
      <div className="gh-boss__label mx-2" aria-hidden="true">
        <span>{defeated ? "Defeated" : "The King"}</span>
        <span className="gh-num text-xs">
          {hp} / {maxHp}
        </span>
      </div>
    </div>
  );
}

/** Signed hp change: negative = damage dealt to the King, positive = King healed. */
export function HeartDelta({ value, className }: { value: number; className?: string }) {
  const heart = (full: boolean) => (
    // eslint-disable-next-line @next/next/no-img-element -- tiny inline pixel sprite
    <img src={full ? heartFullSrc : heartEmptySrc} alt="" aria-hidden="true" width={12} height={12} className="gh-pixelated inline-block size-3" />
  );
  if (value === 0)
    return (
      <span className={cx("inline-flex items-center gap-1 gh-num text-[10px] text-cream-dim", className)}>
        0 {heart(false)}
      </span>
    );
  const dealt = value < 0;
  return (
    <span className={cx("inline-flex items-center gap-1 gh-num text-[10px] whitespace-nowrap", dealt ? "text-gold-light" : "text-danger", className)}>
      {dealt ? `−${-value}` : `+${value}`} {heart(!dealt)}
      <span className="sr-only">{dealt ? " dealt to the King" : " healed by the King"}</span>
    </span>
  );
}
