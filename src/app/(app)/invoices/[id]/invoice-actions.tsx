"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send, Wallet, XCircle } from "lucide-react";
import { cancelInvoice, recordPayment, sendInvoice } from "@/server/actions/ar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { InvoiceStatus } from "@/lib/types/ar";
import type { Currency } from "@/lib/types/ledger";

export function InvoiceActions({
  invoiceId,
  status,
  balance,
  currency,
  fxRate,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  balance: number;
  currency: Currency;
  fxRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [amount, setAmount] = useState(String(balance));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"bank" | "mpesa" | "cash" | "cheque">("bank");
  const [reference, setReference] = useState("");

  function send() {
    setError(null);
    start(async () => {
      const r = await sendInvoice(invoiceId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function cancel() {
    if (!confirm("Cancel this invoice? If posted, the GL entry will be reversed.")) return;
    setError(null);
    start(async () => {
      const r = await cancelInvoice(invoiceId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function pay() {
    setError(null);
    if (!amount) {
      setError("Amount required");
      return;
    }
    start(async () => {
      const r = await recordPayment({
        invoiceId,
        date,
        amount: Number(amount),
        currency,
        fxRate,
        paymentMethod: method,
        reference: reference || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setShowPay(false);
      setReference("");
      router.refresh();
    });
  }

  if (status === "cancelled") {
    return (
      <Card>
        <CardContent className="!p-4 text-sm text-fg-tertiary">
          Invoice cancelled — no further actions.
        </CardContent>
      </Card>
    );
  }

  if (status === "paid") {
    return (
      <Card className="border-status-success/30 bg-status-success/5">
        <CardContent className="!p-4 flex items-center gap-2 text-sm text-status-success">
          <CheckCircle2 className="size-4" /> Fully paid. Nothing else to do.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          {status === "draft"
            ? "Send the invoice to post it to the GL (Dr AR / Cr Revenue)."
            : "Record a customer payment. Posts Dr Bank / Cr AR automatically."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" && (
            <>
              <Button onClick={send} disabled={pending} variant="primary">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send & Post
              </Button>
              <Button onClick={cancel} disabled={pending} variant="outline">
                <XCircle className="size-4" />
                Cancel
              </Button>
            </>
          )}
          {(status === "sent" || status === "partially_paid" || status === "overdue") && (
            <>
              <Button
                onClick={() => setShowPay((v) => !v)}
                disabled={pending}
                variant="success"
              >
                <Wallet className="size-4" />
                Record Payment
              </Button>
              <Button onClick={cancel} disabled={pending} variant="outline">
                <XCircle className="size-4" />
                Cancel Invoice
              </Button>
            </>
          )}
        </div>

        {showPay && (
          <div className="rounded-md border border-status-success/30 bg-status-success/5 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.currentTarget.value)}
                  className="font-mono tnum"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.currentTarget.value)}
                  className="font-mono tnum"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Method</Label>
                <Select
                  value={method}
                  onChange={(e) => setMethod(e.currentTarget.value as never)}
                >
                  <option value="bank">Bank transfer</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Reference</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.currentTarget.value)}
                  placeholder="Bank ref / M-Pesa code / Cheque #"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPay(false)}>
                Cancel
              </Button>
              <Button variant="success" size="sm" onClick={pay} disabled={pending}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Record
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
