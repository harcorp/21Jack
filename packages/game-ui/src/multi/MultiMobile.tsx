"use client";

import { MULTI_BET_SECONDS, MULTI_MAX_SEATS } from "@21jack/contracts";
import type { CSSProperties, ReactNode } from "react";
import {
  GH_CHIP_VALUES,
  GhBalance,
  GhBossBar,
  GhButton,
  GhChip,
  GhHand,
  GhHandTotal,
  GhHearts,
  GhIconButton,
  GhPortrait,
  GhResultBadge,
  GhResultBanner,
  GhTag,
  GhToast,
  type GhTagTone,
  GH_SPRITES,
  ghAvatarFor,
  ghAvatarSrc,
  ghFmt,
} from "../gh";
import { DealerHand } from "./MultiDesktop";
import { veiled } from "./MultiSeat";
import { miniResultLabel, seatResult, seatState } from "./model";
import { MultiActionBar, Stake, StageCanvas } from "./parts";
import type { MultiView } from "./view";

const row: CSSProperties = { position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" };
const sub: CSSProperties = { textAlign: "center", fontSize: 13, color: "var(--gh-cream-300)" };

interface Mini {
  index: number;
  name: string;
  avatar?: string;
  empty?: boolean;
  badge: ReactNode;
  ring?: boolean;
  off?: boolean;
}

/** Everyone else, in screen order left to right (turn seat 5 … seat 1), like the MobileStage mini row. */
function miniSeats(v: MultiView): Mini[] {
  const { table } = v;
  const out: Mini[] = [];
  const tag = (tone: GhTagTone, text: string) => (
    <GhTag tone={tone} style={{ height: 22, fontSize: 11 }}>
      {text}
    </GhTag>
  );
  for (let i = MULTI_MAX_SEATS - 1; i >= 0; i--) {
    if (i === v.youSeat) continue;
    const seat = table.seats[i];
    if (!seat) {
      if (!v.seated) out.push({ index: i, name: `Seat ${i + 1}`, empty: true, badge: tag("ghost", "Free") });
      continue;
    }
    const st = seatState(table, i, v.dealer.revealing, false);
    const hand = seat.hands[table.turn?.seat === i ? (table.turn?.handIndex ?? 0) : 0];
    let badge: ReactNode;
    if (table.phase === "settled" && v.settledDone) {
      const r = seatResult(seat);
      badge = r
        ? tag(r.kind === "defeat" ? "crimson" : r.kind === "push" ? "silver" : "you", miniResultLabel(r.kind, r.paid))
        : tag("stone", "Sat out");
    } else if (hand && (st.status === "turn" || st.status === "stood" || table.phase === "settled")) {
      badge = <GhHandTotal total={hand.total} style={{ height: 24, fontSize: 10 }} />;
    } else if (st.status === "waiting" && v.next === seat.username) {
      badge = tag("torch", "Next");
    } else {
      badge = tag(st.status === "ready" ? "gold" : st.tone, st.tag ?? "Waiting");
    }
    out.push({
      index: i,
      name: seat.username,
      avatar: ghAvatarFor(seat.username),
      badge,
      ring: st.status === "turn",
      off: st.status === "out",
    });
  }
  return out;
}

function MiniRow({ v, top }: { v: MultiView; top: number }) {
  const items = miniSeats(v);
  if (items.length === 0) return null;
  return (
    <div
      className="mt-abs"
      role="list"
      aria-label="Other players, in seat order from left to right"
      style={{ left: 10, right: 10, top, display: "flex", justifyContent: items.length < 4 ? "center" : "space-between", gap: 4 }}
    >
      {items.map((m) => (
        <div
          key={m.index}
          role="listitem"
          style={{ width: 88, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          {m.empty ? (
            <button
              type="button"
              className="gh-portrait gh-portrait--sm is-empty"
              style={{ color: "var(--gh-gold-200)", border: 0, cursor: v.busy ? "default" : "pointer" }}
              aria-label={`Sit at seat ${m.index + 1}`}
              disabled={v.busy}
              onClick={v.join}
            >
              +
            </button>
          ) : (
            <GhPortrait
              size="sm"
              avatar={m.avatar}
              alt=""
              active={m.ring}
              off={m.off}
              ringOnly
              timer={m.ring ? { progress: v.countdown.progress } : undefined}
            />
          )}
          <span className="gh-seat__name" style={{ display: "block", fontSize: 13, maxWidth: 84, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.name}
          </span>
          {m.badge}
        </div>
      ))}
    </div>
  );
}

function YourPlate({ v, top }: { v: MultiView; top: number }) {
  const seat = v.mySeat;
  if (!seat) return null;
  const ring = v.yourTurn;
  return (
    <div style={{ ...row, top }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "8px 18px 8px 14px",
          background: "rgba(14, 12, 18, .74)",
          boxShadow: "inset 0 0 0 2px #1A1014, inset 0 0 0 4px #8A5A14",
        }}
      >
        <GhPortrait
          avatar={ghAvatarFor(seat.username)}
          alt="Your avatar"
          you={!ring}
          active={ring}
          timer={ring ? { secondsLeft: v.countdown.secondsLeft, progress: v.countdown.progress } : undefined}
          style={{ width: 56, height: 56, flex: "none" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="gh-seat__name" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {seat.username}
            </span>
            <GhTag tone="you">You</GhTag>
          </div>
          <GhHearts results={v.hearts[seat.accountId] ?? [null, null, null]} />
          <div className="gh-plaque" aria-label={`Your balance ${ghFmt(v.bankroll ?? 0)} credits`}>
            <img src={GH_SPRITES.coin} alt="" />
            <span>{ghFmt(v.bankroll ?? 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ top, avatar, title, note }: { top: number; avatar?: string; title: ReactNode; note?: ReactNode }) {
  return (
    <div className="mt-abs" style={{ left: 16, right: 16, top, display: "flex", flexDirection: "column", gap: 8 }} role="status">
      <div className="gh-banner" style={{ fontSize: 16, gap: 10 }}>
        {avatar && (
          <img
            src={avatar}
            alt=""
            className="gh-pixelated"
            style={{ width: 32, height: 32, borderRadius: "50%", background: "#2A2630", boxShadow: "0 0 0 2px #1A1014, 0 0 0 4px #FFAA3B" }}
          />
        )}
        <span>{title}</span>
      </div>
      {note && <span style={sub}>{note}</span>}
    </div>
  );
}

/** Mobile overlays on the 390×844 portrait stage, following the MobileStage template. */
export function MultiMobile({ v }: { v: MultiView }) {
  const { table } = v;
  const seat = v.mySeat;
  const betting = table.phase === "waiting" || table.phase === "betting";
  const showOutcome = table.phase === "settled" && v.settledDone;
  const hands = seat?.hands ?? [];
  const inRound = hands.length > 0 && !betting;
  const hits = showOutcome && table.boss.delta < 0 ? -table.boss.delta : 0;
  // Layout rows (MobileStage `L`): betting moves the plate and mini row up for the tray.
  const L = betting && v.seated ? { stake: 390, plate: 484, mini: 568, tray: 668, dock: 728 } : { stake: 400, plate: 522, mini: 608, tray: 640, dock: 728 };
  const preStake = v.canBet ? v.bet : (seat?.bet ?? 0);
  const placedSum = v.placedChips.reduce((s, c) => s + c, 0);
  const preChips = v.canBet ? v.pendingChips : placedSum === preStake && placedSum > 0 ? v.placedChips : null;

  let dock: ReactNode = null;
  if (!v.seated) {
    const free = table.seats.some((s) => s === null);
    dock = (
      <div className="mt-abs" style={{ left: 16, right: 16, top: L.dock, display: "flex", flexDirection: "column", gap: 8 }} role="status">
        <div className="gh-banner" style={{ fontSize: 16, gap: 10, justifyContent: "space-between" }}>
          <span>You're watching</span>
          {free && (
            <GhButton size="sm" loading={v.busy} onClick={v.join}>
              Take a seat
            </GhButton>
          )}
        </div>
        <span style={sub}>{free ? "Only seated players see the action buttons" : "The table is full"}</span>
      </div>
    );
  } else if (betting && v.canBet) {
    dock = (
      <div className="mt-abs" style={{ left: 0, right: 0, top: L.tray, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div className="gh-tray" style={{ padding: "10px 12px 12px", gap: 6 }} role="group" aria-label="Chips">
          {GH_CHIP_VALUES.map((c) => (
            <GhChip
              key={c}
              value={c}
              diameter={44}
              selected={v.pendingChips.at(-1) === c}
              disabled={v.busy || v.balance === null || c > v.balance - v.bet}
              disabledReason="not enough credits"
              onClick={v.addChip}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: 358 }}>
          <div className="gh-frame gh-notch" style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5, width: 100, boxSizing: "border-box", flex: "none" }}>
            <span className="gh-eyebrow" style={{ fontSize: 11 }}>
              Bet
            </span>
            <span className="gh-num" style={{ fontSize: 16, color: "#FFE08A" }} aria-live="polite">
              {ghFmt(v.bet)}
            </span>
          </div>
          <GhButton variant="stone" size="sm" disabled={v.busy || v.bet <= 0} onClick={v.clearChips} style={{ minHeight: 56 }}>
            Clear
          </GhButton>
          <GhButton disabled={v.busy || v.bet <= 0} loading={v.busy} onClick={v.placeBet} style={{ flex: 1, minHeight: 56, fontSize: 20 }}>
            Ready
          </GhButton>
        </div>
      </div>
    );
  } else if (betting && seat?.bet != null) {
    dock = (
      <Banner
        top={L.dock}
        title={`Bet ${ghFmt(seat.bet)} placed`}
        note={table.phase === "betting" ? `Dealing in ${v.countdown.secondsLeft}s · waiting for the others` : "Waiting for the others"}
      />
    );
  } else if (table.phase === "playing" && v.yourTurn) {
    const hand = hands[table.turn?.handIndex ?? 0];
    const stake = hand?.stake ?? 0;
    dock = (
      <div className="mt-abs" style={{ left: 0, right: 0, top: L.dock }}>
        <MultiActionBar
          compact
          allowed={table.you.allowedActions}
          busy={v.busy}
          brokeBy={v.balance !== null && v.balance < stake ? stake - v.balance : 0}
          subs={{
            hit: "Take a card",
            stand: hand ? `Keep ${hand.total}` : "Keep",
            double: `+${ghFmt(stake)}`,
            split: table.you.allowedActions.includes("split") ? `+${ghFmt(stake)}` : "Pairs only",
          }}
          onAction={v.act}
        />
      </div>
    );
  } else if (table.phase === "playing") {
    if (!hands.length) dock = <Banner top={L.dock} title="Round in progress" note="You join the next round" />;
    else {
      const who = v.turnSeat;
      const note = v.yourPlace === null ? "You already played" : v.yourPlace === 1 ? "You play next" : `You play after ${v.next ?? "the others"}`;
      dock = (
        <Banner
          top={L.dock + 2}
          avatar={who ? ghAvatarSrc(ghAvatarFor(who.username)) : undefined}
          title={`Waiting for ${who?.username ?? "the table"} · ${v.countdown.secondsLeft}s`}
          note={note}
        />
      );
    }
  } else if (table.phase === "settled") {
    if (v.dealer.revealing) dock = <Banner top={L.dock} title={v.dealer.caption ?? "The King reveals…"} note="Every hand settles against this same dealer hand" />;
    else {
      const r = v.result;
      dock = (
        <div className="mt-abs" style={{ left: 16, right: 16, top: L.dock - 12, display: "flex", flexDirection: "column", gap: 8 }} role="status">
          <div className="gh-frame gh-frame--glass gh-notch" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
            <span className="gh-label" style={{ fontSize: 15, color: "#FFE08A" }}>
              {r ? `Returned ${r.paid > 0 ? "+" : ""}${ghFmt(r.paid)}` : `Round ${table.roundNumber} settled`}
            </span>
            <span className="gh-num" style={{ fontSize: 10, color: "#EFE3C8" }}>
              {r ? `Net ${r.net > 0 ? "+" : r.net < 0 ? "−" : ""}${ghFmt(Math.abs(r.net))}` : ""}
            </span>
          </div>
          <div style={{ height: 8, background: "#1A1014", boxShadow: "inset 0 0 0 2px #4A4450" }} role="progressbar" aria-label="Time until the next round">
            <div style={{ height: "100%", width: `${Math.round((1 - v.countdown.progress) * 100)}%`, background: "#E8B53A" }} />
          </div>
          <span className="gh-footnote" style={{ textAlign: "center", fontSize: 11 }}>
            Next round in {v.countdown.secondsLeft} · Bets open soon
          </span>
        </div>
      );
    }
  } else {
    dock = <Banner top={L.dock} title="Waiting for the first bet" note={`A bet starts the ${MULTI_BET_SECONDS}s countdown`} />;
  }

  return (
    <StageCanvas variant="mobile">
      {/* top row: table plate, balance, leave */}
      <div className="mt-abs" style={{ left: 12, right: 12, top: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div className="gh-frame gh-frame--glass gh-notch" style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="gh-display" style={{ fontSize: 15, color: "#FFE08A", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
            King's Hall
          </span>
          <span style={{ fontSize: 11, color: "#D9CBAE", whiteSpace: "nowrap" }}>
            Round {table.roundNumber} · {v.phaseLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          {v.balance !== null && <GhBalance value={v.bankroll ?? v.balance} compact />}
          {v.seated && <GhIconButton icon="door" label="Leave seat" size={44} disabled={v.busy} onClick={v.leave} />}
        </div>
      </div>

      {/* compact boss bar */}
      <div style={{ ...row, top: 68 }}>
        <GhBossBar boss={v.boss} variant="mobile" width={318} name="The table King" eventKey={v.bossKey} />
      </div>
      {hits > 0 && (
        <div className="mt-abs" style={{ right: 36, top: 106 }}>
          <GhTag tone="torch">King hit −{hits}</GhTag>
        </div>
      )}

      {showOutcome && table.boss.defeated && (
        <div className="mt-abs mt-inert" style={{ left: "50%", top: 150, transform: "translateX(-50%) scale(.62)", transformOrigin: "50% 0" }}>
          <GhResultBanner kind="kingslayer" defeats={table.boss.defeats} />
        </div>
      )}

      {/* dealer hand */}
      {v.dealer.cards.length > 0 && (
        <div style={{ ...row, top: 290, alignItems: "center", gap: 10 }}>
          <DealerHand v={v} size="sm" dealFrom={{ x: 140, y: 0 }} />
        </div>
      )}

      {/* betting: your stake on the circle */}
      {v.seated && betting && (
        <div className="mt-abs" style={{ left: 0, right: 0, top: L.stake, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <GhTag tone={table.phase === "betting" ? "torch" : "ghost"}>
            {table.phase === "betting" ? `Bets close in ${v.countdown.secondsLeft}` : v.canBet ? "Place your bet" : "Bet placed"}
          </GhTag>
          {preStake > 0 && <Stake key={`${table.roundNumber}-bet`} amount={preStake} chips={preChips} from={{ x: 0, y: 90 }} />}
        </div>
      )}

      {/* your hand(s) */}
      {inRound && (
        <div style={{ ...row, top: hands.length === 2 ? 364 : 360, gap: 30 }}>
          {hands.map((hand, k) => {
            const key = `${table.roundNumber}-${hand.handId}`;
            const won = (hand.payout ?? 0) > 0;
            const active = v.yourTurn && table.turn?.handIndex === k;
            return (
              <div key={hand.handId} style={{ position: "relative" }}>
                <GhHand
                  hand={veiled(hand, false)}
                  size={hands.length === 2 ? "md" : "lg"}
                  hideStake
                  active={active}
                  waiting={table.phase === "playing" && !active && hand.status === "playing"}
                  label={hands.length === 2 ? (k === 0 ? "Left" : "Right") : undefined}
                  dealtFrom={v.firstSeen(key, hand.cards.length)}
                  dealFrom={{ x: 140, y: -70 }}
                  extra={
                    <Stake
                      key={`${key}-${showOutcome ? "settled" : "play"}`}
                      size="sm"
                      amount={showOutcome && won ? (hand.payout ?? hand.stake) : hand.stake}
                      lost={!showOutcome && hand.status === "bust"}
                      collect={showOutcome ? (won ? { x: 0, y: 150 } : { x: 0, y: -110 }) : null}
                      style={{ marginLeft: 4 }}
                    />
                  }
                />
                {showOutcome && hand.outcome && (
                  // MobileStage: the result sits over the cards, so the meta row stays one line.
                  <div style={{ position: "absolute", left: "50%", top: "38%", transform: "translate(-50%, -50%)", zIndex: 2 }}>
                    <GhResultBadge outcome={hand.outcome} payout={hand.payout ?? 0} size={hands.length === 2 ? "seat" : "stage"} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <YourPlate v={v} top={L.plate} />
      <MiniRow v={v} top={v.seated ? L.mini : 470} />

      {v.error && (
        <div className="mt-abs" style={{ left: 12, right: 12, top: 118, zIndex: 5 }}>
          <GhToast title={v.error} message="Nothing changed." onDismiss={v.dismissError} />
        </div>
      )}

      {dock}

      <div style={{ ...row, top: "auto", bottom: 10 }} className="mt-inert">
        <span className="gh-footnote" style={{ fontSize: 10 }}>
          Fictional credits only
        </span>
      </div>
    </StageCanvas>
  );
}
