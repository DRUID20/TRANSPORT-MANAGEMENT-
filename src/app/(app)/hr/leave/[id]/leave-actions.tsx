"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  rejectLeaveRequest,
} from "@/server/actions/leave";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { LeaveStatus } from "@/lib/types/leave";

export function LeaveActions({
  id,
  status,
}: {
  id: string;
  status: LeaveStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    setError(null);
    start(async () => {
      const r = await approveLeaveRequest(id);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }
  function reject() {
    setError(null);
    if (!reason.trim()) {
      setError("Rejection reason required");
      return;
    }
    start(async () => {
      const r = await rejectLeaveRequest(id, reason);
      if (!r.ok) setError(r.error);
      else {
        setShowReject(false);
        setReason("");
        router.refresh();
      }
    });
  }
  function cancel() {
    if (!confirm("Cancel this leave request?")) return;
    setError(null);
    start(async () => {
      const r = await cancelLeaveRequest(id);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  if (status !== "pending" && status !== "approved") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          {status === "pending"
            ? "Approve or reject this request."
            : "Approved — can be cancelled before the leave starts."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {status === "pending" && (
            <>
              <Button onClick={approve} variant="success" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Approve
              </Button>
              <Button
                onClick={() => setShowReject((v) => !v)}
                variant="outline"
                disabled={pending}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            </>
          )}
          {status === "approved" && (
            <Button onClick={cancel} variant="outline" disabled={pending}>
              <XCircle className="size-4" />
              Cancel approved leave
            </Button>
          )}
        </div>

        {showReject && (
          <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3">
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">
              Rejection reason
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              rows={2}
              className="mt-1"
              placeholder="Explain why the request is being rejected."
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={reject} disabled={pending}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
