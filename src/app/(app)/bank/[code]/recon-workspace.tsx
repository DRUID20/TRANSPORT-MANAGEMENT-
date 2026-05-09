"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Unlink,
} from "lucide-react";
import {
  createBankStatementTx,
  deleteBankStatementTx,
  matchBankTx,
  unmatchBankTx,
} from "@/server/actions/bank";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BankStatementTransaction } from "@/lib/types/bank";
import type { Currency } from "@/lib/types/ledger";

interface GLLineRow {
  id: string;
  journalEntryId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export function ReconWorkspace({
  accountCode,
  accountCurrency,
  statementTxs,
  glLines,
}: {
  accountCode: string;
  accountCurrency: string;
  statementTxs: BankStatementTransaction[];
  glLines: GLLineRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Selection (one from each side)
  const [selStmt, setSelStmt] = useState<string | null>(null);
  const [selGl, setSelGl] = useState<string | null>(null);

  // Add stmt form
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [debit, setDebit] = useState("");
  const [credit, setCredit] = useState("");

  function match() {
    if (!selStmt || !selGl) return;
    setError(null);
    start(async () => {
      const r = await matchBankTx({ bankTxId: selStmt, journalLineId: selGl });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSelStmt(null);
      setSelGl(null);
      router.refresh();
    });
  }

  function unmatch(id: string) {
    setError(null);
    start(async () => {
      await unmatchBankTx(id);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this statement entry?")) return;
    setError(null);
    start(async () => {
      await deleteBankStatementTx(id);
      router.refresh();
    });
  }

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createBankStatementTx({
        accountCode,
        date,
        description,
        reference: reference || undefined,
        debit: Number(debit) || 0,
        credit: Number(credit) || 0,
        currency: accountCurrency as Currency,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setShowAdd(false);
      setDescription("");
      setReference("");
      setDebit("");
      setCredit("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Match action bar */}
      <Card>
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-fg-secondary">
              {selStmt && selGl
                ? "Both sides selected — click Match to reconcile."
                : "Select one statement entry and one GL line, then Match."}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={match}
                disabled={pending || !selStmt || !selGl}
                variant="success"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                Match
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdd((v) => !v)}
              >
                <Plus className="size-4" />
                Add statement entry
              </Button>
            </div>
          </div>

          {showAdd && (
            <form onSubmit={add} className="mt-4 grid gap-3 rounded-md border border-border bg-bg-base/40 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.currentTarget.value)}
                  className="font-mono tnum"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Reference</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.currentTarget.value)}
                  placeholder="Bank ref / cheque #"
                  className="font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input
                  required
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  placeholder="Description as it appears on the statement"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Debit (money in)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={debit}
                  onChange={(e) => {
                    setDebit(e.currentTarget.value);
                    setCredit("");
                  }}
                  className="font-mono tnum"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Credit (money out)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={credit}
                  onChange={(e) => {
                    setCredit(e.currentTarget.value);
                    setDebit("");
                  }}
                  className="font-mono tnum"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Add entry
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Two-column reconciliation */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Bank statement</CardTitle>
            <CardDescription>
              {statementTxs.length} entr{statementTxs.length === 1 ? "y" : "ies"} · click to select
            </CardDescription>
          </CardHeader>
          <CardContent className="!p-0">
            {statementTxs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-fg-tertiary">
                No statement entries yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {statementTxs.map((tx) => {
                  const selected = selStmt === tx.id;
                  const matched = tx.status === "matched";
                  const net = tx.debit - tx.credit;
                  return (
                    <li
                      key={tx.id}
                      className={
                        "px-5 py-2.5 text-sm transition-colors " +
                        (matched
                          ? "bg-status-success/5"
                          : selected
                            ? "bg-brand-blue/10"
                            : "hover:bg-bg-base/40")
                      }
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => !matched && setSelStmt(selected ? null : tx.id)}
                          disabled={matched}
                          className={
                            "size-4 mt-1 shrink-0 rounded border " +
                            (matched
                              ? "border-status-success bg-status-success text-white flex items-center justify-center"
                              : selected
                                ? "border-brand-blue bg-brand-blue text-white flex items-center justify-center"
                                : "border-border")
                          }
                        >
                          {(matched || selected) && <CheckCircle2 className="size-3" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-fg-primary">{tx.description}</span>
                            <span
                              className={
                                "font-mono tnum text-sm " +
                                (net >= 0 ? "text-status-success" : "text-status-danger")
                              }
                            >
                              {net >= 0 ? "+" : ""}
                              {net.toLocaleString()}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] tnum text-fg-tertiary">
                            {tx.date}
                            {tx.reference ? ` · ${tx.reference}` : ""}
                            {matched && " · matched"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {matched ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unmatch(tx.id)}
                              disabled={pending}
                              className="h-6 text-[10px]"
                            >
                              <Unlink className="size-3" />
                              Unmatch
                            </Button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => remove(tx.id)}
                            className="text-fg-tertiary transition-colors hover:text-status-danger"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* GL postings */}
        <Card>
          <CardHeader>
            <CardTitle>GL postings (unmatched)</CardTitle>
            <CardDescription>
              {glLines.length} unmatched line{glLines.length === 1 ? "" : "s"} on this account
            </CardDescription>
          </CardHeader>
          <CardContent className="!p-0">
            {glLines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-fg-tertiary">
                Nothing on this account in the GL needs matching.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {glLines.map((l) => {
                  const selected = selGl === l.id;
                  const net = l.debit - l.credit;
                  return (
                    <li
                      key={l.id}
                      className={
                        "px-5 py-2.5 text-sm transition-colors " +
                        (selected ? "bg-brand-blue/10" : "hover:bg-bg-base/40")
                      }
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setSelGl(selected ? null : l.id)}
                          className={
                            "size-4 mt-1 shrink-0 rounded border " +
                            (selected
                              ? "border-brand-blue bg-brand-blue text-white flex items-center justify-center"
                              : "border-border")
                          }
                        >
                          {selected && <CheckCircle2 className="size-3" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-fg-primary">
                              {l.description || l.accountName}
                            </span>
                            <span
                              className={
                                "font-mono tnum text-sm " +
                                (net >= 0 ? "text-status-success" : "text-status-danger")
                              }
                            >
                              {net >= 0 ? "+" : ""}
                              {net.toLocaleString()}
                            </span>
                          </div>
                          <a
                            href={`/ledger/${l.journalEntryId}`}
                            className="font-mono text-[11px] tnum text-fg-tertiary hover:text-brand-blue"
                          >
                            view journal entry
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
