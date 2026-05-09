"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createPayrollPeriod } from "@/server/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewPeriodForm({ defaultYearMonth }: { defaultYearMonth: string }) {
  const router = useRouter();
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await createPayrollPeriod({ yearMonth, notes: notes || undefined });
    if (!r.ok) {
      setError(r.error);
      setLoading(false);
      return;
    }
    router.push(`/hr/payroll/${r.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Period</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Year-Month (YYYY-MM)</Label>
            <Input
              required
              value={yearMonth}
              onChange={(e) => setYearMonth(e.currentTarget.value)}
              placeholder="2026-06"
              className="font-mono tnum"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={2} />
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Creating…</> : <><Save className="size-4" />Create Period</>}
        </Button>
      </div>
    </form>
  );
}
