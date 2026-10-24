"use client";

import type { Action } from "@21jack/contracts";
import {
  GH_ACTIONS,
  GH_AVATAR_IDS,
  GH_CHIP_VALUES,
  GH_ICONS,
  GhActionBar,
  GhActionButton,
  GhBalance,
  GhBet,
  GhBetSpot,
  GhBossBar,
  GhButton,
  GhCard,
  GhCardRow,
  GhChip,
  GhChipSelector,
  GhChipStack,
  GhCoin,
  GhCrest,
  GhCrestBanner,
  GhDealButton,
  GhHand,
  GhHandTotal,
  GhHearts,
  GhIcon,
  GhIconButton,
  GhKingPortrait,
  GhLeaveButton,
  GhLoading,
  GhMiniPortraitRow,
  GhNewRoundButton,
  GhPortrait,
  GhReadyButton,
  GhReadyTray,
  GhResultBadge,
  GhResultBanner,
  GhSeatPlaque,
  GhSitButton,
  GhSplitHands,
  GhStake,
  GhStatusBanner,
  GhTableFeed,
  GhTablePlate,
  GhTag,
  GhToast,
  GhTurnTimer,
  type GhButtonVariant,
  type GhChipValue,
  type GhIconName,
} from "@21jack/game-ui";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { boss, c, cards, hand } from "./fixtures";

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/* ------------------------------------------------------------ layout bits */

function Board({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }} aria-labelledby={`b-${title}`}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="gh-eyebrow">{eyebrow}</div>
        <h2 id={`b-${title}`} className="gh-display gh-shadow-text" style={{ margin: 0, fontSize: "clamp(30px, 6vw, 44px)", color: "var(--gh-gold-200)" }}>
          {title}
        </h2>
        {intro && <p style={{ margin: 0, fontSize: 15, color: "var(--gh-cream-300)" }}>{intro}</p>}
      </header>
      {children}
    </section>
  );
}

function Panel({ title, tone, children, style }: { title?: string; tone?: "felt" | "wood" | "stone" | "crimson"; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className={`gh-frame gh-notch${tone ? ` gh-frame--${tone}` : ""}`}
      style={{ display: "flex", flexDirection: "column", gap: 16, padding: "22px 26px", minWidth: 0, ...style }}
    >
      {title && <h3 className="gh-panel-title">{title}</h3>}
      {children}
    </div>
  );
}

function Row({ children, gap = 24, align = "flex-end", style }: { children: ReactNode; gap?: number; align?: CSSProperties["alignItems"]; style?: CSSProperties }) {
  return <div style={{ display: "flex", flexWrap: "wrap", alignItems: align, gap, ...style }}>{children}</div>;
}

function Item({ cap, children, style, wide }: { cap: string; children: ReactNode; style?: CSSProperties; wide?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: "100%", ...style }}>
      {wide ? <div style={{ maxWidth: "100%", overflowX: "auto", padding: "16px 8px 8px" }}>{children}</div> : children}
      <span className="ghx-cap" style={{ textAlign: "center" }}>
        {cap}
      </span>
    </div>
  );
}

function Scroll({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto", paddingBottom: 6, paddingTop: 10, maxWidth: "100%" }}>{children}</div>;
}

function Grid({ min, children, gap = 24 }: { min: number; children: ReactNode; gap?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap }}>{children}</div>;
}

const felt: CSSProperties = {
  background: "radial-gradient(120% 100% at 50% 30%, var(--gh-felt-600), var(--gh-felt-800))",
  boxShadow: "inset 0 0 0 2px var(--gh-ink), inset 0 0 0 4px var(--gh-gold-500)",
  padding: "28px 20px 18px",
};

/* ----------------------------------------------------------------- boards */

