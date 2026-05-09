import { Badge } from "@/components/ui/badge";
import type { ComplianceStatus } from "@/lib/types/hr-compliance";

const config: Record<
  ComplianceStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  valid:          { label: "Valid",          variant: "success" },
  expiring_soon:  { label: "Expiring soon",  variant: "warning" },
  expired:        { label: "Expired",        variant: "danger" },
  missing:        { label: "Missing",        variant: "neutral" },
};

export function ComplianceStatusPill({ status }: { status: ComplianceStatus }) {
  const c = config[status];
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
