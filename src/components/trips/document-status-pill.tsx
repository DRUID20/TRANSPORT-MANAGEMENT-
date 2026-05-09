import { Badge } from "@/components/ui/badge";
import type { TripDocumentStatus } from "@/lib/types/documents";

const config: Record<TripDocumentStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  pending:  { label: "Pending review", variant: "warning" },
  approved: { label: "Approved",       variant: "success" },
  rejected: { label: "Rejected",       variant: "danger" },
};

export function DocumentStatusPill({ status }: { status: TripDocumentStatus }) {
  const c = config[status];
  return (
    <Badge variant={c.variant} dot>
      {c.label}
    </Badge>
  );
}
