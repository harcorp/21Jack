"use client";

import { MULTI_BET_SECONDS, MULTI_MAX_SEATS } from "@21jack/contracts";
import type { ReactNode } from "react";
import {
  GH_CHIP_VALUES,
  GhBalance,
  GhBossBar,
  GhButton,
  GhCardRow,
  GhChipSelector,
  GhHandTotal,
  GhIcon,
  GhResultBanner,
  GhStatusBanner,
  GhTableFeed,
  GhTablePlate,
  GhTag,
  GhToast,
  GhTurnTimer,
  ghFmt,
} from "../gh";
import { MultiSeat } from "./MultiSeat";
import { MultiActionBar, StageCanvas } from "./parts";
import type { MultiView } from "./view";

const center = (top: number | string, extra?: object) => ({
  left: "50%",
  top,
  transform: "translateX(-50%)",
  ...extra,
});

/** Banner-sized countdown ring (TableStage dock / bet banner). */
function Ring({ v, size = "sm" }: { v: MultiView; size?: "sm" | "md" }) {
  return (
    <GhTurnTimer
      variant="badge"
      size={size}
      secondsLeft={v.countdown.secondsLeft}
      progress={v.countdown.progress}
      label="Time left"
    />
  );
}

export function dealerNote(total: number | null, cards: number): string | null {
  if (total === null || cards < 2) return null;
  if (total > 21) return "Bust";
  if (total >= 17) return `Stands on ${total}`;
  return null;
}

export function DealerHand({ v, size, dealFrom }: { v: MultiView; size: "md" | "sm"; dealFrom?: { x: number; y: number } }) {
  const { cards, total, revealing, holeFlipping } = v.dealer;
  if (cards.length === 0) return null;
  const hidden = cards.some((c) => "hidden" in c);
  const note = !revealing || !hidden ? dealerNote(total, cards.length) : null;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "flex-end" }} role="group" aria-label="Dealer's cards">
      <GhCardRow
        cards={cards}
        size={size}
        dealtFrom={v.firstSeen(`${v.table.roundNumber}-dealer`, cards.length)}
        dealFrom={dealFrom}
        flipIndexes={holeFlipping ? [1] : undefined}
      />
      <div
        style={{
          position: "absolute",
          left: "calc(100% + 10px)",
          bottom: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <GhTag tone="ghost">Dealer</GhTag>
        <GhHandTotal total={hidden ? null : total} />
        {note && <GhTag tone={total !== null && total > 21 ? "crimson" : "stone"}>{note}</GhTag>}
      </div>
    </div>
  );
}

/** The dock at the bottom of the 1440 stage: chip tray, action bar or a status line. */
function Dock({ v }: { v: MultiView }) {
  const { table } = v;
  const pos = (bottom: number, node: ReactNode) => (
    <div className="mt-abs" style={{ left: "50%", bottom, transform: "translateX(-50%)" }}>
      {node}
    </div>
  );
  const status = (title: ReactNode, sub?: ReactNode, opts?: { ring?: boolean; action?: ReactNode }) =>
    pos(
      20,
      <GhStatusBanner
        lead={opts?.ring ? <Ring v={v} /> : undefined}
        title={title}
        sub={sub}
        action={opts?.action}
        style={{ gap: 14, padding: "10px 12px 10px 18px", fontSize: 17, whiteSpace: "nowrap" }}
      />,
    );

  if (!v.seated) {
    const free = table.seats.some((s) => s === null);
    return status("You're watching", free ? "Only seated players see the action buttons" : "The table is full · watch until a seat frees up");
  }

  const betting = table.phase === "waiting" || table.phase === "betting";
  if (betting && v.canBet) {
    const hint =
      table.phase === "betting" ? `Bets close in ${v.countdown.secondsLeft}s` : `First bet starts a ${MULTI_BET_SECONDS}s countdown`;
    return pos(
      16,
      <GhChipSelector
        layout="stage"
        bet={v.bet}
        balance={v.balance ?? 0}
        chips={GH_CHIP_VALUES}
        selected={v.pendingChips.at(-1) ?? null}
        onAdd={v.addChip}
        onClear={v.clearChips}
        onSubmit={v.placeBet}
        submitLabel="Ready"
        loading={v.busy}
        locked={v.busy}
        hint={hint}
      />,
    );
  }
  if (betting && v.mySeat?.bet != null) {
    return status(
      <>
        <GhIcon name="check" size={18} /> Bet {ghFmt(v.mySeat.bet)} placed
      </>,
      table.phase === "betting" ? `Dealing in ${v.countdown.secondsLeft}s · waiting for the others` : "Waiting for the others",
      { ring: table.phase === "betting" },
    );
  }
  if (table.phase === "playing") {
    if (v.yourTurn) {
      const hand = v.mySeat?.hands[table.turn?.handIndex ?? 0];
      const stake = hand?.stake ?? 0;
      const broke = v.balance !== null && v.balance < stake ? stake - v.balance : 0;
      return pos(
        20,
        <MultiActionBar
          allowed={table.you.allowedActions}
          busy={v.busy}
          brokeBy={broke}
          subs={{
            hit: "Take a card",
            stand: hand ? `Keep ${hand.total}` : "Keep total",
            double: `+${ghFmt(stake)} · one card`,
            split: table.you.allowedActions.includes("split") ? `+${ghFmt(stake)} · two hands` : "Pairs only",
          }}
          onAction={v.act}
        />,
      );
    }
    if (!v.mySeat?.hands.length) return status("Round in progress", "You join the next round");
    const who = v.turnSeat?.username ?? "the table";
    const sub =
      v.yourPlace === null ? "You already played" : v.yourPlace === 1 ? "You play next" : `${v.next ?? "Someone"} plays next, then you`;
    return status(`Waiting for ${who}`, sub, { ring: true });
  }
  if (table.phase === "settled") {
    if (v.dealer.revealing) return status(v.dealer.caption ?? "The King reveals…", "Every hand settles against this same dealer hand");
    return status(`Round ${table.roundNumber} settled`, `Next round in ${v.countdown.secondsLeft}s`, { ring: true });
  }
  return status("Waiting for the first bet", `Place a bet to start a ${MULTI_BET_SECONDS}s countdown`);
}

