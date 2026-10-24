import { cx } from "./cx";

function Heart({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 7 6" aria-hidden="true" className="pixelated size-6" shapeRendering="crispEdges">
      <path fill="#1a1410" d="M1 0h2v1h1v-1h2v1h1v2h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-2h1z" />
      <path fill={full ? "#7e1c1c" : "#4a4a55"} d="M1 1h2v1h1v-1h2v2h-1v1h-1v1h-1v-1h-1v-1h-1z" />
      {full ? <path fill="#f1e6cc" d="M1 1h1v1h-1z" /> : null}
    </svg>
  );
}

/** Pixel hearts showing the King's health. */
export function HeartMeter({ hp, maxHp, className }: { hp: number; maxHp: number; className?: string }) {
  return (
    <div role="img" aria-label={`King's health: ${hp} of ${maxHp} hearts`} className={cx("inline-flex flex-wrap gap-1", className)}>
      {Array.from({ length: maxHp }, (_, i) => (
        <Heart key={i} full={i < hp} />
      ))}
    </div>
  );
}

/** Signed hp change: negative = damage dealt to the King, positive = King healed. */
export function HeartDelta({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className={cx("font-pixel text-xs opacity-70", className)}>0 ♥</span>;
  const dealt = value < 0;
  return (
    <span className={cx("font-pixel text-xs whitespace-nowrap", dealt ? "text-wood" : "text-carpet", className)}>
      {dealt ? `−${-value}` : `+${value}`} ♥<span className="sr-only">{dealt ? " dealt to the King" : " healed by the King"}</span>
    </span>
  );
}
