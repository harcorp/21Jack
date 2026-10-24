"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { CrownSigil } from "./CrownSigil";
import { stepped } from "./motion";
import { PixelArt } from "./pixel";

const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."] as const;

function PixelHeart({ full }: { full: boolean }) {
  return (
    <PixelArt
      rows={HEART}
      palette={{ "#": full ? "#e0393e" : "var(--color-stone-dark)" }}
      className="pixelated h-3 w-3.5 sm:h-4 sm:w-5"
    />
  );
}

export interface BossBarProps {
  hp: number;
  maxHp: number;
  /** hp change from the settling round; the bar steps from `hp - delta` to `hp`. */
  delta?: number;
  defeats?: number;
  /** Changes once per settled round; the drain/heal replays only when it changes. */
  eventKey?: string | null;
  name?: string;
}

/** Boss health bar: gold-framed, one segment per heart, drains/fills one segment at a time. */
export function BossBar({ hp, maxHp, delta = 0, defeats = 0, eventKey = null, name = "The King" }: BossBarProps) {
  const reduce = useReducedMotion();
  const clamp = (n: number) => Math.max(0, Math.min(maxHp, n));
  const [shown, setShown] = useState(() => (reduce || !eventKey ? hp : clamp(hp - delta)));

  useEffect(() => {
    if (reduce || !eventKey || delta === 0) {
      setShown(hp);
      return;
    }
    let current = clamp(hp - delta);
    setShown(current);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (current === hp) return;
      current += current < hp ? 1 : -1;
      setShown(current);
      timer = setTimeout(tick, 280);
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp, delta, eventKey, maxHp, reduce]);

  const pct = maxHp > 0 ? (shown / maxHp) * 100 : 0;
  const low = shown <= Math.ceil(maxHp / 5);

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-1"
      role="meter"
      aria-label={`${name} health`}
      aria-valuemin={0}
      aria-valuemax={maxHp}
      aria-valuenow={hp}
      aria-valuetext={`${hp} of ${maxHp} hearts`}
    >
      <div className="flex w-full items-center justify-between gap-2 px-1">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gold-light sm:text-lg">
          <CrownSigil className="h-4 w-4 sm:h-5 sm:w-5" />
          {name}
        </span>
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {Array.from({ length: maxHp }, (_, i) => (
            <PixelHeart key={i} full={i < shown} />
          ))}
        </span>
        {defeats > 0 && <span className="font-pixel text-[10px] text-gold sm:text-xs">Kings slain: {defeats}</span>}
      </div>
      <div className="gold-frame relative h-4 w-full bg-ink sm:h-5">
        <motion.div
          className={`absolute inset-y-0 left-0 ${low ? "bg-[#e0393e]" : "bg-carpet"} shadow-[inset_0_3px_0_rgb(255_255_255/0.25),inset_0_-3px_0_rgb(0_0_0/0.35)]`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.24, ease: stepped(3) }}
        />
        <div className="absolute inset-0 flex" aria-hidden="true">
          {Array.from({ length: maxHp - 1 }, (_, i) => (
            <span key={i} className="h-full flex-1 border-r-2 border-ink/80" />
          ))}
          <span className="h-full flex-1" />
        </div>
      </div>
    </div>
  );
}
