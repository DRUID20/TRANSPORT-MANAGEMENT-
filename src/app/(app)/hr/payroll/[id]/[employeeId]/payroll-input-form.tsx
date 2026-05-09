"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { updatePayrollInput } from "@/server/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PayrollInputForm({
  periodId,
  employeeId,
  currency,
  initial,
  computed,
  locked,
}: {
  periodId: string;
  employeeId: string;
  currency: string;
  initial: {
    basicSalary: number;
    overtimeHours: number;
    overtimeRate: number;
    bonus: number;
    otherDeductions: number;
    loanRecovery: number;
    notes: string;
  };
  computed: {
    grossPay: number;
    paye: number;
    nssfEmployee: number;
    shaEmployee: number;
    ahlEmployee: number;
    totalDeductions: number;
    netPay: number;
    employerCost: number;
  };
  locked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [s, setS] = useState(initial);

  function update<K extends keyof typeof s>(k: K, v: string) {
    setS((prev) => ({
      ...prev,
      [k]: typeof prev[k] === "number" ? Number(v) || 0 : v,
    }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await updatePayrollInput({
      periodId,
      employeeId,
      basicSalary: s.basicSalary,
      overtimeHours: s.overtimeHours,
      overtimeRate: s.overtimeRate,
      bonus: s.bonus,
      otherDeductions: s.otherDeductions,
      loanRecovery: s.loanRecovery,
      notes: s.notes || undefined,
    });
    if (!r.ok) {
      setError(r.error);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      {locked && (
        <div className="rounded-md border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
          Period is paid / closed — payroll line is read-only.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Inputs ({currency})</CardTitle>
          <CardDescription>
            Adjust per-period values. Statutory deductions recalculate on save.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Basic salary">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.basicSalary}
              onChange={(e) => update("basicSalary", e.currentTarget.value)}
              disabled={locked}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Overtime hours">
            <Input
              type="number"
              step="0.5"
              min={0}
              value={s.overtimeHours}
              onChange={(e) => update("overtimeHours", e.currentTarget.value)}
              disabled={locked}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Overtime rate">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.overtimeRate}
              onChange={(e) => update("overtimeRate", e.currentTarget.value)}
              disabled={locked}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Bonus">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.bonus}
              onChange={(e) => update("bonus", e.currentTarget.value)}
              disabled={locked}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Loan recovery">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.loanRecovery}
              onChange={(e) => update("loanRecovery", e.currentTarget.value)}
              disabled={locked}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Other deductions">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.otherDeductions}
              onChange={(e) => update("otherDeductions", e.currentTarget.value)}
              disabled={locked}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
            <Textarea
              value={s.notes}
              onChange={(e) => update("notes", e.currentTarget.value)}
              disabled={locked}
              rows={2}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Computed</CardTitle>
          <CardDescription>
            Indicative Kenyan PAYE / NSSF / SHA / AHL — refresh after save.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <Stat label="Gross" value={computed.grossPay} tone="info" />
          <Stat label="PAYE" value={computed.paye} tone="warning" />
          <Stat label="NSSF" value={computed.nssfEmployee} />
          <Stat label="SHA" value={computed.shaEmployee} />
          <Stat label="AHL" value={computed.ahlEmployee} />
          <Stat label="Deductions" value={computed.totalDeductions} tone="warning" />
          <Stat label="Net pay" value={computed.netPay} tone="success" />
          <Stat label="Employer cost" value={computed.employerCost} />
        </CardContent>
      </Card>

      {!locked && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save & Recompute</>}
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "warning";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-md border border-border bg-bg-base/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-0.5 font-mono tnum text-base font-semibold ${colour}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
