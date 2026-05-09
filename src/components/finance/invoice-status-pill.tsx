import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/types/ar";

const config: Record<
  InvoiceStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  draft:           { label: "Draft",            variant: "neutral" },
  sent:            { label: "Sent",             variant: "info" },
  partially_paid:  { label: "Partially Paid",   variant: "warning" },
  paid:            { label: "Paid",             variant: "success" },
  overdue:         { label: "Overdue",          variant: "danger" },
  cancelled:       { label: "Cancelled",        variant: "neutral" },
};

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