/** Desktop overlays on the 1440×810 stage, following the TableStage template. */
export function MultiDesktop({ v }: { v: MultiView }) {
  const { table } = v;
  const seatedCount = table.seats.filter(Boolean).length;
  const betting = table.phase === "waiting" || table.phase === "betting";
  const moment = table.phase === "settled" && v.settledDone ? (table.boss.defeated ? "kingslayer" : v.result ? "result" : null) : null;
  const freeSeat = table.seats.findIndex((s) => s === null);

  return (
    <StageCanvas variant="desktop">
      <div className="mt-felt">
        {/* dealer hand */}
        <div className="mt-abs" style={{ left: "50%", top: "45.6%", transform: "translate(-50%, -50%)" }}>
          <DealerHand v={v} size="md" dealFrom={{ x: 185, y: 0 }} />
        </div>
        {Array.from({ length: MULTI_MAX_SEATS }, (_, i) => (
          <MultiSeat key={i} v={v} index={i} />
        ))}
      </div>

      {/* HUD: table plate + feed, boss bar, balance */}
      <div className="mt-abs" style={{ left: 20, top: 16 }}>
        <GhTablePlate
          name="King's Hall"
          mode="Multi"
          meta={`Round ${table.roundNumber} · ${seatedCount}/${MULTI_MAX_SEATS} seats`}
          phase={v.phaseLabel}
          phaseTone={v.phaseTone}
        />
      </div>
      {v.feed.length > 0 && (
        <div className="mt-abs" style={{ left: 20, top: 150, width: 272 }}>
          <GhTableFeed rows={v.feed.map((f) => ({ who: f.who, text: f.text, tone: f.tone }))} />
        </div>
      )}
      <div className="mt-abs" style={center(4)}>
        <GhBossBar boss={v.boss} variant="stage" name="The table King" eventKey={v.bossKey} />
      </div>
      <div className="mt-abs" style={{ right: 20, top: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        {v.balance !== null && (
          <GhBalance value={v.bankroll ?? v.balance} delta={moment === "result" && v.result && v.result.paid > 0 ? v.result.paid : undefined} />
        )}
        {v.seated && (
          <GhButton variant="stone" size="sm" icon="door" disabled={v.busy} onClick={v.leave}>
            Leave seat
          </GhButton>
        )}
      </div>

      {/* centre moments */}
      {betting && (
        <div className="mt-abs mt-inert" style={{ left: "50%", top: "57%", transform: "translate(-50%, -50%)" }}>
          <GhStatusBanner
            lead={table.phase === "betting" ? <Ring v={v} size="md" /> : undefined}
            title={
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <span>Place your bets</span>
                <span className="ghx-banner-sub">
                  {table.phase === "betting" ? "Everyone bets together" : `The first bet starts a ${MULTI_BET_SECONDS}s countdown`}
                </span>
              </span>
            }
            style={{ gap: 16, padding: "12px 22px 12px 14px" }}
          />
        </div>
      )}
      {moment === "kingslayer" && (
        <div className="mt-abs mt-moment mt-moment--long" style={{ left: "50%", top: "36%" }}>
          <GhResultBanner kind="kingslayer" defeats={table.boss.defeats} detail="The table King falls" />
        </div>
      )}
      {moment === "result" && v.result && (
        <div key={`moment-${table.roundNumber}`} className="mt-abs mt-inert mt-moment" style={{ left: "50%", top: "36%" }}>
          <GhResultBanner
            kind={v.result.kind}
            title={v.result.title}
            detail={v.result.detail}
            amount={v.result.paid > 0 ? v.result.paid : undefined}
          />
        </div>
      )}
      {!v.seated && (
        <div className="mt-abs" style={center(92)}>
          <GhStatusBanner
            icon="eye"
            title="Watching"
            sub={freeSeat >= 0 ? `Seat ${freeSeat + 1} is free` : "Every seat is taken"}
            action={
              freeSeat >= 0 ? (
                <GhButton size="sm" disabled={v.busy} onClick={v.join}>
                  Sit down
                </GhButton>
              ) : undefined
            }
            style={{ gap: 14, padding: "8px 10px 8px 16px" }}
          />
        </div>
      )}
      {v.error && (
        <div className="mt-abs" style={center(v.seated ? 92 : 156, { whiteSpace: "nowrap", zIndex: 5 })}>
          <GhToast title={v.error} message="Nothing changed." onDismiss={v.dismissError} />
        </div>
      )}

      <Dock v={v} />
      <div className="gh-footnote mt-abs mt-inert" style={{ left: "50%", bottom: 3, transform: "translateX(-50%)", fontSize: 10, letterSpacing: ".2em" }}>
        Fictional credits only
      </div>
    </StageCanvas>
  );
}

