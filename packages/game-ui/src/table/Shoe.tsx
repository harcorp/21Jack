"use client";

import type { Card, HiddenCard } from "@21jack/contracts";
import { animate, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { GhCard } from "../gh";
import { DEAL_SPRING } from "../primitives";
import { StageAnchor } from "../scene";
import { screenScale, u } from "./layout";

export const ShoeContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

/** Invisible box on the scene's card shoe: dealt cards fly out of it. */
export function ShoeMark({ shoeRef }: { shoeRef: RefObject<HTMLDivElement | null> }) {
  return (
    <StageAnchor name="shoe" className="pointer-events-none">
      <div ref={shoeRef} aria-hidden="true" style={{ width: u(40), height: u(56) }} />
    </StageAnchor>
  );
}

const isHidden = (card: Card | HiddenCard | undefined): boolean => !card || "hidden" in card;
const codeOf = (card: Card | HiddenCard | undefined) => (!card || "hidden" in card ? "" : `${card.rank}${card.suit}`);

/**
 * A Grand Hall card that flies from the shoe to its slot once, on mount, then turns face up after
 * `flipDelay` seconds. A card that changes from hidden to known (the hole card) flips in place.
 */
export function DealtCard({
  card,
  width,
  sideways,
  delay,
  flipDelay,
  slowFlip,
  style,
}: {
  card?: Card | HiddenCard;
  width: number;
  sideways?: boolean;
  delay: number;
  flipDelay: number;
  /** The hole card reveal uses the slower flip. */
  slowFlip?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shoe = useContext(ShoeContext);
  const reduce = !!useReducedMotion();
  const known = !isHidden(card);
  const [face, setFace] = useState(() => known && (reduce || flipDelay <= 0));
  const [flipping, setFlipping] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    const from = shoe?.current;
    if (!el || !from || reduce) return;
    el.style.transform = "";
    const a = el.getBoundingClientRect();
    const b = from.getBoundingClientRect();
    if (a.width === 0 || b.width === 0) return;
    const k = screenScale(el);
    const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / k;
    const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / k;
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

  const code = codeOf(card);
  useEffect(() => {
    if (!known) {
      setFace(false);
      return;
    }
    if (face) return;
    if (reduce) {
      setFace(true);
      return;
    }
    const id = window.setTimeout(() => {
      setFace(true);
      setFlipping(true);
    }, Math.max(0, flipDelay * 1000));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, reduce]);

  return (
    <div ref={ref} className="relative will-change-transform" style={style}>
      <GhCard
        card={face ? card : null}
        width={width}
        size={width >= 80 ? "lg" : width <= 46 ? "sm" : "md"}
        sideways={sideways}
        flipIn={flipping}
        className={flipping && slowFlip ? "solo-hole-flip" : undefined}
        onAnimationEnd={() => setFlipping(false)}
      />
    </div>
  );
}

/** Overlapping row of dealt cards (`.gh-cards`); each card is wrapped so it can fly in on its own. */
export function CardRow({
  cards,
  width,
  keyPrefix,
  indexKeys,
  lastSideways,
  delays,
  slowFlipIndex,
  label,
}: {
  cards: ReadonlyArray<Card | HiddenCard>;
  width: number;
  keyPrefix: string;
  /** Key cards by position only (the dealer: the hole card flips in place instead of remounting). */
  indexKeys?: boolean;
  lastSideways?: boolean;
  delays: (i: number) => { delay: number; flipDelay: number };
  slowFlipIndex?: number;
  label: string;
}) {
  return (
    <div className="gh-cards" role="group" aria-label={label} style={{ ["--card-w" as string]: `${width}px` } as CSSProperties}>
      {cards.map((card, i) => {
        const side = !!lastSideways && i === cards.length - 1 && cards.length > 2;
        const { delay, flipDelay } = delays(i);
        return (
          <DealtCard
            key={indexKeys ? `${keyPrefix}-${i}` : `${keyPrefix}-${i}-${codeOf(card)}`}
            card={card}
            width={width}
            sideways={side}
            delay={delay}
            flipDelay={flipDelay}
            slowFlip={slowFlipIndex === i}
            style={{
              marginLeft: i === 0 ? 0 : side ? width * -0.4 : width * -0.55,
              marginRight: side ? width * 0.2 : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
