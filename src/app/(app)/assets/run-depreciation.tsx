"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { runAssetDepreciation } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Post one month of depreciation across all eligible assets. Idempotent —
 * re-running the same month skips assets already charged for it.
 */
export function RunDepreciation() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setMsg(null);
    setError(null);
    start(async () => {
      const r = await runAssetDepreciation({ period });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const bits = [`Posted ${r.count} charge${r.count === 1 ? "" : "s"} (KSh ${r.totalKes.toLocaleString()})`];
      if (r.skipped) bits.push(`${r.skipped} skipped`);
      if (r.errors.length) bits.push(`${r.errors.length} error${r.errors.length === 1 ? "" : "s"}`);
      setMsg(bits.join(" · "));
      if (r.errors.length) setError(r.errors.join(" "));
      router.refresh();
    });
  }

  return (
    <div className="surface-card flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
          Depreciation period
        </label>
        <Input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.currentTarget.value)}
          className="font-mono tnum"
        />
      </div>
      <Button type="button" onClick={run} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
        Run monthly depreciation
      </Button>
      {msg && <span className="text-[13px] font-semibold text-status-success">{msg}</span>}
      {error && <span className="text-[12px] font-medium text-status-danger">{error}</span>}
    </div>
  );
}
