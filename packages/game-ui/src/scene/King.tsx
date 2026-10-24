"use client";

import { useEffect, useRef, useState } from "react";
import { KING_FRAMES, KING_SHEET, STAGE_SOURCE, type KingFrame, type KingMood, type StageVariant } from "./data";

const FRAME_INDEX: Record<KingFrame, number> = Object.fromEntries(KING_FRAMES.map((f, i) => [f, i])) as Record<
  KingFrame,
  number
>;

const HIT_FILTER = "brightness(2) sepia(1)";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Living idle loop from the King board: idle 1.6s <-> breath 1.6s, with a 120ms blink at a
 * random 3-6s interval. Any other mood holds its frame for as long as it is set.
 */
function useKingFrame(mood: KingMood): KingFrame {
  const [frame, setFrame] = useState<KingFrame>(mood);

  useEffect(() => {
    if (mood !== "idle") {
      setFrame(mood);
      return;
    }
    setFrame("idle");
    if (prefersReducedMotion()) return;

    let breathing = false;
    let blinking = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const base = (): KingFrame => (breathing ? "breath" : "idle");

    const breathe = () => {
      breathing = !breathing;
      if (!blinking) setFrame(base());
      later(breathe, 1600);
    };
    const blink = () => {
      blinking = true;
      setFrame("blink");
      later(() => {
        blinking = false;
        setFrame(base());
        // Occasionally a quick double blink, like a real face.
        if (Math.random() < 0.18) later(blink, 180);
        else later(blink, 3000 + Math.random() * 3000);
      }, 120);
    };

    later(breathe, 1600);
    later(blink, 1500 + Math.random() * 3000);
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [mood]);

  return frame;
}

export interface GrandHallKingProps {
  variant: StageVariant;
  src: string;
  mood?: KingMood;
  /** Rising edge (false -> true) or any change of a number replays the hit flash + shake. */
  hit?: boolean | number;
  loading?: "eager" | "lazy";
  onLoad?: () => void;
  imgRef?: (el: HTMLImageElement | null) => void;
}

/** The king dealer sprite, cut from the 5-frame sheet at the king-sheet placement. */
export function GrandHallKing({ variant, src, mood = "idle", hit, loading, onLoad, imgRef }: GrandHallKingProps) {
  const frame = useKingFrame(mood);
  const sheet = KING_SHEET[variant];
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const shakeRef = useRef<HTMLDivElement | null>(null);
  const lastHit = useRef(hit);

  useEffect(() => {
    const prev = lastHit.current;
    lastHit.current = hit;
    const fired = typeof hit === "number" ? hit !== prev && hit > 0 : !!hit && !prev;
    if (!fired || prefersReducedMotion()) return;
    // Board: current frame + brightness(2) sepia(1) for 2 x 140ms while the king shakes.
    spriteRef.current?.animate(
      [
        { filter: HIT_FILTER, offset: 0 },
        { filter: HIT_FILTER, offset: 0.5 },
        { filter: "none", offset: 0.5 },
        { filter: "none", offset: 1 },
      ],
      { duration: 280, iterations: 2 },
    );
    const shake = shakeRef.current;
    if (!shake) return;
    // gh-shake offsets (4px / 2px) in stage px.
    const u = shake.offsetWidth / ((sheet.width / 100) * STAGE_SOURCE[variant].width) || 1;
    shake.animate(
      [
        { transform: "none" },
        { transform: `translateX(${-4 * u}px)` },
        { transform: `translateX(${4 * u}px)` },
        { transform: `translateX(${-2 * u}px)` },
        { transform: "none" },
      ],
      { duration: 360, easing: "steps(6, end)" },
    );
  }, [hit, sheet.width, variant]);

  return (
    <div
      className="ghs-king"
      role="img"
      aria-label={`The king dealer (${frame === "breath" || frame === "blink" ? "idle" : frame})`}
      style={{ left: `${sheet.left}%`, top: `${sheet.top}%`, width: `${sheet.width}%`, height: `${sheet.height}%` }}
    >
      <div className="ghs-king__shake" ref={shakeRef}>
        <img
          ref={(el) => {
            spriteRef.current = el;
            imgRef?.(el);
          }}
          className="ghs-king__sheet ghs-live"
          src={src}
          alt=""
          width={sheet.frameW * 5}
          height={sheet.frameH}
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={onLoad}
          style={{ ["--ghs-frame" as string]: FRAME_INDEX[frame] }}
        />
      </div>
    </div>
  );
}
