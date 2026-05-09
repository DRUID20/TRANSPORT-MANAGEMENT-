import { Badge } from "@/components/ui/badge";
import type { TrailerStatus, TrailerType } from "@/lib/types/fleet";

const config: Record<TrailerStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  active:      { label: "Active",      variant: "success" },
  in_workshop: { label: "In Workshop", variant: "warning" },
  idle:        { label: "Idle",        variant: "neutral" },
  retired:     { label: "Retired",     variant: "neutral" },
};

export function TrailerStatusPill({ status }: { status: TrailerStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}

export const trailerTypeLabel: Record<TrailerType, string> = {
  flatbed: "Flatbed",
  tanker: "Tanker",
  curtain_side: "Curtain-Side",
  reefer: "Reefer",
  tipper: "Tipper",
  low_loader: "Low-Loader",
  container_skeleton: "Container Skeleton",
};
