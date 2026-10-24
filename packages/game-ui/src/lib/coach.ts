import type { Action, RoundView } from "@21jack/contracts";
import { useCallback, useEffect, useState } from "react";

export type CoachTone = "advice" | "reason" | "good" | "bad" | "plain";
export interface CoachLine {
  text: string;
  tone: CoachTone;
}

export const ACTION_LABEL: Record<Action, string> = { hit: "Hit", stand: "Stand", double: "Double", split: "Split" };

function verdict(matched: number, total: number): string {
  if (total === 0) return "No choices to judge this round.";
  if (matched === total) return "A true apprentice.";
  return matched > 0 ? "Learning, slowly." : "Even wizards start somewhere.";
}

/** What Claudalf says for the current table state. */
export function coachLines(round: RoundView | null): CoachLine[] {
  if (!round) return [{ text: "Place your bet, apprentice. I shall advise every decision.", tone: "plain" }];
  const coach = round.coach;
  if (!coach) return [{ text: "I was not summoned for this round. I shall advise from the next one.", tone: "plain" }];

  const lines: CoachLine[] = [];
  const last = coach.history.at(-1);
  if (last) {
    lines.push(
      last.matched
        ? { text: "✓ Wise choice.", tone: "good" }
        : { text: `✗ Hmm… I would have chosen ${ACTION_LABEL[last.recommended]}.`, tone: "bad" },
    );
  }

  if (round.status === "settled") {
    const { matched, total } = coach.score;
    lines.push({ text: `Your wisdom this round: ${matched}/${total}`, tone: "advice" });
    lines.push({ text: verdict(matched, total), tone: "reason" });
  } else {
    if (coach.recommended) lines.push({ text: `I'd ${ACTION_LABEL[coach.recommended]}.`, tone: "advice" });
    lines.push({ text: coach.reason ?? (coach.recommended ? "" : "Steady now… let me think."), tone: "reason" });
  }
  return lines.filter((l) => l.text !== "");
}

const STORAGE_KEY = "21jack.coach";

/** Coach on/off, remembered in localStorage. Starts off until read on the client (SSR-safe). */
export function useCoachPreference(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // storage unavailable (private mode, blocked cookies)
    }
  }, []);
  const set = useCallback((next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // storage unavailable
    }
  }, []);
  return [on, set];
}
