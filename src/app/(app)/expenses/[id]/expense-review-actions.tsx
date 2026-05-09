"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send, Smartphone, XCircle } from "lucide-react";
import { markReimbursed, reviewExpense } from "@/server/actions/expenses";
import { sendMpesa } from "@/server/actions/mpesa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExpenseReviewActions({
  expenseId,
  status,
  amountKes,
  driverId,
  driverPhone,
  driverName,
  tripId,
}: {
  expenseId: string;
  status: "pending" | "approved";
  amountKes?: number;
  driverId?: string;
  driverPhone?: string;
  driverName?: string;
  tripId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [showMpesa, setShowMpesa] = useState(false);
  const [phone, setPhone] = useState(driverPhone ?? "");
  const [amount, setAmount] = useState(String(amountKes ?? 0));

  function approve() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const r = await reviewExpense({
        expenseId,
        approve: true,
        reviewedBy: "Manager",
      });
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function reject() {
    setError(null);
    setSuccess(null);
    if (!reason) {
      setShowReject(true);
      return;
    }
    start(async () => {
      const r = await reviewExpense({
        expenseId,
        approve: false,
        reason,
        reviewedBy: "Manager",
      });
      if (!r.ok) setError(r.error);
      setShowReject(false);
      setReason("");
      router.refresh();
    });
  }

  function reimburseManual() {
    setError(null);
    setSuccess(null);
    start(async () => {
      const r = await markReimbursed(expenseId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function sendViaMpesa() {
    setError(null);
    setSuccess(null);
    if (!phone) {
      setError("Phone number required");
      return;
    }
    start(async () => {
      const r = await sendMpesa({
        type: "reimbursement",
        recipient: phone,
        recipientName: driverName,
        amountKes: Number(amount),
        expenseId,
        driverId,
        tripId,
        initiatedBy: "Manager",
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(
        `Sent via M-Pesa (${r.source})${r.receipt ? ` · receipt ${r.receipt}` : ""}`,
      );
      setShowMpesa(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          {status === "pending"
            ? "Approve to release for reimbursement, or reject with reason."
            : "Send via M-Pesa to settle, or mark reimbursed manually."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success">
            {success}
          </div>
        )}

        {status === "pending" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={approve} disabled={pending} variant="success">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Approve
            </Button>
            <Button onClick={reject} disabled={pending} variant="outline">
              <XCircle className="size-4" />
              Reject
            </Button>
          </div>
        )}

        {status === "approved" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowMpesa((v) => !v)}
              disabled={pending}
              variant="primary"
            >
              <Smartphone className="size-4" />
              Send via M-Pesa
            </Button>
            <Button onClick={reimburseManual} disabled={pending} variant="outline">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Mark Reimbursed (manual)
            </Button>
          </div>
        )}

        {showMpesa && status === "approved" && (
          <div className="rounded-md border border-status-success/30 bg-status-success/5 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Recipient phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.currentTarget.value)}
                  placeholder="+254712345678"
                  className="font-mono tnum"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount (KES)</Label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.currentTarget.value)}
                  className="font-mono tnum"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowMpesa(false)}>
                Cancel
              </Button>
              <Button variant="success" size="sm" onClick={sendViaMpesa} disabled={pending}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Smartphone className="size-3.5" />}
                Send
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-fg-tertiary">
              Mock mode unless Daraja credentials are wired in
              <code className="mx-1 rounded bg-bg-base px-1 py-0.5 font-mono">.env.local</code>.
              ~90% mock success rate to exercise rejection paths.
            </p>
          </div>
        )}

        {showReject && status === "pending" && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3">
            <Label className="text-status-danger">Rejection reason</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={reason}
                onChange={(e) => setReason(e.currentTarget.value)}
                placeholder="No receipt / wrong category / amount disputed"
                className="flex-1"
              />
              <Button variant="danger" size="sm" onClick={reject} disabled={pending || !reason}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Reject"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
