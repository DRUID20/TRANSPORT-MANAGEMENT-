import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STAGES,
  STAGE_LABEL,
  stageReached,
  type StageSlug,
} from "@/lib/trips/wizard-stages";
import type { TripStatus } from "@/lib/types/trips";

/**
 * The big always-visible stage bar across the top of every wizard page.
 *
 *   ╭─ ✓ Loading ─────┬─ ✓ In transit ─┬─ ● Border ─┬─ 🔒 Delivery ─┬─ 🔒 Invoice ─╮
 *
 * - Past stages = green check, clickable (go back and edit).
 * - Current stage = brand-blue pill, highlighted.
 * - Future stages = grey + lock icon, NOT clickable.
 * - Closed/cancelled trips = every reached stage is read-only; the bar
 *   still navigates so the user can review what's filed.
 */
export function WizardStageBar({
  tripId,
  status,
  readyToInvoice,
  current,
  delayed = false,
}: {
  tripId: string;
  status: TripStatus;
  readyToInvoice?: boolean;
  current: StageSlug;
  /** When true (status === 'delayed'), show an amber DELAYED badge on the
   *  current stage without changing the stage layout. */
  delayed?: boolean;
}) {
  return (
    <nav
      aria-label="Trip stages"
      className="surface-card surface-3d border-2 border-border-strong p-2"
    >
      <ol className="grid grid-cols-5 gap-1">
        {STAGES.map((stage, i) => {
          const reached = stageReached(stage, status, { readyToInvoice });
          const isCurrent = stage === current;
          const isDone = reached && !isCurrent;
          const isFuture = !reached;
          const href = `/trips/${tripId}/${stage}`;

          const tile = (
            <div
              className={cn(
                "group flex flex-col items-start gap-1 rounded-lg border-2 px-3 py-2.5 transition-colors duration-150",
                isCurrent &&
                  "border-brand-blue bg-brand-blue/[0.06] text-fg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                isDone &&
                  "border-status-success/30 bg-status-success/[0.04] text-fg-primary hover:bg-status-success/[0.08]",
                isFuture &&
                  "border-border bg-bg-surface text-fg-tertiary",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <StageMarker index={i} state={isCurrent ? "current" : isDone ? "done" : "future"} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                    Step {i + 1}
                  </span>
                </span>
                {isCurrent && delayed && (
                  <span className="rounded-md bg-status-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-status-warning">
                    Delayed
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[14px] font-bold leading-tight tracking-tight",
                  isCurrent && "text-brand-blue",
                  isFuture && "text-fg-tertiary",
                )}
              >
                {STAGE_LABEL[stage]}
              </span>
            </div>
          );

          return (
            <li key={stage}>
              {isFuture ? (
                <div aria-disabled className="pointer-events-none">
                  {tile}
                </div>
              ) : (
                <Link
                  href={href}
                  aria-current={isCurrent ? "step" : undefined}
                  className="block focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/55"
                >
                  {tile}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StageMarker({
  index,
  state,
}: {
  index: number;
  state: "done" | "current" | "future";
}) {
  if (state === "done") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-status-success text-white">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
        {index + 1}
      </span>
    );
  }
  return (
    <span className="grid size-5 place-items-center rounded-full bg-bg-elevated-2 text-fg-tertiary">
      <Lock className="size-2.5" />
    </span>
  );
}
