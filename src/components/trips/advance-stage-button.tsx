"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceTripStage } from "@/server/actions/trips";

/**
 * The one button that actually moves a trip forward through the wizard.
 *
 * Unlike a plain <Link>, this calls the `advanceTripStage` server action,
 * which re-validates the stage gate SERVER-SIDE and writes the status
 * transition + timeline event. Only on success do we navigate to the next
 * stage's URL. Any gate failure surfaces inline (the user shouldn't get
 * here if the UI gate is right, but server is the source of truth).
 */
export function AdvanceStageButton({
  tripId,
  to,
  nextSlug,
  label,
}: {
  tripId: string;
  to: "in_transit" | "at_border" | "delivered";
  /** URL slug of the stage to land on after a successful advance. */
  nextSlug: string;
  label: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onClick() {
    setError(null);
    start(async () => {
      const result = await advanceTripStage({ tripId, to });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/trips/${tripId}/${nextSlug}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-1.5 text-[12px] font-semibold text-status-danger">
          {error}
        </p>
      )}
      <Button type="button" size="lg" variant="primary" onClick={onClick} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {label}
        {!pending && <ArrowRight className="size-4" />}
      </Button>
    </div>
  );
}
