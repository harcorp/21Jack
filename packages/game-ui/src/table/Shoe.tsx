"use client";

import type { Card } from "@21jack/contracts";
import { animate, useReducedMotion } from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, type RefObject } from "react";
import { CardBack, CARD_SIZE, DEAL_SPRING, PlayingCard } from "../primitives";

export const ShoeContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

/** Card shoe in the top-right corner of the felt; dealt cards fly out of it. */
export function Shoe({ shoeRef }: { shoeRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="voxel-block absolute right-2 top-2 bg-wood-dark p-1 sm:right-4 sm:top-4" aria-hidden="true">
      <div ref={shoeRef} className={`${CARD_SIZE} origin-top-right scale-75 -rotate-6`}>
        <CardBack />
      </div>
    </div>
  );
}

/** A card that animates from the shoe to its slot once, on mount. */
export function DealtCard({
  card,
  delay,
  flipDelay,
  flipDuration,
}: {
  card?: Card;
  delay: number;
  flipDelay: number;
  flipDuration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shoe = useContext(ShoeContext);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    const from = shoe?.current;
    if (!el || !from || reduce) return;
    el.style.transform = "";
    const a = el.getBoundingClientRect();
    const b = from.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.opacity = "0";
    const controls = animate(
      el,
      { x: [dx, 0], y: [dy, 0], rotate: [-14, 0], opacity: [0, 1] },
      { ...DEAL_SPRING, delay, opacity: { duration: 0.06, delay } },
    );
    return () => controls.stop();
    // Mount-only: re-renders must never replay the deal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="relative will-change-transform">
      <PlayingCard card={card} flipDelay={reduce ? 0 : flipDelay} flipDuration={flipDuration} />
    </div>
  );
}
