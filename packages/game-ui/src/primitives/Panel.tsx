import type { HTMLAttributes } from "react";

type Tone = "wood" | "parchment" | "stone";

const TONES: Record<Tone, string> = {
  wood: "bg-wood text-parchment",
  parchment: "bg-parchment text-ink",
  stone: "bg-stone-dark text-parchment",
};

export function Panel({ tone = "wood", className, ...div }: { tone?: Tone } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`voxel-block ${TONES[tone]} ${className ?? ""}`} {...div} />;
}