function CardsBoard() {
  const [dealKey, setDealKey] = useState(0);
  const [revealed, setRevealed] = useState(false);
  return (
    <Board eyebrow="Primitives" title="Playing cards" intro="GhCard / GhCardRow: CSS cards with inline pixel SVG pips, every rank and suit, face-down back, sideways double, deal and flip hooks.">
      <Grid min={420}>
        <Panel title="Sizes · sm 46 · md 64 · lg 84 · xl 108">
          <Row gap={28}>
            {(["sm", "md", "lg", "xl"] as const).map((s) => (
              <Item key={s} cap={s}>
                <GhCardRow cards={cards("Ah")} size={s} />
              </Item>
            ))}
            <Item cap="width 40 (scaled seat)">
              <GhCardRow cards={cards("Qd", "7c")} width={40} />
            </Item>
          </Row>
        </Panel>
        <Panel title="Back · sideways · overlap">
          <Row gap={28}>
            <Item cap="back lg">
              <GhCardRow cards={cards("down")} size="lg" />
            </Item>
            <Item cap="hole card">
              <GhCardRow cards={cards("Ks", "down")} />
            </Item>
            <Item cap="double sideways">
              <GhCardRow cards={cards("5d", "6c", "10s")} lastSideways />
            </Item>
          </Row>
        </Panel>
      </Grid>
      <Panel title="Every rank">
        <Scroll>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Row gap={8} align="center" style={{ flexWrap: "nowrap" }}>
              <span className="ghx-cap" style={{ width: 92 }}>Spades · sm</span>
              {RANKS.map((r) => (
                <GhCard key={r} card={c(`${r}s`)} size="sm" />
              ))}
            </Row>
            <Row gap={8} align="center" style={{ flexWrap: "nowrap" }}>
              <span className="ghx-cap" style={{ width: 92 }}>Mixed · md</span>
              {["Ad", "3c", "6h", "8s", "10d", "Jc", "Qh", "Kc"].map((k) => (
                <GhCard key={k} card={c(k)} />
              ))}
            </Row>
          </div>
        </Scroll>
      </Panel>
      <Grid min={320}>
        <Panel title="Deal · is-dealt">
          <div style={{ minHeight: 110, display: "flex", alignItems: "center" }}>
            <GhCardRow key={dealKey} cards={cards("As", "Kh", "7d")} dealtFrom={0} dealFrom={{ x: 220, y: -160 }} />
          </div>
          <Row>
            <GhButton size="sm" variant="stone" onClick={() => setDealKey((k) => k + 1)}>
              Replay deal
            </GhButton>
          </Row>
        </Panel>
        <Panel title="Hole card flip">
          <div style={{ minHeight: 110, display: "flex", alignItems: "center" }}>
            <GhCardRow cards={revealed ? cards("10c", "9h") : cards("10c", "down")} flipIndexes={revealed ? [1] : []} />
          </div>
          <Row>
            <GhButton size="sm" variant="stone" onClick={() => setRevealed((r) => !r)}>
              {revealed ? "Hide" : "Reveal"}
            </GhButton>
          </Row>
        </Panel>
      </Grid>
    </Board>
  );
}

function ChipsBoard() {
  return (
    <Board eyebrow="Primitives" title="Chips" intro="GhChip (upright buttons), GhChipStack (flat stake stacks, max eight, overflow marker), GhStake, GhBetSpot.">
      <Panel title="Denominations · lg 72 · md 56 · sm 36" tone="felt">
        <Grid min={170} gap={16}>
          {GH_CHIP_VALUES.map((v) => (
            <Item key={v} cap={v.toLocaleString("en-US")}>
              <Row gap={10} align="center" style={{ flexWrap: "nowrap" }}>
                <GhChip value={v} size="lg" />
                <GhChip value={v} />
                <GhChip value={v} size="sm" />
              </Row>
            </Item>
          ))}
        </Grid>
      </Panel>
      <Grid min={360}>
        <Panel title="States" tone="wood">
          <Row gap={28}>
            <Item cap="default"><GhChip value={25} /></Item>
            <Item cap="hover"><GhChip value={25} style={{ transform: "translateY(-3px)" }} /></Item>
            <Item cap="selected"><GhChip value={25} selected /></Item>
            <Item cap="disabled"><GhChip value={500} disabled disabledReason="above your balance" /></Item>
          </Row>
        </Panel>
        <Panel title="Stake stacks" tone="felt">
          <Row gap={34} style={{ paddingBottom: 30, paddingTop: 20 }}>
            {[10, 25, 60, 250, 1000, 2500].map((a) => (
              <GhChipStack key={a} amount={a} showValue />
            ))}
            <GhChipStack amount={9875} showValue />
          </Row>
        </Panel>
      </Grid>
      <Grid min={360}>
        <Panel title="Stake · GhStake" tone="felt">
          <Row gap={28} align="center">
            <Item cap="pill (stage)"><GhStake amount={50} /></Item>
            <Item cap="plain (board)"><GhStake amount={25} tone="plain" /></Item>
            <Item cap="lost"><GhStake amount={10} lost tone="plain" /></Item>
            <Item cap="sm / xs"><Row gap={12} align="center"><GhStake amount={40} size="sm" /><GhStake amount={20} size="xs" /></Row></Item>
          </Row>
        </Panel>
        <Panel title="Bet spot · GhBetSpot" tone="felt">
          <Row gap={28} align="center" style={{ paddingBottom: 18 }}>
            <Item cap="empty"><GhBetSpot amount={0} /></Item>
            <Item cap="building"><GhBetSpot amount={35} active /></Item>
            <Item cap="placed"><GhBetSpot amount={250} /></Item>
            <Item cap="locked"><GhBetSpot amount={50} locked /></Item>
            <Item cap="sm"><GhBetSpot amount={0} size="sm" /></Item>
          </Row>
        </Panel>
      </Grid>
    </Board>
  );
}

