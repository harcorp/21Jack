"use client";

import { newId, type Action, type BossView, type RoundView, type WebActionRequest, type WebStartRoundRequest } from "@21jack/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameApiError, requestJson, requestRound } from "./lib/api";
import { useCoachPreference } from "./lib/coach";
import { TableView } from "./TableView";

export interface GameTableProps {
  initialBalance: number;
  onBalanceChange?: (balance: number) => void;
  /** Web proxy base path. The browser never talks to the game or engine services directly. */
  apiBase?: string;
  /** Name (and optional avatar id or URL) on the player's plate. */
  player?: { name: string; avatar?: string };
}

const messageOf = (err: unknown) =>
  err instanceof GameApiError ? err.message : "Connection lost. Check your network and try again.";

export function GameTable({ initialBalance, onBalanceChange, apiBase = "/api/game", player }: GameTableProps) {
  const [round, setRound] = useState<RoundView | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boss, setBoss] = useState<BossView | null>(null);
  const [coach, setCoach] = useCoachPreference();
  const [freshRoundId, setFreshRoundId] = useState<string | null>(null);
  const [resumedRoundId, setResumedRoundId] = useState<string | null>(null);
  const pending = useRef(false);
  // A settled round's balance reaches the page header only after the dealer reveal ends.
  const heldBalance = useRef<{ roundId: string; balance: number } | null>(null);
  const revealedRound = useRef<string | null>(null);
  const onBalanceRef = useRef(onBalanceChange);
  onBalanceRef.current = onBalanceChange;

  const apply = useCallback((next: RoundView) => {
    setRound(next);
    setBalance(next.balance);
    if (next.status === "settled" && revealedRound.current !== next.roundId) {
      heldBalance.current = { roundId: next.roundId, balance: next.balance };
    } else {
      heldBalance.current = null;
      onBalanceRef.current?.(next.balance);
    }
    if (next.boss) {
      // State carried into the next betting screen: a slain king comes back at full health.
      const b = next.boss;
      setBoss({ ...b, hp: b.defeated ? b.maxHp : b.hp, delta: 0, defeated: false });
    }
  }, []);

  // Keep in sync with external balance changes (e.g. a deposit) while no round is open.
  useEffect(() => {
    if (!pending.current) setBalance((b) => (round === null || round.status === "settled" ? initialBalance : b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBalance]);

  const run = useCallback(
    async (task: () => Promise<RoundView>, onError?: (err: unknown) => Promise<boolean>) => {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      setError(null);
      try {
        apply(await task());
      } catch (err) {
        if (!(onError && (await onError(err)))) setError(messageOf(err));
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [apply],
  );

  const resume = useCallback(
    async (signal?: AbortSignal): Promise<RoundView | null> => {
      try {
        return await requestRound(`${apiBase}/rounds/active`, { method: "GET", signal });
      } catch (err) {
        if (err instanceof GameApiError && err.status === 404) return null;
        throw err;
      }
    },
    [apiBase],
  );

  useEffect(() => {
    const controller = new AbortController();
    pending.current = true;
    resume(controller.signal)
      .then(async (active) => {
        if (active) {
          if (active.status === "player_turn") setResumedRoundId(active.roundId);
          return apply(active);
        }
        const current = await requestJson<BossView>(`${apiBase}/boss`, { method: "GET", signal: controller.signal, retry: false }).catch(
          () => null,
        );
        if (!controller.signal.aborted && current && typeof current.hp === "number") setBoss(current);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(messageOf(err));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        pending.current = false;
        setBusy(false);
      });
    return () => controller.abort();
  }, [resume, apply, apiBase]);

  const onBet = (amount: number) => {
    if (!Number.isInteger(amount) || amount <= 0 || amount > balance) return;
    const body: WebStartRoundRequest = { bet: amount, requestId: newId(), ...(coach ? { coach: true } : {}) };
    setFreshRoundId(body.requestId);
    void run(
      () => requestRound(`${apiBase}/rounds`, { method: "POST", body: JSON.stringify(body) }),
      async (err) => {
        // A round is already open (e.g. another tab): pick it up instead of failing.
        if (!(err instanceof GameApiError && err.code === "CONFLICT")) return false;
        const active = await resume().catch(() => null);
        if (active) apply(active);
        return active !== null;
      },
    );
  };

  const onAction = (action: Action, handIndex: number) => {
    if (!round || round.status !== "player_turn") return;
    const body: WebActionRequest = { action, handIndex, actionId: newId() };
    const id = encodeURIComponent(round.roundId);
    void run(() => requestRound(`${apiBase}/rounds/${id}/actions`, { method: "POST", body: JSON.stringify(body) }));
  };

  const releaseBalance = useCallback(() => {
    const held = heldBalance.current;
    heldBalance.current = null;
    if (held) onBalanceRef.current?.(held.balance);
  }, []);

  const onRevealDone = useCallback(
    (roundId: string) => {
      revealedRound.current = roundId;
      if (heldBalance.current?.roundId === roundId) releaseBalance();
    },
    [releaseBalance],
  );

  useEffect(() => releaseBalance, [releaseBalance]);

  const onNewRound = () => {
    if (pending.current) return;
    releaseBalance();
    setError(null);
    setRound(null);
  };

  return (
    <TableView
      round={round}
      balance={balance}
      busy={busy}
      error={error}
      boss={boss}
      coach={coach}
      onCoachChange={setCoach}
      onBet={onBet}
      onAction={onAction}
      onNewRound={onNewRound}
      freshRoundId={freshRoundId}
      onRevealDone={onRevealDone}
      resumedRoundId={resumedRoundId}
      player={player}
    />
  );
}
