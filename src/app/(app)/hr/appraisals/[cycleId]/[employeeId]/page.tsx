import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAppraisalCycleById,
  getAppraisalReviewById,
} from "@/server/actions/appraisal";
import { getEmployeeById } from "@/server/actions/hr";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewStatusPill } from "@/components/hr/appraisal-status-pill";
import { reviewProgress } from "@/lib/types/appraisal";
import { ReviewForm } from "./review-form";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string; employeeId: string }>;
}) {
  const { cycleId, employeeId } = await params;
  const cycle = await getAppraisalCycleById(cycleId);
  const employee = await getEmployeeById(employeeId);
  const review = await getAppraisalReviewById(cycleId, employeeId);
  if (!cycle || !employee || !review) notFound();
  const progress = reviewProgress(review);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Appraisals", href: "/hr/appraisals" },
          { label: cycle.label, href: `/hr/appraisals/${cycleId}` },
          { label: employee.fullName },
        ]}
        eyebrow={`Cycle ${cycle.label} · ${employee.employeeNumber}`}
        title={employee.fullName}
        description={`${employee.jobTitle} · ${employee.department?.name ?? "—"}`}
        actions={<ReviewStatusPill status={review.status} />}
      />

      <div className="rounded-lg border border-border bg-bg-elevated p-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-fg-tertiary">
          <span>Review progress</span>
          <span className="font-mono tnum">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-base ring-1 ring-border">
          <div
            className="h-full bg-gradient-to-r from-brand-blue to-status-success"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ReviewForm
        cycleId={cycleId}
        employeeId={employeeId}
        review={review}
      />

      <div className="text-center">
        <Link
          href={`/hr/appraisals/${cycleId}`}
          className="text-sm text-fg-tertiary hover:text-fg-secondary"
        >
          ← Back to cycle
        </Link>
      </div>
    </div>
  );
}
