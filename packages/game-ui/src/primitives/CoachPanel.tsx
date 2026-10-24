"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { CoachLine, CoachTone } from "../lib/coach";
import { Claudalf } from "./Claudalf";

const TONE: Record<CoachTone, string> = {
  advice: "font-display text-lg font-semibold sm:text-xl",
  reason: "text-base text-ink/80",
  good: "font-display text-lg font-semibold text-gold [text-shadow:1px_1px_0_var(--color-ink)]",
  bad: "font-display text-lg font-semibold text-carpet",
  plain: "text-base",
};

/** Reveals `text` a couple of characters per frame; instant with reduced motion. */
function useTypewriter(text: string): number {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ text, n: 0 });
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setState((s) => {
        const n = s.text === text ? s.n + 2 : 2;
        if (n >= text.length) window.clearInterval(id);
        return { text, n: Math.min(n, text.length) };
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  if (reduce) return text.length;
  return state.text === text ? state.n : 0;
}

/** Where the bubble's pixel tail points (at Claudalf). "panel" = left on mobile, up on desktop. */
export type SpeechTail = "panel" | "left" | "right" | "right-low";

const TAIL: Record<SpeechTail, [string, string]> = {
  panel: [
    "top-5 -left-3 h-4 w-2 lg:-top-3 lg:left-8 lg:h-2 lg:w-4",
    "top-6 -left-1 h-2 w-1 lg:-top-1 lg:left-9 lg:h-1 lg:w-2",
  ],
  left: ["top-5 -left-3 h-4 w-2", "top-6 -left-1 h-2 w-1"],
  right: ["top-5 -right-3 h-4 w-2", "top-6 -right-1 h-2 w-1"],
  "right-low": ["bottom-5 -right-3 h-4 w-2", "bottom-6 -right-1 h-2 w-1"],
};

/** Parchment speech bubble with typewriter text; the live region announces each new line set. */
export function SpeechBubble({
  lines,
  tail = "panel",
  className,
  bodyClassName = "min-h-24 lg:min-h-36",
}: {
  lines: CoachLine[];
  tail?: SpeechTail;
  className?: string;
  /** Sizing of the text area (keeps the bubble from jumping while text types in). */
  bodyClassName?: string;
}) {
  const full = lines.map((l) => l.text).join("\n");
  const shown = useTypewriter(full);
  let left = shown;
  const [outer, inner] = TAIL[tail];
  return (
    <div className={`relative min-w-0 flex-1 border-4 border-ink bg-parchment px-3 py-2 text-ink shadow-[4px_4px_0_rgb(0_0_0/0.4)] ${className ?? ""}`}>
      {/* Pixel tail pointing at the portrait. */}
      <span aria-hidden="true" className={`absolute bg-ink ${outer}`} />
      <span aria-hidden="true" className={`absolute bg-parchment ${inner}`} />
      <div aria-live="polite" className={bodyClassName}>
        <p className="sr-only">{full}</p>
        <div aria-hidden="true" className="flex flex-col gap-1">
          {lines.map((line, i) => {
            const part = line.text.slice(0, Math.max(0, left));
            left -= line.text.length + 1;
            return (
              <p key={i} className={TONE[line.tone]}>
                {part}
                <span className="invisible">{line.text.slice(part.length)}</span>
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Claudalf portrait, name plate and parchment speech bubble. */
export function CoachPanel({ lines, onDismiss, className }: { lines: CoachLine[]; onDismiss?: () => void; className?: string }) {
  return (
    <aside
      aria-label="Coach Claudalf"
      className={`voxel-block relative flex gap-3 bg-stone p-3 pt-6 max-lg:items-start lg:flex-col ${className ?? ""}`}
    >
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <Claudalf className="w-16 drop-shadow-[0_4px_0_rgb(0_0_0/0.45)] sm:w-20 lg:w-28" />
        <span className="gold-frame bg-wood px-2 py-0.5 font-pixel text-[10px] whitespace-nowrap text-gold-light sm:text-xs">
          Claudalf · Coach
        </span>
      </div>
      <SpeechBubble lines={lines} />
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-1 right-2 min-h-6 cursor-pointer font-pixel text-[10px] text-parchment/70 underline-offset-2 outline-offset-2 hover:text-parchment hover:underline focus-visible:outline-2 focus-visible:outline-torch"
        >
          Dismiss
        </button>
      )}
    </aside>
  );
}

/** Small call-to-action shown in place of the panel while the coach is off. */
export function CoachSummon({ onSummon, className }: { onSummon: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onSummon}
      className={`voxel-block inline-flex min-h-11 cursor-pointer items-center gap-2 bg-stone px-3 py-1 font-pixel text-xs text-gold-light outline-offset-2 focus-visible:outline-[3px] focus-visible:outline-torch enabled:hover:brightness-110 enabled:active:voxel-pressed ${className ?? ""}`}
    >
      <Claudalf className="w-6" />
      Summon Claudalf
    </button>
  );
}

/** "Coach: Claudalf" on/off switch for the betting area. */
export function CoachToggle({ on, onChange, disabled }: { on: boolean; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="inline-flex min-h-8 cursor-pointer items-center gap-2 font-pixel text-xs text-parchment outline-offset-4 focus-visible:outline-[3px] focus-visible:outline-torch disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
    >
      Coach: Claudalf
      <span aria-hidden="true" className={`relative h-6 w-11 border-2 border-ink ${on ? "bg-felt" : "bg-stone-dark"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 bg-gold-light shadow-[inset_-2px_-2px_0_rgb(0_0_0/0.3)] transition-[left] duration-150 motion-reduce:transition-none ${on ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
      <span className={on ? "text-gold-light" : "text-parchment/60"}>{on ? "On" : "Off"}</span>
    </button>
  );
}
