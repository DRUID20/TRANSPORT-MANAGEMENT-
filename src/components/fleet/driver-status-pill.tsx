import { Badge } from "@/components/ui/badge";
import type { DriverStatus } from "@/lib/types/fleet";

const config: Record<DriverStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  active:     { label: "Active",     variant: "success" },
  on_trip:    { label: "On Trip",    variant: "info" },
  on_leave:   { label: "On Leave",   variant: "warning" },
  suspended:  { label: "Suspended",  variant: "danger" },
  terminated: { label: "Terminated", variant: "neutral" },
};

export function DriverStatusPill({ status }: { status: DriverStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
