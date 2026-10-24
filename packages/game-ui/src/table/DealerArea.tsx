"use client";

import type { RoundView } from "@21jack/contracts";
import { motion, useReducedMotion } from "motion/react";
import { GhHandTotal, GhTag } from "../gh";
import { DEAL_STAGGER, stepped } from "../primitives";
import type { DealerReveal } from "../lib/useDealerReveal";
import { CardRow } from "./Shoe";

const SHAKE = { x: [0, -8, 8, -6, 6, -3, 0] };
const STILL = { x: 0 };

/**
 * Dealer cards at the `dealerCards` anchor with the "Dealer" tag, total and note beside them
 * (TableStage: `left: calc(100% + 10px)`). The settlement is staged card by card by `reveal`.
 */
export function DealerHand({
  round,
  reveal,
  cardWidth,
  showTag = true,
}: {
  round: RoundView;
  reveal: DealerReveal;
  cardWidth: number;
  /** Desktop shows the "Dealer" tag above the total; mobile only the total. */
  showTag?: boolean;
}) {
  const reduce = useReducedMotion();
  const settled = round.status === "settled";
  const staged = reveal.revealing;
  const total = reveal.total;
  const bust = total !== null && total > 21;
  const note = !reveal.done ? null : bust ? { text: `Bust ${total}`, tone: "crimson" as const } : total !== null ? { text: `Stands on ${total}`, tone: "stone" as const } : null;

  return (
    <motion.div
      style={{ position: "relative", display: "flex", alignItems: "flex-end" }}
      animate={reveal.done && bust && !reduce ? SHAKE : STILL}
      transition={{ duration: 0.45, ease: stepped(7) }}
    >
      <CardRow
        cards={reveal.cards}
        width={cardWidth}
        keyPrefix={`${round.roundId}-dealer`}
        indexKeys
        label="Dealer's cards"
        slowFlipIndex={reveal.holeFlipping ? 1 : undefined}
        delays={(i) => {
          const delay = staged && i >= 2 ? 0 : i < 2 ? (i * 2 + 1) * DEAL_STAGGER : 0.35 + (i - 2) * 0.35;
          const flipDelay = i === 1 && (staged || settled) ? (staged ? 0 : 0.15) : delay + 0.22;
          return { delay, flipDelay };
        }}
      />
      {showTag ? (
        // Desktop: top-aligned so the note never reaches down into the player's hand meta.
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 10px)",
            top: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <GhTag tone="ghost">Dealer</GhTag>
            <GhHandTotal total={total} />
          </span>
          {note && <GhTag tone={note.tone}>{note.text}</GhTag>}
        </div>
      ) : (
        <div style={{ position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" }}>
          <GhHandTotal total={total} />
        </div>
      )}
    </motion.div>
  );
}
