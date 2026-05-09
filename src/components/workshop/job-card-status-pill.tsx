import { Badge } from "@/components/ui/badge";
import type { JobCardStatus } from "@/lib/types/workshop";

const config: Record<JobCardStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  open:            { label: "Open",            variant: "info" },
  in_progress:     { label: "In Progress",     variant: "info" },
  awaiting_parts:  { label: "Awaiting Parts",  variant: "warning" },
  completed:       { label: "Completed",       variant: "success" },
  cancelled:       { label: "Cancelled",       variant: "neutral" },
};

export function JobCardStatusPill({ status }: { status: JobCardStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
