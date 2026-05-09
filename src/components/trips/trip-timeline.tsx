import {
  CheckCircle2,
  Circle,
  Flag,
  MapPin,
  Package,
  PauseCircle,
  Truck as TruckIcon,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TripStatus, TripStatusEvent } from "@/lib/types/trips";
import { cn } from "@/lib/utils";

const iconFor: Record<TripStatus, LucideIcon> = {
  planned:    Circle,
  loading:    Package,
  in_transit: TruckIcon,
  at_border:  Flag,
  delivered:  CheckCircle2,
  closed:     CheckCircle2,
  delayed:    PauseCircle,
  cancelled:  XCircle,
};

const labelFor: Record<TripStatus, string> = {
  planned:    "Planned",
  loading:    "Loading",
  in_transit: "In Transit",
  at_border:  "At Border",
  delivered:  "Delivered",
  closed:     "Closed",
  delayed:    "Delayed",
  cancelled:  "Cancelled",
};

const toneFor: Record<TripStatus, string> = {
  planned:    "bg-status-info/15 text-status-info ring-status-info/30",
  loading:    "bg-status-info/15 text-status-info ring-status-info/30",
  in_transit: "bg-brand-blue/15 text-brand-blue ring-brand-blue/30",
  at_border:  "bg-status-warning/15 text-status-warning ring-status-warning/30",
  delivered:  "bg-status-success/15 text-status-success ring-status-success/30",
  closed:     "bg-status-neutral/15 text-status-neutral ring-status-neutral/30",
  delayed:    "bg-status-danger/15 text-status-danger ring-status-danger/30",
  cancelled:  "bg-status-neutral/15 text-status-neutral ring-status-neutral/30",
};

export function TripTimeline({ events }: { events: TripStatusEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-fg-tertiary">
        No status events yet. Update the trip status to start the timeline.
      </p>
    );
  }
  return (
    <ol className="relative ml-3 flex flex-col gap-4 border-l border-border pl-6">
      {events.map((e, i) => {
        const Icon = iconFor[e.toStatus];
        const isLatest = i === events.length - 1;
        return (
          <li key={e.id} className="relative">
            {/* Dot */}
            <span
              className={cn(
                "absolute -left-[1.85rem] flex size-7 items-center justify-center rounded-full ring-2",
                toneFor[e.toStatus],
              )}
            >
              <Icon className="size-3.5" />
            </span>
            {/* Body */}
            <div
              className={cn(
                "rounded-md border px-3 py-2",
                isLatest
                  ? "border-border-strong bg-bg-elevated-2"
                  : "border-border bg-bg-base/60",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-fg-primary">
                  {labelFor[e.toStatus]}
                </span>
                {e.fromStatus && (
                  <span className="font-mono text-[10px] text-fg-tertiary">
                    from {labelFor[e.fromStatus]}
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] tnum text-fg-tertiary">
                  {new Date(e.occurredAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-fg-secondary">{e.actorName}</div>
              {(e.note || e.location) && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {e.location && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-bg-base px-2 py-0.5 text-fg-secondary ring-1 ring-border">
                      <MapPin className="size-2.5" />
                      {e.location}
                    </span>
                  )}
                  {e.note && <span className="text-fg-tertiary">{e.note}</span>}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
