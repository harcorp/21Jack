type Tone = "neutral" | "good" | "bad" | "gold";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink/85 text-parchment",
  good: "bg-felt-dark text-gold-light",
  bad: "bg-carpet text-parchment",
  gold: "bg-gold text-ink",
};

export function HandTotalBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-block border-2 border-ink px-2 py-0.5 font-pixel text-xs sm:text-sm ${TONES[tone]}`}>
      {label}
    </span>
  );
}