function ChipSelectorBoard() {
  const [placed, setPlaced] = useState<GhChipValue[]>([10, 25]);
  const bet = placed.reduce((s, v) => s + v, 0);
  const [ready, setReady] = useState(false);
  return (
    <Board eyebrow="UI components" title="Chip selector" intro="GhChipSelector (desktop, stage and mobile layouts) and GhReadyTray for multiplayer. The first tray is interactive.">
      <Scroll>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "max-content" }}>
          <Item cap="interactive · building a bet" style={{ alignItems: "flex-start" }}>
            <GhChipSelector
              bet={bet}
              balance={1240}
              min={10}
              max={500}
              selected={placed.at(-1) ?? null}
              onAdd={(v) => setPlaced((p) => [...p, v])}
              onUndo={() => setPlaced((p) => p.slice(0, -1))}
              onClear={() => setPlaced([])}
              onSubmit={() => setPlaced([])}
            />
          </Item>
          <Item cap="empty · min 10 · max 500" style={{ alignItems: "flex-start" }}>
            <GhChipSelector bet={0} balance={1240} min={10} max={500} />
          </Item>
          <Item cap="max reached · chips that would go over are locked" style={{ alignItems: "flex-start" }}>
            <GhChipSelector bet={500} balance={1240} min={10} max={500} />
          </Item>
          <Item cap="low balance · only 30 credits left" style={{ alignItems: "flex-start" }}>
            <GhChipSelector bet={0} balance={30} min={10} max={500} />
          </Item>
          <Item cap="stage dock · ready + hint" style={{ alignItems: "flex-start" }}>
            <GhChipSelector layout="stage" bet={50} balance={1240} min={10} max={500} selected={25} submitLabel="Ready" hint="Bets close in 12s" />
          </Item>
        </div>
      </Scroll>
      <Row gap={32} align="flex-start">
        <Item cap="multiplayer · shared countdown" wide style={{ alignItems: "flex-start" }}>
          <GhReadyTray bet={50} ready={ready} onReady={() => setReady(true)} timer={<GhTurnTimer variant="dial" size="sm" secondsLeft={9} progress={0.6} />} />
        </Item>
        <Item cap="ready · chips locked until the deal" wide style={{ alignItems: "flex-start" }}>
          <GhReadyTray bet={50} ready />
        </Item>
        <Item cap="mobile tray · 358 wide" wide style={{ alignItems: "flex-start" }}>
          <GhChipSelector layout="mobile" bet={35} balance={1240} min={10} max={500} selected={25} />
        </Item>
      </Row>
    </Board>
  );
}

function ButtonsBoard() {
  const variants: Array<[GhButtonVariant, string]> = [
    ["gold", "Deal"],
    ["crimson", "Leave"],
    ["stone", "Cancel"],
    ["felt", "Ready"],
    ["wood", "Deposit"],
    ["ghost", "Watch"],
  ];
  const [busy, setBusy] = useState<Action | null>(null);
  const [last, setLast] = useState<string>("press H, S, D or P");
  useEffect(() => {
    if (!busy) return;
    const t = window.setTimeout(() => setBusy(null), 900);
    return () => window.clearTimeout(t);
  }, [busy]);
  return (
    <Board eyebrow="UI components" title="Buttons and actions" intro="GhButton (variants × states, sizes, presets) and GhActionButton / GhActionBar for Hit, Stand, Double and Split.">
      <Scroll>
        <div style={{ display: "grid", gridTemplateColumns: "90px repeat(6, 150px)", gap: "10px 12px", alignItems: "center", width: "max-content" }}>
          <span />
          {["Default", "Hover", "Pressed", "Focus", "Disabled", "Loading"].map((h) => (
            <span key={h} className="ghx-cap">{h}</span>
          ))}
          {variants.map(([v, label]) => (
            <ButtonRow key={v} variant={v} label={label} />
          ))}
        </div>
      </Scroll>
      <Row gap={14} align="center">
        <GhButton size="sm">Join</GhButton>
        <GhButton>Join</GhButton>
        <GhButton size="lg">Join</GhButton>
        <GhButton size="xl">Play</GhButton>
        <GhIconButton icon="menu" label="Open menu" />
      </Row>
      <Row gap={14} align="center">
        <span className="ghx-cap">Presets</span>
        <GhDealButton />
        <GhReadyButton />
        <GhNewRoundButton />
        <GhSitButton />
        <GhSitButton>Take a seat</GhSitButton>
        <GhLeaveButton />
      </Row>
      <Scroll>
        <div style={{ display: "grid", gridTemplateColumns: "90px repeat(6, 130px)", gap: "12px 16px", alignItems: "center", width: "max-content" }}>
          <span />
          {["Enabled", "Hover", "Pressed", "Focus", "Disabled", "No credits"].map((h) => (
            <span key={h} className="ghx-cap">{h}</span>
          ))}
          {GH_ACTIONS.map((a) => {
            const sub = a === "double" || a === "split" ? "+10 stake" : undefined;
            return (
              <ActionRow key={a} action={a} sub={sub} />
            );
          })}
        </div>
      </Scroll>
      <Row gap={40} align="flex-start">
        <Item cap="normal · only the active player sees it" wide style={{ alignItems: "flex-start" }}>
          <GhActionBar allowed={["hit", "stand", "double"]} stake={10} balance={1000} />
        </Item>
        <Item cap="locked · request in flight" wide style={{ alignItems: "flex-start" }}>
          <GhActionBar allowed={["hit", "stand", "double"]} stake={10} balance={1000} busy="hit" />
        </Item>
        <Item cap="coach recommends stand" wide style={{ alignItems: "flex-start" }}>
          <GhActionBar allowed={["hit", "stand", "double", "split"]} stake={50} balance={1000} recommended="stand" />
        </Item>
        <Item cap="not enough credits (balance 30, stake 50)" wide style={{ alignItems: "flex-start" }}>
          <GhActionBar allowed={["hit", "stand", "double", "split"]} stake={50} balance={30} />
        </Item>
        <Item cap="mobile compact" wide style={{ alignItems: "flex-start" }}>
          <GhActionBar compact allowed={["hit", "stand", "double"]} stake={50} balance={1000} />
        </Item>
        <Item cap={`interactive + hotkeys · ${last}`} wide style={{ alignItems: "flex-start" }}>
          <GhActionBar
            hotkeys
            allowed={["hit", "stand", "double", "split"]}
            stake={20}
            balance={500}
            busy={busy}
            onAction={(a) => {
              setLast(a);
              setBusy(a);
            }}
          />
        </Item>
      </Row>
    </Board>
  );
}

