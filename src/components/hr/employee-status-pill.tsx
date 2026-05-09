import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus } from "@/lib/types/hr";

const config: Record<
  EmployeeStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  active:     { label: "Active",     variant: "success" },
  probation:  { label: "Probation",  variant: "info" },
  on_leave:   { label: "On Leave",   variant: "warning" },
  suspended:  { label: "Suspended",  variant: "danger" },
  terminated: { label: "Terminated", variant: "neutral" },
};

export function EmployeeStatusPill({ status }: { status: EmployeeStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
