import { Badge } from "@/components/ui/badge";
import type { BillStatus } from "@/lib/types/ap";

const config: Record<
  BillStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  draft:           { label: "Draft",            variant: "neutral" },
  sent:            { label: "Posted",           variant: "info" },
  partially_paid:  { label: "Partially Paid",   variant: "warning" },
  paid:            { label: "Paid",             variant: "success" },
  overdue:         { label: "Overdue",          variant: "danger" },
  cancelled:       { label: "Cancelled",        variant: "neutral" },
};

export function BillStatusPill({ status }: { status: BillStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
