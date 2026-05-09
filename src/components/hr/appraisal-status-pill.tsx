import { Badge } from "@/components/ui/badge";
import type { AppraisalReviewStatus, AppraisalCycleStatus } from "@/lib/types/appraisal";

const reviewConfig: Record<
  AppraisalReviewStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  draft:                { label: "Draft",                variant: "neutral" },
  employee_submitted:   { label: "Self-assessed",        variant: "info" },
  manager_reviewed:     { label: "Manager reviewed",     variant: "warning" },
  hr_finalised:         { label: "HR finalised",         variant: "success" },
};

export function ReviewStatusPill({ status }: { status: AppraisalReviewStatus }) {
  const c = reviewConfig[status];
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}

const cycleConfig: Record<
  AppraisalCycleStatus,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  draft:  { label: "Draft",  variant: "neutral" },
  open:   { label: "Open",   variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
};

export function CycleStatusPill({ status }: { status: AppraisalCycleStatus }) {
  const c = cycleConfig[status];
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
