import { Badge } from "@/components/ui/badge";
import type { ExpenseStatus } from "@/lib/types/expenses";

const config: Record<ExpenseStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  pending:    { label: "Pending review", variant: "warning" },
  approved:   { label: "Approved",       variant: "success" },
  rejected:   { label: "Rejected",       variant: "danger" },
  reimbursed: { label: "Reimbursed",     variant: "info" },
};

export function ExpenseStatusPill({ status }: { status: ExpenseStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
