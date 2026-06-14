"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

type Ccy = "KES" | "USD" | "UGX";
const CURRENCIES: Ccy[] = ["KES", "USD", "UGX"];

/**
 * Interchangeable KES ⇄ USD ⇄ UGX converter. `rates` is each currency's
 * KES-equivalent (rateToKes); any pair converts via KES:
 *   result = amount × rateToKes[from] / rateToKes[to]
 */
export function FxConverter({ rates }: { rates: Record<string, number> }) {
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState<Ccy>("USD");
  const [to, setTo] = useState<Ccy>("KES");

  const result = useMemo(() => {
    const a = Number(amount);
    const rf = rates[from];
    const rt = rates[to];
    if (!Number.isFinite(a) || !rf || !rt) return null;
    return (a * rf) / rt;
  }, [amount, from, to, rates]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(n);

  return (
    <div className="surface-card p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-fg-tertiary">
        Converter
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-fg-tertiary">Amount</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.currentTarget.value)}
            className="h-10 rounded-md border border-border bg-bg-elevated px-3 font-mono text-sm tnum text-fg-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-fg-tertiary">From</span>
          <select
            value={from}
            onChange={(e) => setFrom(e.currentTarget.value as Ccy)}
            className="h-10 rounded-md border border-border bg-bg-elevated px-3 text-sm font-semibold text-fg-primary"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={swap}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-bg-elevated text-fg-tertiary transition-colors hover:border-border-strong hover:text-brand-blue"
          aria-label="Swap currencies"
          title="Swap"
        >
          <ArrowLeftRight className="size-4" />
        </button>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-fg-tertiary">To</span>
          <select
            value={to}
            onChange={(e) => setTo(e.currentTarget.value as Ccy)}
            className="h-10 rounded-md border border-border bg-bg-elevated px-3 text-sm font-semibold text-fg-primary"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-bg-base/40 px-4 py-3">
        <div className="text-[11px] uppercase tracking-wider text-fg-tertiary">Result</div>
        <div className="mt-0.5 font-mono text-2xl font-semibold tnum text-fg-primary">
          {result === null ? "—" : `${fmt(result)} ${to}`}
        </div>
        {result !== null && Number(amount) > 0 && (
          <div className="mt-1 font-mono text-[11px] text-fg-tertiary">
            1 {from} = {fmt((rates[from] ?? 0) / (rates[to] ?? 1))} {to}
          </div>
        )}
      </div>
    </div>
  );
}
