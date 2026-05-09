import { Badge } from "@/components/ui/badge";

export type TripStatus =
  | "planned"
  | "loading"
  | "in_transit"
  | "at_border"
  | "delivered"
  | "closed"
  | "cancelled"
  | "delayed";

const config: Record<
  TripStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  planned: { label: "Planned", variant: "info" },
  loading: { label: "Loading", variant: "info" },
  in_transit: { label: "In Transit", variant: "info" },
  at_border: { label: "At Border", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  delayed: { label: "Delayed", variant: "danger" },
};

export function StatusPill({ status }: { status: TripStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
