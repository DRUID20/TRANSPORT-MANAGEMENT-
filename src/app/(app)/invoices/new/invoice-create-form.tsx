"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createInvoice } from "@/server/actions/ar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Currency } from "@/lib/types/ledger";

type Cus = { id: string; name: string; billingCurrency: "KES" | "USD"; paymentTermsDays: number };
type T = {
  id: string;
  number: string;
  label: string;
  revenueAmount: number;
  revenueCurrency: string;
  cargoQuantity: number;
  cargoUnit: string;
  cargoType: string;
};

interface LineRow {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const EMPTY_LINE: LineRow = {
  description: "",
  quantity: "1",
  unit: "trip",
  unitPrice: "",
};

export function InvoiceCreateForm({
  customers,
  trips,
  preselectCustomerId,
  preselectTrip,
}: {
  customers: Cus[];
  trips: T[];
  preselectCustomerId?: string;
  preselectTrip?: {
    id: string;
    number: string;
    customerId?: string;
    currency: string;
    cargoQty: number;
    cargoUnit: string;
    cargoType: string;
    revenueAmount: number;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState(preselectCustomerId ?? "");
  const [tripId, setTripId] = useState(preselectTrip?.id ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const [issueDate, setIssueDate] = useState(today);
  const customer = customers.find((c) => c.id === customerId);
  const defaultDue = customer
    ? new Date(Date.now() + customer.paymentTermsDays * 86400_000)
        .toISOString()
        .slice(0, 10)
    : new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [currency, setCurrency] = useState<Currency>(
    (preselectTrip?.currency as Currency) ?? "USD",
  );
  const [fxRate, setFxRate] = useState(currency === "KES" ? "1" : "129.30");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");

  const initialLines: LineRow[] = preselectTrip
    ? [
        {
          description: `Freight ${preselectTrip.number} · ${preselectTrip.cargoType}`,
          quantity: String(preselectTrip.cargoQty),
          unit: preselectTrip.cargoUnit,
          unitPrice: String(
            preselectTrip.cargoQty > 0
              ? Math.round((preselectTrip.revenueAmount / preselectTrip.cargoQty) * 100) / 100
              : preselectTrip.revenueAmount,
          ),
        },
      ]
    : [{ ...EMPTY_LINE }];

  const [lines, setLines] = useState<LineRow[]>(initialLines);

  const subtotal = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const taxAmount = subtotal * (Number(taxRate) || 0);
  const total = subtotal + taxAmount;

  function update(i: number, patch: Partial<LineRow>) {
    setLines((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setLines((rs) => [...rs, { ...EMPTY_LINE }]);
  }
  function remove(i: number) {
    setLines((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createInvoice({
      customerId,
      tripId: tripId || undefined,
      issueDate,
      dueDate,
      currency,
      fxRate: Number(fxRate) || 1,
      taxRate: Number(taxRate) || 0,
      notes: notes || undefined,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity) || 0,
        unit: l.unit || undefined,
        unitPrice: Number(l.unitPrice) || 0,
      })),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/invoices/${result.id}`);
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
          <CardTitle>Header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" className="sm:col-span-2">
            <Select
              value={customerId}
              onChange={(e) => {
                const id = e.currentTarget.value;
                setCustomerId(id);
                const c = customers.find((x) => x.id === id);
                if (c) {
                  setCurrency(c.billingCurrency);
                  setFxRate(c.billingCurrency === "KES" ? "1" : "129.30");
                  setDueDate(
                    new Date(Date.now() + c.paymentTermsDays * 86400_000)
                      .toISOString()
                      .slice(0, 10),
                  );
                }
              }}
              required
            >
              <option value="">— Select customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.billingCurrency})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Linked trip (optional)" className="sm:col-span-2">
            <Select value={tripId} onChange={(e) => setTripId(e.currentTarget.value)}>
              <option value="">— None —</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Issue date">
            <Input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Currency">
            <Select
              value={currency}
              onChange={(e) => {
                setCurrency(e.currentTarget.value as Currency);
                if (e.currentTarget.value === "KES") setFxRate("1");
              }}
            >
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="UGX">UGX</option>
              <option value="TZS">TZS</option>
              <option value="RWF">RWF</option>
            </Select>
          </Field>
          <Field label="FX rate to KES">
            <Input
              type="number"
              step="0.0001"
              required
              value={fxRate}
              onChange={(e) => setFxRate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="VAT rate" hint="0 for exports; 0.16 for domestic Kenya">
            <Input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={taxRate}
              onChange={(e) => setTaxRate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={add}>
              <Plus className="size-3.5" /> Add line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 text-right font-medium">Unit price</th>
                  <th className="px-3 py-2 text-right font-medium">Line total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l, i) => {
                  const total = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <Input
                          value={l.description}
                          onChange={(e) => update(i, { description: e.currentTarget.value })}
                          placeholder="Freight TRP-2026-0001 · Coffee beans"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={l.quantity}
                          onChange={(e) => update(i, { quantity: e.currentTarget.value })}
                          className="text-right font-mono tnum"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={l.unit}
                          onChange={(e) => update(i, { unit: e.currentTarget.value })}
                          placeholder="tonnes"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={l.unitPrice}
                          onChange={(e) => update(i, { unitPrice: e.currentTarget.value })}
                          className="text-right font-mono tnum"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">
                        {total.toLocaleString()} {currency}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(i)}
                            className="text-fg-tertiary transition-colors hover:text-status-danger"
                            aria-label="Remove line"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border p-4">
            <div className="ml-auto flex max-w-xs flex-col gap-1 text-sm">
              <div className="flex justify-between text-fg-secondary">
                <span>Subtotal</span>
                <span className="font-mono tnum">{subtotal.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-fg-secondary">
                <span>VAT ({((Number(taxRate) || 0) * 100).toFixed(0)}%)</span>
                <span className="font-mono tnum">{taxAmount.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-fg-primary">
                <span>Total</span>
                <span className="font-mono tnum">{total.toLocaleString()} {currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={2}
            placeholder="Optional notes for the customer (terms, references, etc.)"
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !customerId}>
          {loading ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save className="size-4" />Save Draft</>}
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
