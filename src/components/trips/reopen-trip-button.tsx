"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reopenTrip } from "@/server/actions/trips";

/**
 * Admin escape hatch — reopen a closed/invoiced trip to fix volumes, expenses
 * or border charges. Two-click confirm (this reverses a draft invoice + the
 * shortage loan). The action is capability-gated (`finance.post`) server-side;
 * if the invoice is already sent it refuses with a "credit-note it first"
 * message which we surface inline.
 */
export function ReopenTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onConfirm() {
    setError(null);
    start(async () => {
      const result = await reopenTrip({ tripId });
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.push(`/trips/${tripId}/delivery`);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {error && (
        <p className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-1.5 text-[12px] font-semibold text-status-danger">
          {error}
        </p>
      )}
      {confirming ? (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Unlock className="size-3.5" />}
            Confirm reopen
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(true)}>
          <Unlock className="size-3.5" />
          Reopen trip (admin)
        </Button>
      )}
    </div>
  );
}
