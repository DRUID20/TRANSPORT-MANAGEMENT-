"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { reviewExpense } from "@/server/actions/expenses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExpenseReviewActions({
  expenseId,
  status,
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
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    setError(null);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          {status === "pending"
            ? "Approve to accept the spend, or reject with a reason. The cashier issues cash on request — there's no separate reimbursement step."
            : "Approved. The cashier disburses funds on request; nothing further to record here."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
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
