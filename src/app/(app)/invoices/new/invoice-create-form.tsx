"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createInvoice } from "@/server/actions/ar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/ui/form-section";
import { FormFooter } from "@/components/ui/form-footer";
import type { Currency } from "@/lib/types/ledger";

type Cus = {
  id: string;
  name: string;
  billingCurrency: "KES" | "USD" | "UGX";
  paymentTermsDays: number;
};
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

const FALLBACK_TO_KES: Record<Currency, number> = { KES: 1, USD: 129.41, UGX: 0.0347 };

export function InvoiceCreateForm({
  customers,
  trips,
  preselectCustomerId,
  preselectTrip,
  ratesToKes,
}: {
  customers: Cus[];
  trips: T[];
  preselectCustomerId?: string;
  ratesToKes?: Partial<Record<Currency, number>>;
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
  const rateFor = (c: Currency) =>
    c === "KES" ? "1" : String(ratesToKes?.[c] ?? FALLBACK_TO_KES[c]);
  const [currency, setCurrency] = useState<Currency>(
    (preselectTrip?.currency as Currency) ?? "USD",
  );
  const [fxRate, setFxRate] = useState(rateFor(currency));
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
              ? preselectTrip.cargoUnit === "litres"
                ? Math.round(
                    (preselectTrip.revenueAmount / preselectTrip.cargoQty) *
                      10_000,
                  ) / 10_000
                : Math.round(
                    (preselectTrip.revenueAmount / preselectTrip.cargoQty) *
                      100,
                  ) / 100
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5 pb-20">
      {error && (
        <div className="surface-card animate-content-in border-status-danger/30 bg-status-danger/5 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <FormSection
        eyebrow="Step 1"
        title="Header"
        description="Customer drives currency and payment terms; FX rate fixes the KES equivalent on the journal entry posted when this invoice is sent."
        columns={2}
      >
        <FormField label="Customer" required className="sm:col-span-2">
          <Select
            value={customerId}
            onChange={(e) => {
              const id = e.currentTarget.value;
              setCustomerId(id);
              const c = customers.find((x) => x.id === id);
              if (c) {
                setCurrency(c.billingCurrency);
                setFxRate(rateFor(c.billingCurrency));
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
        </FormField>
        <FormField
          label="Linked trip"
          hint="OPTIONAL"
          helper="Tying to a trip flows the invoice into per-trip profitability."
          className="sm:col-span-2"
        >
          <Select value={tripId} onChange={(e) => setTripId(e.currentTarget.value)}>
            <option value="">— None —</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Issue date" required>
          <Input
            type="date"
            required
            value={issueDate}
            onChange={(e) => setIssueDate(e.currentTarget.value)}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Due date" required>
          <Input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.currentTarget.value)}
            className="font-mono tnum"
          />
        </FormField>
        <FormField label="Currency" required>
          <Select
            value={currency}
            onChange={(e) => {
              const v = e.currentTarget.value as Currency;
              setCurrency(v);
              setFxRate(rateFor(v));
            }}
          >
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="UGX">UGX</option>
          </Select>
        </FormField>
        <FormField label="FX rate" required hint="TO KES">
          <Input
            type="number"
            step="0.0001"
            required
            value={fxRate}
            onChange={(e) => setFxRate(e.currentTarget.value)}
            className="font-mono tnum"
          />
          <span className="text-[11px] text-fg-tertiary">
            Auto-filled from the latest live rate — editable for a contracted rate.
          </span>
        </FormField>
        <FormField
          label="VAT rate"
          hint="0 = EXEMPT"
          helper="0 for exports; 0.16 for domestic Kenya."
        >
          <Input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={taxRate}
            onChange={(e) => setTaxRate(e.currentTarget.value)}
            className="font-mono tnum"
          />
        </FormField>
      </FormSection>

      <section className="surface-card animate-content-in overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <div className="section-eyebrow mb-1.5">Step 2</div>
            <h2 className="text-base font-semibold tracking-tight text-fg-primary">
              Line items
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-secondary">
              Each line bills as quantity × unit price. Use multiple lines for
              freight + waiting + tolls, etc.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="size-3.5" />
            Add line
          </Button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-surface/60 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Description</th>
                <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-3 py-2.5 font-semibold">Unit</th>
                <th className="px-3 py-2.5 text-right font-semibold">Unit price</th>
                <th className="px-3 py-2.5 text-right font-semibold">Line total</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l, i) => {
                const lineTotal =
                  (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
                return (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <Input
                        value={l.description}
                        onChange={(e) =>
                          update(i, { description: e.currentTarget.value })
                        }
                        placeholder="Freight TRP-2026-0001 · AGO (diesel)"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={l.quantity}
                        onChange={(e) =>
                          update(i, { quantity: e.currentTarget.value })
                        }
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={l.unit}
                        onChange={(e) =>
                          update(i, { unit: e.currentTarget.value })
                        }
                        placeholder="litres"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.0001"
                        min={0}
                        value={l.unitPrice}
                        onChange={(e) =>
                          update(i, { unitPrice: e.currentTarget.value })
                        }
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {lineTotal.toLocaleString()} {currency}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="rounded p-1 text-fg-tertiary transition-colors hover:bg-status-danger/10 hover:text-status-danger"
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
        <div className="border-t border-border bg-bg-surface/40 p-4">
          <div className="ml-auto flex max-w-xs flex-col gap-1 text-sm">
            <div className="flex justify-between text-fg-secondary">
              <span>Subtotal</span>
              <span className="font-mono tnum">
                {subtotal.toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex justify-between text-fg-secondary">
              <span>VAT ({((Number(taxRate) || 0) * 100).toFixed(0)}%)</span>
              <span className="font-mono tnum">
                {taxAmount.toLocaleString()} {currency}
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-semibold text-fg-primary">
              <span>Total</span>
              <span className="font-mono tnum">
                {total.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>
      </section>

      <FormSection
        eyebrow="Optional"
        title="Notes"
        description="Customer-visible notes printed on the invoice — payment instructions, references, terms."
        columns={1}
      >
        <FormField label="Notes" hint="OPTIONAL">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={2}
            placeholder="e.g. Pay to KCB Branch 010 · Ref. invoice number"
          />
        </FormField>
      </FormSection>

      <FormFooter
        meta={
          <span>
            Saved as draft. Send the invoice from its detail page to post AR +
            Revenue to the ledger.
          </span>
        }
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !customerId}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save draft
            </>
          )}
        </Button>
      </FormFooter>
    </form>
  );
}