function ButtonRow({ variant, label }: { variant: GhButtonVariant; label: string }) {
  return (
    <>
      <span className="ghx-cap">{variant}</span>
      <GhButton variant={variant}>{label}</GhButton>
      <GhButton variant={variant} style={{ filter: "brightness(1.08)" }}>{label}</GhButton>
      <GhButton variant={variant} className="is-pressed">{label}</GhButton>
      <GhButton variant={variant} className="is-focus" notch={false}>{label}</GhButton>
      <GhButton variant={variant} disabled>{label}</GhButton>
      <GhButton variant={variant} loading>{label}</GhButton>
    </>
  );
}

function ActionRow({ action, sub }: { action: Action; sub?: string }) {
  const canBreak = action === "double" || action === "split";
  return (
    <>
      <span className="ghx-cap">{action}</span>
      <GhActionButton action={action} sub={sub} />
      <GhActionButton action={action} sub={sub} />
      <GhActionButton action={action} sub={sub} pressed />
      <GhActionButton action={action} sub={sub} focus />
      <GhActionButton action={action} disabled />
      {canBreak ? <GhActionButton action={action} brokeBy={20} /> : <span style={{ fontSize: 13, color: "var(--gh-cream-400)" }}>Never: {action} adds no stake</span>}
    </>
  );
}

