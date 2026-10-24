"use client";

import type { Card } from "@21jack/contracts";
import { motion, useReducedMotion } from "motion/react";
import { CrownSigil } from "./CrownSigil";
import { stepped } from "./motion";
import { SUIT_NAMES, SuitGlyph, isRedSuit } from "./SuitGlyph";

export const CARD_SIZE = "h-20 w-14 sm:h-28 sm:w-20";

const RANK_NAMES: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };

export function cardLabel(card: Card) {
  return `${RANK_NAMES[card.rank] ?? card.rank} of ${SUIT_NAMES[card.suit]}`;
}

export function CardFace({ card }: { card: Card }) {
  const color = isRedSuit(card.suit) ? "text-carpet" : "text-ink";
  const royal = card.rank === "J" || card.rank === "Q" || card.rank === "K";
  return (
    <div className={`relative h-full w-full border-2 border-ink bg-parchment ${color} font-pixel`}>
      <div className="absolute left-1 top-0.5 flex flex-col items-center leading-none">
        <span className="text-xs sm:text-base">{card.rank}</span>
        <SuitGlyph suit={card.suit} className="mt-0.5 h-2 w-2 sm:h-3 sm:w-3" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {royal && <CrownSigil className="h-3 w-3 sm:h-4 sm:w-4" />}
        <SuitGlyph suit={card.suit} className="h-6 w-6 sm:h-9 sm:w-9" />
      </div>
      <div className="absolute bottom-0.5 right-1 flex rotate-180 flex-col items-center leading-none">
        <span className="text-xs sm:text-base">{card.rank}</span>
        <SuitGlyph suit={card.suit} className="mt-0.5 h-2 w-2 sm:h-3 sm:w-3" />
      </div>
    </div>
  );
}

export function CardBack() {
  return (
    <div className="flex h-full w-full items-center justify-center border-2 border-ink bg-carpet p-1">
      <div className="flex h-full w-full items-center justify-center border-2 border-gold bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(0_0_0/0.18)_4px_8px)]">
        <CrownSigil className="h-7 w-7 sm:h-10 sm:w-10" />
      </div>
    </div>
  );
}

/**
 * A card that can be face down (`card` undefined) and flips face up with a stepped 3D rotation
 * once the real card arrives. The face is never rendered before the card is known.
 */
export function PlayingCard({ card, flipDelay = 0, flipDuration = 0.4 }: { card?: Card; flipDelay?: number; flipDuration?: number }) {
  const reduce = useReducedMotion();
  const faceUp = card !== undefined;
  return (
    <div className={`${CARD_SIZE} shrink-0 [perspective:600px]`} role="img" aria-label={card ? cardLabel(card) : "Face-down card"}>
      <motion.div
        className="relative h-full w-full shadow-[4px_4px_0_rgb(0_0_0/0.35)] [transform-style:preserve-3d]"
        initial={{ rotateY: 180 }}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={reduce ? { duration: 0 } : { duration: flipDuration, delay: flipDelay, ease: stepped(5) }}
      >
        {card && (
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <CardFace card={card} />
          </div>
        )}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardBack />
        </div>
      </motion.div>
    </div>
  );
}
