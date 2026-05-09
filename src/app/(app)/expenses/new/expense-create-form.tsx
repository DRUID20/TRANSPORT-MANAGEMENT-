"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { createExpense } from "@/server/actions/expenses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { expenseCategoryLabel, paymentMethodLabel } from "@/lib/types/expenses";

type T = { id: string; number: string; label: string; truckId: string; driverId: string };
type Truck = { id: string; registration: string };
type Driver = { id: string; fullName: string };
type Supplier = { id: string; name: string };

export function ExpenseCreateForm({
  trips,
  trucks,
  drivers,
  suppliers,
  preselectTripId,
  preselectTruckId,
}: {
  trips: T[];
  trucks: Truck[];
  drivers: Driver[];
  suppliers: Supplier[];
  preselectTripId?: string;
  preselectTruckId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState(preselectTripId ?? "");
  const [truckId, setTruckId] = useState(preselectTruckId ?? "");
  const [driverId, setDriverId] = useState("");

  function onTripChange(value: string) {
    setTripId(value);
    const t = trips.find((x) => x.id === value);
    if (t) {
      setTruckId(t.truckId);
      setDriverId(t.driverId);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createExpense({
      amountKes: Number(fd.get("amountKes") ?? 0),
      category: String(fd.get("category") ?? "other") as never,
      description: String(fd.get("description") ?? ""),
      location: String(fd.get("location") ?? "") || undefined,
      countryCode: String(fd.get("countryCode") ?? "KE").toUpperCase(),
      incurredAt: String(fd.get("incurredAt") ?? new Date().toISOString().slice(0, 10)),
      paidBy: String(fd.get("paidBy") ?? "cash") as never,
      tripId: tripId || undefined,
      truckId: truckId || undefined,
      driverId: driverId || undefined,
      supplierId: String(fd.get("supplierId") ?? "") || undefined,
      submittedBy: String(fd.get("submittedBy") ?? "Dispatcher"),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/expenses/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What & how much</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Description" className="sm:col-span-2">
            <Input name="description" required placeholder="Diesel — Mariakani Total" />
          </Field>
          <Field label="Amount (KES)">
            <Input name="amountKes" type="number" required min={0} step="0.01" className="font-mono tnum" />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue="fuel">
              {Object.entries(expenseCategoryLabel).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Paid by">
            <Select name="paidBy" defaultValue="cash">
              {Object.entries(paymentMethodLabel).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date incurred">
            <Input name="incurredAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="font-mono tnum" />
          </Field>
          <Field label="Location (optional)">
            <Input name="location" placeholder="Mariakani" />
          </Field>
          <Field label="Country">
            <Select name="countryCode" defaultValue="KE">
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
              <option value="RW">Rwanda</option>
              <option value="SS">South Sudan</option>
              <option value="CD">DR Congo</option>
              <option value="BI">Burundi</option>
              <option value="ET">Ethiopia</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Trip" className="sm:col-span-2" hint="Picking a trip auto-fills truck + driver">
            <Select value={tripId} onChange={(e) => onTripChange(e.currentTarget.value)}>
              <option value="">— None —</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Truck (optional)">
            <Select value={truckId} onChange={(e) => setTruckId(e.currentTarget.value)}>
              <option value="">— None —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>{t.registration}</option>
              ))}
            </Select>
          </Field>
          <Field label="Driver (optional)">
            <Select value={driverId} onChange={(e) => setDriverId(e.currentTarget.value)}>
              <option value="">— None —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Supplier (optional)" className="sm:col-span-2">
            <Select name="supplierId" defaultValue="">
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Submitted by" className="sm:col-span-2">
            <Input name="submittedBy" defaultValue="Dispatcher" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Submit Expense</>}
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