function HandsBoard() {
  return (
    <Board eyebrow="UI components" title="Hands and results" intro="GhHand (from HandView or explicit props), GhSplitHands, GhHandTotal and GhResultBadge.">
      <Grid min={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 className="gh-panel-title">Dealer hand</h3>
          <div className="gh-notch" style={{ ...felt, display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: 18 }}>
            <Item cap="hidden · total stays a ?">
              <Row gap={10} align="center"><GhCardRow cards={cards("Ks", "down")} /><GhHandTotal total={null} /></Row>
            </Item>
            <Item cap="revealed · stands on 19">
              <Row gap={10} align="center"><GhCardRow cards={cards("Ks", "9h")} /><GhHandTotal total={19} /></Row>
            </Item>
            <Item cap="dealer busts">
              <Row gap={10} align="center"><GhCardRow cards={cards("Ks", "4d", "Qc")} size="sm" /><GhHandTotal total={24} /></Row>
            </Item>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 className="gh-panel-title">Result badge · per hand</h3>
          <Grid min={220} gap={18}>
            <Item cap="win · 2× stake returned"><GhResultBadge outcome="win" payout={20} /></Item>
            <Item cap="tie · stake returned"><GhResultBadge outcome="push" payout={10} /></Item>
            <Item cap="loss · nothing returned"><GhResultBadge outcome="loss" payout={0} /></Item>
            <Item cap="natural · same 2× as a win"><GhResultBadge outcome="blackjack" payout={20} /></Item>
          </Grid>
        </div>
      </Grid>
      <h3 className="gh-panel-title">Player hand · totals, soft, 21 and bust</h3>
      <div className="gh-notch" style={{ ...felt, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 20 }}>
        <Item cap="hard 16 · stake 10"><GhHand hand={hand(["10c", "6h"], { total: 16 })} /></Item>
        <Item cap="soft 17"><GhHand hand={hand(["Ah", "6s"], { total: 17, soft: true, stake: 25 })} /></Item>
        <Item cap="21 · stands automatically"><GhHand hand={hand(["7d", "4s", "Kh"], { total: 21, status: "twentyone" })} /></Item>
        <Item cap="bust · loses at once"><GhHand hand={hand(["Kc", "6d", "8s"], { total: 24, status: "bust" })} /></Item>
      </div>
      <h3 className="gh-panel-title">Double and split</h3>
      <div className="gh-notch" style={{ ...felt, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 26 }}>
        <Item cap="double · stake 10 → 20, one card sideways">
          <GhHand hand={hand(["5d", "6c", "10s"], { total: 21, status: "doubled", stake: 20 })} />
        </Item>
        <Item cap="split · left first, active hand glows">
          <GhSplitHands
            activeIndex={0}
            hands={[hand(["8s", "3d"], { total: 11, fromSplit: true }), hand(["8h", "Kd"], { total: 18, fromSplit: true, index: 1 })]}
          />
        </Item>
        <Item cap="split aces · one card each">
          <GhSplitHands
            activeIndex={null}
            hands={[
              hand(["As", "9d"], { total: 20, fromSplit: true, splitAces: true, status: "stood" }),
              hand(["Ah", "Kc"], { total: 21, fromSplit: true, splitAces: true, status: "twentyone", index: 1 }),
            ]}
          />
        </Item>
      </div>
      <h3 className="gh-panel-title">On the stage · meta beside the cards, outcomes</h3>
      <div className="gh-notch" style={{ ...felt, display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: "48px 300px", padding: "40px 170px 24px", overflowX: "auto" }}>
        <GhHand meta="right" hand={hand(["10c", "6d", "4s"], { total: 20, stake: 50, outcome: "win", payout: 100, status: "stood" })} />
        <GhHand meta="left" hand={hand(["As", "Kh"], { total: 21, stake: 50, outcome: "blackjack", payout: 100, status: "blackjack" })} />
        <GhHand meta="right" hand={hand(["5s", "6h", "5d"], { total: 16, stake: 40, outcome: "loss", payout: 0, status: "doubled" })} />
        <GhHand meta="right" active hand={hand(["Ac", "6d"], { total: 17, soft: true, stake: 50 })} />
        <GhHand meta="left" waiting hand={hand(["9s", "7d"], { total: 16, stake: 50 })} />
      </div>
    </Board>
  );
}

function FeedbackBoard() {
  const [toast, setToast] = useState(true);
  return (
    <Board eyebrow="UI components" title="Feedback" intro="GhResultBanner (centre moments), GhToast, GhStatusBanner and GhLoading.">
      <Grid min={420} gap={28}>
        <GhResultBanner kind="blackjack" detail="Pays 1 to 1 · your 50 comes back as 100" />
        <GhResultBanner kind="victory" detail="Your 20 beats the dealer's 18" amount={100} />
        <GhResultBanner kind="push" detail="Both on 19 · stake returned" amount={50} />
        <GhResultBanner kind="defeat" detail="Dealer 20 beats your 18" />
        <GhResultBanner kind="bust" detail="24 · the stake is lost" />
        <GhResultBanner kind="kingslayer" detail="Bonus to every player who bet" amount={250} defeats={3} />
      </Grid>
      <Grid min={420} gap={28}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {toast ? (
            <GhToast title="Not enough credits to double." message="Nothing changed." onDismiss={() => setToast(false)} />
          ) : (
            <GhButton size="sm" variant="stone" onClick={() => setToast(true)}>Show toast</GhButton>
          )}
          <GhToast tone="success" title="Deposit added" amount={500} />
          <GhToast tone="info" title={<span><strong style={{ fontSize: 15 }}>Luis</strong> <span style={{ fontFamily: "var(--gh-font-body)", fontWeight: 500, fontSize: 14 }}>joined seat 2</span></span>} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <GhStatusBanner icon="eye" title="Watching" sub="Seat 4 is free" action={<GhSitButton>Sit down</GhSitButton>} />
          <GhStatusBanner icon="refresh" title="Round in progress" sub="Round 12 is still open · stake 20" action={<GhButton size="sm">Resume</GhButton>} />
          <GhStatusBanner lead={<GhTurnTimer variant="badge" size="sm" secondsLeft={9} progress={0.6} />} title="Mariana's turn" sub="Luis plays next, then you" />
          <GhStatusBanner title="Round settled" sub="+150 returned to your wallet" action={<GhNewRoundButton />} />
          <div style={{ maxWidth: 260 }}>
            <GhLoading />
          </div>
        </div>
      </Grid>
    </Board>
  );
}

function HudBoard() {
  const [deadline, setDeadline] = useState<number | null>(null);
  useEffect(() => {
    setDeadline(Date.now() + 20000);
    const id = window.setInterval(() => setDeadline(Date.now() + 20000), 20000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <Board eyebrow="UI components" title="HUD, boss bar and feed" intro="GhBalance, GhBet, GhBossBar (from BossView), GhTurnTimer (from a deadline), GhTablePlate and GhTableFeed.">
      <Row gap={40}>
        <Item cap="normal"><GhBalance value={1240} /></Item>
        <Item cap="credits returned"><GhBalance value={1260} delta={20} /></Item>
        <Item cap="zero"><GhBalance value={0} /></Item>
        <Item cap="hud group · pill + menu"><GhBalance value={1240} onMenu={() => {}} /></Item>
        <Item cap="mobile"><GhBalance value={1240} compact /></Item>
        <Item cap="bet"><GhBet amount={50} /></Item>
      </Row>
      <Scroll>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 520px)", gap: "26px 60px", width: "max-content", paddingLeft: 12 }}>
          <Item cap="full" style={{ alignItems: "flex-start" }}><GhBossBar boss={boss(10)} /></Item>
          <Item cap="damaged · a win deals 1, a blackjack 2" style={{ alignItems: "flex-start" }}><GhBossBar boss={boss(6)} /></Item>
          <Item cap="hit · flash + shake" style={{ alignItems: "flex-start" }}><GhBossBar boss={boss(6, { delta: -1 })} /></Item>
          <Item cap="defeated · bonus, bar refills" style={{ alignItems: "flex-start" }}><GhBossBar boss={boss(0, { delta: -2, defeated: true })} bonus="+250 each" /></Item>
          <Item cap="stage · contracts maxHp 5, hit −2" style={{ alignItems: "flex-start" }}><GhBossBar variant="stage" name="The King · team boss" boss={{ hp: 2, maxHp: 5, delta: -2, defeated: false, defeats: 1 }} /></Item>
          <Item cap="mobile · 300 wide" style={{ alignItems: "flex-start" }}><GhBossBar variant="mobile" boss={boss(6)} /></Item>
        </div>
      </Scroll>
      <Row gap={48} align="center">
        <Item cap="live dial from a deadline"><GhTurnTimer variant="dial" deadline={deadline} durationMs={20000} caption="Bets close in {s}" /></Item>
        <Item cap="tray dial"><GhTurnTimer variant="dial" size="sm" deadline={deadline} durationMs={20000} /></Item>
        <Item cap="badges"><Row gap={14} align="center"><GhTurnTimer variant="badge" deadline={deadline} durationMs={20000} /><GhTurnTimer variant="badge" size="sm" secondsLeft={5} progress={0.25} /></Row></Item>
        <Item cap="portrait ring"><div style={{ padding: 18 }}><GhPortrait avatar="archer" active timer={{ deadline, durationMs: 20000 }} /></div></Item>
      </Row>
      <Grid min={280} gap={20}>
        <Item cap="betting"><GhTablePlate name="Ember Hall" round={12} meta="Min 10 · Max 500 · 3/5 seats" phase="Betting · 12s" /></Item>
        <Item cap="your turn"><GhTablePlate name="Ember Hall" round={12} meta="Min 10 · Max 500 · 3/5 seats" phase="Your turn · 14s" phaseTone="you" /></Item>
        <Item cap="dealer"><GhTablePlate name="Ember Hall" mode="Boss mode" meta="Min 10 · Max 500 · Round 13" phase="Dealer plays" phaseTone="stone" /></Item>
        <Item cap="settled"><GhTablePlate name="Solo table" mode="Solo" meta="Min 10 · Max 500 · Hand 24" phase="Settled" phaseTone="silver" /></Item>
      </Grid>
      <Row gap={40} align="flex-start">
        <Item cap="newest at the bottom · last 5" style={{ alignItems: "flex-start" }}>
          <GhTableFeed
            rows={[
              { who: "Luis", text: "joined seat 2" },
              { who: "Mariana", text: "doubled" },
              { who: "Dealer", text: "busts" },
              { who: "You", text: "won +20" },
              { who: "Boss hit", text: "· 6 / 10", tone: "boss" },
            ]}
          />
        </Item>
        <p className="gh-footnote" style={{ margin: 0 }}>Fictional credits only</p>
      </Row>
    </Board>
  );
}

function SeatsBoard() {
  const timer = { secondsLeft: 14, progress: 0.62 };
  return (
    <Board eyebrow="UI components" title="Seats" intro="GhSeatPlaque (board + stage layouts), GhPortrait and GhMiniPortraitRow.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "28px 16px", padding: "24px 0 8px", background: "radial-gradient(90% 120% at 50% 100%, rgba(26, 99, 64, .35), transparent 70%)" }}>
        <Item cap="empty · between rounds"><GhSeatPlaque empty seatNumber={4} onSit={() => {}} /></Item>
        <Item cap="occupied · betting"><GhSeatPlaque name="Luis" avatar="bard" balance={2760} hearts={[true, true, false]} status="betting" /></Item>
        <Item cap="ready · bet placed"><GhSeatPlaque name="Andrés" avatar="knight" balance={1320} hearts={[true, false, true]} status="ready" /></Item>
        <Item cap="waiting · joined mid-round"><GhSeatPlaque name="David" avatar="ranger" balance={500} status="waiting" tag="Waiting · next round" /></Item>
        <Item cap="active turn · glow + ring"><GhSeatPlaque name="Mariana" avatar="archer" balance={1950} hearts={[true, true, true]} status="turn" timer={timer} /></Item>
        <Item cap="you · active turn"><GhSeatPlaque you name="You" avatar="squire" balance={3890} hearts={[true, false, true]} status="turn" timer={{ secondsLeft: 18, progress: 0.8 }} /></Item>
        <Item cap="you · not your turn"><GhSeatPlaque you name="You" avatar="squire" balance={3890} hearts={[true, false, true]} status="waiting" tag="Waiting for Luis" /></Item>
        <Item cap="finished · with result"><GhSeatPlaque name="Luis" avatar="bard" balance={2780} hearts={[true, true, true]} status="done" result={{ kind: "victory", payout: 20 }} /></Item>
        <Item cap="sitting out"><GhSeatPlaque name="John" avatar="smith" balance={40} hearts={[false, true, false]} status="out" /></Item>
        <Item cap="disconnected"><GhSeatPlaque name="Edgar" avatar="mage" balance={1100} hearts={[true, false, true]} status="off" /></Item>
      </div>
      <h3 className="gh-panel-title">Stage plates (rim)</h3>
      <Row gap={10} align="flex-start">
        <GhSeatPlaque layout="stage" empty seatNumber={5} onSit={() => {}} />
        <GhSeatPlaque layout="stage" name="Andrés" avatar="ranger" balance={3890} hearts={[true, true, false]} status="out" />
        <GhSeatPlaque layout="stage" you name="Nicolas" avatar="knight" balance={1190} hearts={[true, true, false]} status="turn" timer={timer} tag="Your turn" />
        <GhSeatPlaque layout="stage" name="Luis" avatar="bard" balance={1950} hearts={[true, true, true]} status="stood" />
        <GhSeatPlaque layout="stage" name="Mariana" avatar="healer" balance={2735} hearts={[true, false, true]} status="off" tag="Reconnecting" />
      </Row>
      <Grid min={358} gap={32}>
        <Item cap="mini portrait row · mobile" style={{ alignItems: "flex-start" }}>
          <GhMiniPortraitRow
            seats={[
              { name: "Mariana", avatar: "archer", total: 16, status: "turn", progress: 0.62 },
              { name: "Luis", avatar: "bard", total: 20, status: "stood" },
              { name: "Andrés", avatar: "knight", total: 12, status: "next" },
              { name: "David", avatar: "ranger", total: 23, status: "bust" },
            ]}
          />
        </Item>
        <Panel title="Portraits · sizes and states">
          <Row gap={22} align="center">
            <GhPortrait size="sm" avatar="bard" />
            <GhPortrait avatar="bard" />
            <GhPortrait size="lg" avatar="bard" />
            <GhPortrait you avatar="ranger" />
            <GhPortrait off avatar="knight" />
            <GhPortrait offline avatar="smith" />
            <GhPortrait empty />
          </Row>
        </Panel>
      </Grid>
      <Panel title="Avatars" tone="stone">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "30px 16px" }}>
          {GH_AVATAR_IDS.map((a, i) => (
            <div key={a} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <GhPortrait size="lg" avatar={a} alt={a} />
              <span className="gh-seat__name">
                {String(i + 1).padStart(2, "0")} · {a[0]!.toUpperCase() + a.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </Board>
  );
}

function HeraldryBoard() {
  return (
    <Board eyebrow="Primitives" title="Heraldry and icons" intro="GhCrest, GhCrestBanner, GhCoin, GhHearts, GhKingPortrait, GhTag and GhIcon (pixel-paths.json).">
      <Grid min={420}>
        <Panel title="House Flamingo crest" tone="stone">
          <Row gap={28}>
            <Item cap="ring 64 · 256"><GhCrest variant="ring" size={256} /></Item>
            <Item cap="64 · 192"><GhCrest size={192} /></Item>
            <Item cap="48 · 96"><GhCrest size={96} /></Item>
            <Item cap="32"><GhCrest size={32} /></Item>
          </Row>
        </Panel>
        <Panel title="In use">
          <Row gap={22} align="flex-start">
            <Item cap="felt centre">
              <div className="gh-frame gh-frame--felt gh-notch" style={{ width: 200, height: 236, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <GhCrest variant="ring" size={128} />
                <span className="gh-label" style={{ fontSize: 11, color: "var(--gh-gold-400)", textAlign: "center" }}>Blackjack pays 1 to 1</span>
              </div>
            </Item>
            <Item cap="card back"><div style={{ height: 236, display: "grid", placeItems: "center" }}><GhCard size="xl" /></div></Item>
            <Item cap="crest banner"><GhCrestBanner /></Item>
            <Item cap="king portrait"><GhKingPortrait size={96} /></Item>
          </Row>
        </Panel>
      </Grid>
      <Grid min={360}>
        <Panel title="Coin and hearts">
          <Row gap={22}>
            <Item cap="64"><GhCoin size={64} /></Item>
            <Item cap="32"><GhCoin size={32} /></Item>
            <Item cap="20"><GhCoin size={20} /></Item>
            <Item cap="full · empty"><GhHearts results={[true, false]} size={36} /></Item>
            <Item cap="seat"><GhHearts results={[true, true, false]} /></Item>
          </Row>
          <Row gap={8} align="center">
            {(["gold", "you", "soft", "stone", "crimson", "torch", "silver", "ghost"] as const).map((t) => (
              <GhTag key={t} tone={t}>{t}</GhTag>
            ))}
          </Row>
        </Panel>
        <Panel title="Pixel icons · 12 × 12 grid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
            {(Object.keys(GH_ICONS) as GhIconName[]).map((n) => (
              <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 4px 10px", background: "var(--gh-stone-700)", boxShadow: "inset 0 0 0 2px var(--gh-ink)", color: "var(--gh-gold-200)" }}>
                <GhIcon name={n} size={24} />
                <span style={{ fontSize: 12, color: "var(--gh-cream-300)" }}>{n}</span>
              </div>
            ))}
          </div>
        </Panel>
      </Grid>
    </Board>
  );
}

function ScaleBoard() {
  const [scale, setScale] = useState(0.6);
  return (
    <Board eyebrow="Stage" title="Inside a scaled stage" intro="Components are drawn at the 1440 design size; wrap overlays in .ghx-scale and set --gh-scale (the stage width / 1440) to shrink them together.">
      <Row gap={10} align="center">
        {[0.45, 0.6, 0.8, 1].map((s) => (
          <GhButton key={s} size="sm" variant={s === scale ? "gold" : "stone"} onClick={() => setScale(s)}>
            {Math.round(s * 100)}%
          </GhButton>
        ))}
      </Row>
      <div className="gh-notch" style={{ ...felt, overflow: "hidden" }}>
        <div className="ghx-scale" style={{ "--gh-scale": scale } as CSSProperties}>
          <Row gap={60} align="flex-end" style={{ flexWrap: "nowrap", padding: "20px 120px" }}>
            <GhHand meta="right" active hand={hand(["Ac", "6d"], { total: 17, soft: true, stake: 50 })} />
            <GhSeatPlaque layout="stage" you name="Nicolas" avatar="knight" balance={1190} hearts={[true, true, false]} status="turn" timer={{ secondsLeft: 14, progress: 0.62 }} tag="Your turn" />
            <GhActionBar allowed={["hit", "stand", "double"]} stake={50} balance={1190} />
          </Row>
        </div>
      </div>
    </Board>
  );
}

export function Gallery() {
  return (
    <main
      className="gh-root"
      style={{
        minHeight: "100dvh",
        padding: "40px clamp(16px, 4vw, 56px) 64px",
        display: "flex",
        flexDirection: "column",
        gap: 64,
        background: "radial-gradient(120% 40% at 50% 0%, var(--gh-stone-700) 0%, var(--gh-stone-900) 60%, var(--gh-stone-950) 100%)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="gh-eyebrow">Dev gallery · /dev/gh</div>
        <h1 className="gh-display gh-shadow-text" style={{ margin: 0, fontSize: "clamp(36px, 8vw, 56px)", color: "var(--gh-gold-200)" }}>
          Grand Hall components
        </h1>
        <p style={{ margin: 0, color: "var(--gh-cream-300)" }}>Every packages/game-ui/src/gh component and state, side by side like the design boards.</p>
      </header>
      <CardsBoard />
      <ChipsBoard />
      <ChipSelectorBoard />
      <ButtonsBoard />
      <HandsBoard />
      <FeedbackBoard />
      <HudBoard />
      <SeatsBoard />
      <HeraldryBoard />
      <ScaleBoard />
    </main>
  );
}
