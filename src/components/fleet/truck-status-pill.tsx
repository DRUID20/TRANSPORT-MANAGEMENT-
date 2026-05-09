import { Badge } from "@/components/ui/badge";
import type { TruckStatus } from "@/lib/types/fleet";

const config: Record<TruckStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  active:      { label: "Active",      variant: "success" },
  in_service:  { label: "In Service",  variant: "info" },
  in_workshop: { label: "In Workshop", variant: "warning" },
  idle:        { label: "Idle",        variant: "neutral" },
  retired:     { label: "Retired",     variant: "neutral" },
};

export function TruckStatusPill({ status }: { status: TruckStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
