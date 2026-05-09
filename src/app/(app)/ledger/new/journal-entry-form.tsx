"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { postJournal } from "@/server/actions/ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Currency } from "@/lib/types/ledger";

type AccOpt = { id: string; code: string; name: string; currency: string };

interface LineRow {
  accountId: string;
  debit: string;
  credit: string;
  currency: Currency;
  fxRate: string;
  description: string;
}

const EMPTY_ROW: LineRow = {
  accountId: "",
  debit: "",
  credit: "",
  currency: "KES",
  fxRate: "1",
  description: "",
};

export function JournalEntryForm({ accounts }: { accounts: AccOpt[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [referenceType, setReferenceType] = useState<string>("manual");
  const [referenceId, setReferenceId] = useState("");
  const [postedBy, setPostedBy] = useState("Finance");

  const [rows, setRows] = useState<LineRow[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);

  function update(i: number, patch: Partial<LineRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((rs) => [...rs, { ...EMPTY_ROW }]);
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  // Live totals
  const totalDr = rows.reduce(
    (s, r) => s + (Number(r.debit) || 0) * (Number(r.fxRate) || 0),
    0,
  );
  const totalCr = rows.reduce(
    (s, r) => s + (Number(r.credit) || 0) * (Number(r.fxRate) || 0),
    0,
  );
  const balanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await postJournal({
      date,
      memo,
      referenceType: referenceType as never,
      referenceId: referenceId || undefined,
      postedBy,
      lines: rows.map((r) => ({
        accountId: r.accountId,
        debit: Number(r.debit) || 0,
        credit: Number(r.credit) || 0,
        currency: r.currency,
        fxRate: Number(r.fxRate) || 1,
        description: r.description || undefined,
      })),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(`/ledger/${result.id}`);
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
          <Field label="Date">
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Reference type">
            <Select
              value={referenceType}
              onChange={(e) => setReferenceType(e.currentTarget.value)}
            >
              <option value="manual">Manual</option>
              <option value="opening_balance">Opening balance</option>
              <option value="trip">Trip</option>
              <option value="expense">Expense</option>
              <option value="fuel">Fuel</option>
              <option value="mpesa">M-Pesa</option>
              <option value="invoice">Invoice</option>
              <option value="bill">Bill</option>
              <option value="payment">Payment</option>
              <option value="fx_revaluation">FX revaluation</option>
              <option value="depreciation">Depreciation</option>
            </Select>
          </Field>
          <Field label="Memo" className="sm:col-span-2">
            <Input
              required
              value={memo}
              onChange={(e) => setMemo(e.currentTarget.value)}
              placeholder="Description / narrative for this entry"
            />
          </Field>
          <Field label="Reference ID (optional)">
            <Input
              value={referenceId}
              onChange={(e) => setReferenceId(e.currentTarget.value)}
              placeholder="trip:trp-001 / inv-2026-0042 …"
              className="font-mono"
            />
          </Field>
          <Field label="Posted by">
            <Input value={postedBy} onChange={(e) => setPostedBy(e.currentTarget.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lines</CardTitle>
              <CardDescription>
                Total Dr (KES): <span className="font-mono tnum">{totalDr.toLocaleString()}</span>
                {" · "}
                Total Cr (KES): <span className="font-mono tnum">{totalCr.toLocaleString()}</span>
                {" · "}
                {balanced ? (
                  <span className="text-status-success">Balanced ✓</span>
                ) : (
                  <span className="text-status-danger">Out of balance</span>
                )}
              </CardDescription>
            </div>
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
                  <th className="w-12 px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Currency</th>
                  <th className="px-3 py-2 text-right font-medium">FX rate</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-center font-mono text-[10px] text-fg-tertiary">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={r.accountId}
                        onChange={(e) => {
                          const acc = accounts.find((a) => a.id === e.currentTarget.value);
                          update(i, {
                            accountId: e.currentTarget.value,
                            currency: (acc?.currency as Currency) ?? "KES",
                          });
                        }}
                        required
                      >
                        <option value="">— Account —</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={r.description}
                        onChange={(e) => update(i, { description: e.currentTarget.value })}
                        placeholder="Line memo"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={r.currency}
                        onChange={(e) => update(i, { currency: e.currentTarget.value as Currency })}
                      >
                        <option value="KES">KES</option>
                        <option value="USD">USD</option>
                        <option value="UGX">UGX</option>
                        <option value="TZS">TZS</option>
                        <option value="RWF">RWF</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.0001"
                        min={0}
                        value={r.fxRate}
                        onChange={(e) => update(i, { fxRate: e.currentTarget.value })}
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={r.debit}
                        onChange={(e) => update(i, { debit: e.currentTarget.value, credit: "" })}
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={r.credit}
                        onChange={(e) => update(i, { credit: e.currentTarget.value, debit: "" })}
                        className="text-right font-mono tnum"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {rows.length > 2 && (
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !balanced || !memo}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Posting…
            </>
          ) : (
            <>
              <Save className="size-4" />
              Post Journal Entry
            </>
          )}
        </Button>
      </div>
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
