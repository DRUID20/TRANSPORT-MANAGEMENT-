import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/lib/types/payroll";

const config: Record<
  LoanStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  active:       { label: "Active",       variant: "info" },
  paid_off:     { label: "Paid off",     variant: "success" },
  cancelled:    { label: "Cancelled",    variant: "neutral" },
  written_off:  { label: "Written off",  variant: "danger" },
};

export function LoanStatusPill({ status }: { status: LoanStatus }) {
  const c = config[status];
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
