import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatusPipeline — horizontal progression strip showing where a record
 * sits in its lifecycle (Stripe payments / Linear issues / GitHub PR
 * checks style).
 *
 * Use one stage per logical state. Past stages render filled with a
 * checkmark, the current stage lights up in brand-blue, future stages
 * are muted. Optional `failedAt` highlights a stage in danger red and
 * truncates the trail (no future stages shown after a failure).
 */
export interface PipelineStage {
  key: string;
  label: string;
}

export function StatusPipeline({
  stages,
  currentIndex,
  failedAtIndex,
  className,
}: {
  stages: PipelineStage[];
  currentIndex: number;
  failedAtIndex?: number;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "flex w-full items-center gap-1 overflow-x-auto py-1",
        className,
      )}
      aria-label="Status pipeline"
    >
      {stages.map((stage, i) => {
        const failed = failedAtIndex !== undefined && i === failedAtIndex;
        const isPast = !failed && i < currentIndex;
        const isCurrent = !failed && i === currentIndex;
        const isFuture = !failed && i > currentIndex;
        const hideAfterFail =
          failedAtIndex !== undefined && i > failedAtIndex;
        if (hideAfterFail) return null;

        return (
          <li
            key={stage.key}
            className="flex shrink-0 items-center gap-1"
            aria-current={isCurrent ? "step" : undefined}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none transition-colors",
                isPast &&
                  "bg-status-success/10 text-status-success ring-1 ring-inset ring-status-success/20",
                isCurrent &&
                  "bg-brand-blue/10 text-brand-blue ring-1 ring-inset ring-brand-blue/25",
                isFuture &&
                  "bg-bg-surface text-fg-tertiary ring-1 ring-inset ring-border",
                failed &&
                  "bg-status-danger/10 text-status-danger ring-1 ring-inset ring-status-danger/25",
              )}
            >
              {isPast ? (
                <Check className="size-2.5" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isCurrent && "bg-brand-blue",
                    isFuture && "bg-fg-tertiary/60",
                    failed && "bg-status-danger",
                  )}
                />
              )}
              {stage.label}
            </span>
            {i < stages.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px w-3 sm:w-5",
                  i < currentIndex
                    ? "bg-status-success/40"
                    : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Convenience pipeline definitions for the two most common flows.
 */
export const BOOKING_PIPELINE: PipelineStage[] = [
  { key: "draft", label: "Draft" },
  { key: "confirmed", label: "Confirmed" },
  { key: "planned", label: "Planned" },
  { key: "delivered", label: "Delivered" },
  { key: "invoiced", label: "Invoiced" },
];

export const TRIP_PIPELINE: PipelineStage[] = [
  { key: "planned", label: "Planned" },
  { key: "loading", label: "Loading" },
  { key: "in_transit", label: "In transit" },
  { key: "at_border", label: "At border" },
  { key: "delivered", label: "Delivered" },
  { key: "closed", label: "Closed" },
];

/** Resolve a booking status into its index inside BOOKING_PIPELINE. */
export function bookingStatusIndex(status: string, hasInvoice = false): number {
  if (hasInvoice) return 4;
  switch (status) {
    case "draft": return 0;
    case "confirmed": return 1;
    case "planned": return 2;
    case "delivered": return 3;
    default: return 0;
  }
}

/** Resolve a trip status into its index inside TRIP_PIPELINE. */
export function tripStatusIndex(status: string): {
  index: number;
  failed?: boolean;
} {
  switch (status) {
    case "planned": return { index: 0 };
    case "loading": return { index: 1 };
    case "in_transit": return { index: 2 };
    case "at_border": return { index: 3 };
    case "delivered": return { index: 4 };
    case "closed": return { index: 5 };
    case "delayed": return { index: 2, failed: true };
    case "cancelled": return { index: 0, failed: true };
    default: return { index: 0 };
  }
}
