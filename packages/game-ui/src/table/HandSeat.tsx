"use client";

import type { HandView } from "@21jack/contracts";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { GhHandTotal, GhResultBadge, GhStyles, GhTag, cx, type GhTagTone } from "../gh";
import { DEAL_STAGGER } from "../primitives";
import { CardRow } from "./Shoe";

const SHAKE = { x: [0, -8, 8, -6, 6, -3, 0] };
const STILL = { x: 0 };

function handTags(hand: HandView, settled: boolean): Array<{ text: string; tone: GhTagTone }> {
  const tags: Array<{ text: string; tone: GhTagTone }> = [];
  if (hand.soft && hand.total < 21 && hand.status !== "bust" && hand.status !== "blackjack") tags.push({ text: "Soft", tone: "soft" });
  if (hand.status === "doubled") tags.push({ text: "Doubled", tone: "torch" });
  if (hand.status === "bust") tags.push({ text: "Bust", tone: "crimson" });
  if (hand.splitAces) tags.push({ text: "1 card only", tone: "stone" });
  if (!settled && (hand.status === "stood" || hand.status === "twentyone")) tags.push({ text: "Stood", tone: "stone" });
  return tags;
}

/**
 * One of the player's hands on the felt: the dealt cards with the total, tags and (once revealed)
 * the result beside them (`meta` = left / right) or above them (mobile split).
 */
export function PlayerHand({
  hand,
  index,
  split,
  active,
  waiting,
  settled,
  cardWidth,
  meta,
  resultOnCards,
}: {
  hand: HandView;
  index: number;
  split: boolean;
  active: boolean;
  waiting: boolean;
  /** Outcome on screen (the dealer reveal is over). */
  settled: boolean;
  cardWidth: number;
  meta: "left" | "right" | "above";
  resultOnCards: boolean;
}) {
  const reduce = useReducedMotion();
  const bust = hand.status === "bust";
  const outcome = settled ? hand.outcome : undefined;
  const label = split ? `${index === 0 ? "Left" : "Right"}${active ? " · playing" : waiting ? " · next" : ""}` : null;
  const total = hand.status === "blackjack" ? 21 : hand.total;
  const result = outcome ? <GhResultBadge outcome={outcome} payout={hand.payout ?? 0} size="stage" /> : null;

  const metaItems: ReactNode = (
    <>
      {label && meta !== "above" && (
        <span className="gh-hand__label" style={active ? { color: "var(--gh-gold-200)" } : undefined}>
          {label}
        </span>
      )}
      <GhHandTotal total={total} />
      {handTags(hand, !!outcome).map((t) => (
        <GhTag key={t.text} tone={t.tone}>
          {t.text}
        </GhTag>
      ))}
      {!resultOnCards && result}
    </>
  );

  return (
    <motion.div
      animate={bust && !reduce ? SHAKE : STILL}
      transition={{ duration: 0.4, ease: "linear" }}
      role="group"
      aria-label={`${split ? `${index === 0 ? "Left" : "Right"} hand` : "Your hand"}${active ? ", your move" : ""}`}
    >
      <div className={cx("gh-hand", active && "is-active", waiting && "is-waiting")} style={{ gap: 6 }}>
        {meta === "above" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            {label && (
              <span className="gh-hand__label" style={active ? { color: "var(--gh-gold-200)" } : undefined}>
                {label.split(" · ")[0]}
              </span>
            )}
            <GhHandTotal total={total} />
            {handTags(hand, !!outcome)
              .slice(0, 1)
              .map((t) => (
                <GhTag key={t.text} tone={t.tone}>
                  {t.text}
                </GhTag>
              ))}
          </div>
        )}
        <div className="ghx-hand-cards">
          <CardRow
            cards={hand.cards}
            width={cardWidth}
            keyPrefix={hand.handId}
            lastSideways={hand.status === "doubled"}
            label={split ? `${index === 0 ? "Left" : "Right"} hand cards` : "Your cards"}
            delays={(i) => {
              const delay = i < 2 && !hand.fromSplit ? i * 2 * DEAL_STAGGER : i === 1 && hand.fromSplit ? index * 0.25 : 0;
              return { delay, flipDelay: delay + 0.22 };
            }}
          />
          {meta !== "above" && <div className={cx("ghx-hand-side", `ghx-hand-side--${meta}`)}>{metaItems}</div>}
          {resultOnCards && result && (
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 2 }}>{result}</div>
          )}
        </div>
      </div>
      <GhStyles />
    </motion.div>
  );
}
