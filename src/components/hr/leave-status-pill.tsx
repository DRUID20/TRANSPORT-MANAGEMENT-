import { Badge } from "@/components/ui/badge";
import type { LeaveStatus } from "@/lib/types/leave";

const config: Record<
  LeaveStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  pending:   { label: "Pending",   variant: "warning" },
  approved:  { label: "Approved",  variant: "success" },
  taken:     { label: "Taken",     variant: "info" },
  rejected:  { label: "Rejected",  variant: "danger" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

export function LeaveStatusPill({ status }: { status: LeaveStatus }) {
  const c = config[status];
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
