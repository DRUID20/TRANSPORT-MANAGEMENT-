import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/types/trips";

const config: Record<BookingStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  draft:     { label: "Draft",     variant: "neutral" },
  confirmed: { label: "Confirmed", variant: "info" },
  planned:   { label: "Planned",   variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
