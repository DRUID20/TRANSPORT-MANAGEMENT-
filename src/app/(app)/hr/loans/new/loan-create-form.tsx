"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createLoan } from "@/server/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Currency } from "@/lib/types/ledger";

type Emp = { id: string; name: string };

export function LoanCreateForm({
  employees,
  preselectEmployeeId,
}: {
  employees: Emp[];
  preselectEmployeeId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState(preselectEmployeeId ?? "");
  const [principal, setPrincipal] = useState("");
  const [currency, setCurrency] = useState<Currency>("KES");
  const [disbursedDate, setDisbursedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [termMonths, setTermMonths] = useState("12");
  const [monthlyRecovery, setMonthlyRecovery] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-suggest monthly recovery when principal/term change
  const suggestedMonthly =
    Number(principal) > 0 && Number(termMonths) > 0
      ? Math.ceil(Number(principal) / Number(termMonths))
      : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await createLoan({
      employeeId,
      principal: Number(principal),
      currency,
      disbursedDate,
      termMonths: Number(termMonths),
      monthlyRecovery: Number(monthlyRecovery) || suggestedMonthly,
      interestRate: Number(interestRate),
      reason: reason || undefined,
      notes: notes || undefined,
    });
    if (!r.ok) {
      setError(r.error);
      setLoading(false);
      return;
    }
    router.push(`/hr/loans/${r.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle>Loan</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee" className="sm:col-span-2">
            <Select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.currentTarget.value)}
            >
              <option value="">— Select —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Principal">
            <Input
              type="number"
              step="0.01"
              min={0}
              required
              value={principal}
              onChange={(e) => setPrincipal(e.currentTarget.value)}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Currency">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.currentTarget.value as Currency)}
            >
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Disbursed date">
            <Input
              type="date"
              required
              value={disbursedDate}
              onChange={(e) => setDisbursedDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Term (months)">
            <Input
              type="number"
              min={1}
              required
              value={termMonths}
              onChange={(e) => setTermMonths(e.currentTarget.value)}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field
            label="Monthly recovery"
            hint={suggestedMonthly > 0 ? `Suggested: ${suggestedMonthly.toLocaleString()}` : undefined}
          >
            <Input
              type="number"
              step="0.01"
              min={0}
              value={monthlyRecovery}
              onChange={(e) => setMonthlyRecovery(e.currentTarget.value)}
              placeholder={String(suggestedMonthly || "")}
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Interest rate p.a. (decimal)">
            <Input
              type="number"
              step="0.001"
              min={0}
              value={interestRate}
              onChange={(e) => setInterestRate(e.currentTarget.value)}
              placeholder="0.00"
              className="text-right font-mono tnum"
            />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              placeholder="School fees / vehicle deposit / salary advance…"
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={2} />
          </Field>
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !employeeId || !principal}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Disburse Loan</>}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col gap-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-fg-tertiary">{hint}</span>}
    </div>
  );
}
