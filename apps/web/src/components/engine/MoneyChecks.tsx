"use client";

import { useEffect, useState } from "react";
import { MoneyCheckReport, type MoneyCheckStep } from "@21jack/contracts";
import { Alert, Badge, Button, Panel, PixelIcon, Table, Td, Th, Tr, formatCredits } from "@/components/ui";
import { errorMessage } from "@/lib/api-client";
import { fetchParsed } from "./fetch";
import { useReducedMotion } from "./useReducedMotion";

const STAGGER_MS = 120;

export function MoneyChecks({ onDone }: { onDone: () => Promise<void> }) {
  const [report, setReport] = useState<MoneyCheckReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const reduced = useReducedMotion();

  const total = report?.steps.length ?? 0;
  const visible = reduced ? total : shown;

  useEffect(() => {
    if (reduced || shown >= total) return;
    const t = setTimeout(() => setShown((s) => s + 1), STAGGER_MS);
    return () => clearTimeout(t);
  }, [reduced, shown, total]);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const next = await fetchParsed("/api/engine/checks", MoneyCheckReport, { method: "POST" });
      setShown(0);
      setReport(next);
      void onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRunning(false);
    }
  };

  const allPassed = report !== null && report.passed === report.total;

  return (
    <Panel title="Money checks" framed tone="wood">
      <p className="-mt-2 mb-4 text-base text-cream-muted">
        Runs live requests against the engine with a fresh audit account: deposits, bets, split and double stakes, payouts, overdrafts and replayed keys.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => void run()} busy={running}>
          {running ? "Running checks…" : "Run money checks"}
        </Button>
        {report ? (
          <div className="flex flex-wrap items-center gap-2" role="status">
            <Badge tone={allPassed ? "gold" : "carpet"}>
              {report.passed}/{report.total} passed
            </Badge>
            <span className="text-xs text-cream-muted">
              Audit account <span className="font-semibold text-gold-light">{report.username}</span>
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert tone="error" title="Checks could not run" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {report && report.steps.length > 0 ? (
        <div className="mt-4">
          <Table caption="Money check steps">
            <thead>
              <Tr>
                <Th>
                  <span className="sr-only">Result</span>
                </Th>
                <Th>Step</Th>
                <Th>Expected / actual</Th>
                <Th>Status</Th>
                <Th className="text-right">Balance</Th>
              </Tr>
            </thead>
            <tbody>
              {report.steps.slice(0, visible).map((step, i) => (
                <StepRow key={`${i}-${step.name}`} step={step} />
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}
    </Panel>
  );
}

function StepRow({ step }: { step: MoneyCheckStep }) {
  const rejected = step.pass && (step.status === 402 || step.status === 400);
  const statusTone = rejected ? "torch" : step.status >= 200 && step.status < 300 ? "felt" : step.pass ? "stone" : "carpet";
  return (
    <Tr className="transition-[opacity,translate] duration-300 motion-safe:starting:translate-y-1 starting:opacity-0">
      <Td className={step.pass ? "text-gold-light" : "text-danger"}>
        <PixelIcon name={step.pass ? "check" : "close"} size={16} />
        <span className="sr-only">{step.pass ? "Passed" : "Failed"}</span>
      </Td>
      <Td className="min-w-48">
        <p className="font-semibold">{step.name}</p>
        <p className="font-mono text-xs break-words text-cream-dim">{step.request}</p>
      </Td>
      <Td className="min-w-48 text-sm">
        <p>
          <span className="gh-label text-[11px] text-cream-dim">Expected </span>
          {step.expected}
        </p>
        <p className={step.pass ? undefined : "font-bold text-danger"}>
          <span className="gh-label text-[11px] text-cream-dim">Actual </span>
          {step.actual}
        </p>
      </Td>
      <Td className="whitespace-nowrap">
        <Badge tone={statusTone}>{step.status}</Badge>
        {rejected ? <Badge tone="torch" className="ml-1">rejected as expected</Badge> : null}
      </Td>
      <Td className="gh-num text-right text-[10px]">{step.balance === null ? "—" : formatCredits(step.balance)}</Td>
    </Tr>
  );
}
