import { Badge } from "@/components/ui/badge";
import type { TripStatus } from "@/lib/types/trips";

const config: Record<TripStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  planned:    { label: "Planned",    variant: "info" },
  loading:    { label: "Loading",    variant: "info" },
  in_transit: { label: "In Transit", variant: "info" },
  at_border:  { label: "At Border",  variant: "warning" },
  delivered:  { label: "Delivered",  variant: "success" },
  closed:     { label: "Closed",     variant: "neutral" },
  delayed:    { label: "Delayed",    variant: "danger" },
  cancelled:  { label: "Cancelled",  variant: "neutral" },
};

export function TripStatusPill({ status }: { status: TripStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
