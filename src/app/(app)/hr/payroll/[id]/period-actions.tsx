"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Download, Loader2, Lock, PlayCircle } from "lucide-react";
import { setPayrollPeriodStatus } from "@/server/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PayrollPeriodStatus } from "@/lib/types/payroll";

export function PeriodActions({
  periodId,
  status,
}: {
  periodId: string;
  status: PayrollPeriodStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(next: PayrollPeriodStatus) {
    if (next === "paid" && !confirm("Mark this period PAID? Loan balances will be auto-reduced and the period locked.")) {
      return;
    }
    setError(null);
    start(async () => {
      const r = await setPayrollPeriodStatus(periodId, next);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function exportCsv() {
    window.open(`/api/payroll/${periodId}/export`, "_blank");
  }

  return (
    <Card>
      <CardContent className="!p-4">
        {error && (
          <div className="mb-3 rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" && (
            <Button variant="primary" onClick={() => set("processing")} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Open for processing
            </Button>
          )}
          {status === "processing" && (
            <Button variant="success" onClick={() => set("paid")} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Mark Paid
            </Button>
          )}
          {status === "paid" && (
            <Button variant="outline" onClick={() => set("closed")} disabled={pending}>
              <Lock className="size-4" />
              Close period
            </Button>
          )}
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
