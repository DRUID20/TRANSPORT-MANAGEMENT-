import { Badge } from "@/components/ui/badge";
import type { PayrollPeriodStatus } from "@/lib/types/payroll";

const config: Record<
  PayrollPeriodStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  draft:      { label: "Draft",      variant: "neutral" },
  processing: { label: "Processing", variant: "info" },
  paid:       { label: "Paid",       variant: "success" },
  closed:     { label: "Closed",     variant: "neutral" },
};

export function PayrollStatusPill({ status }: { status: PayrollPeriodStatus }) {
  const c = config[status];
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
