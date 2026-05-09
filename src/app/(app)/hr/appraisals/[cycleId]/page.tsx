import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAppraisalCycleById,
  listReviewsForCycle,
} from "@/server/actions/appraisal";
import { listEmployees } from "@/server/actions/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CycleStatusPill, ReviewStatusPill } from "@/components/hr/appraisal-status-pill";
import { RATING_LABELS, reviewProgress, type Rating } from "@/lib/types/appraisal";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const cycle = await getAppraisalCycleById(cycleId);
  if (!cycle) notFound();
  const reviews = await listReviewsForCycle(cycleId);
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Appraisals", href: "/hr/appraisals" },
          { label: cycle.label },
        ]}
        eyebrow={`${cycle.startDate} → ${cycle.endDate}`}
        title={`Appraisal cycle ${cycle.label}`}
        description={`${reviews.length} reviews`}
        actions={<CycleStatusPill status={cycle.status} />}
      />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Goals</th>
                  <th className="px-5 py-3 font-medium">Overall</th>
                  <th className="px-5 py-3 font-medium">Recommendation</th>
                  <th className="px-5 py-3 text-right font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((r) => {
                  const e = empById.get(r.employeeId);
                  const progress = reviewProgress(r);
                  return (
                    <tr key={r.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/hr/appraisals/${cycleId}/${r.employeeId}`}
                          className="text-fg-primary group-hover:text-brand-blue"
                        >
                          <div>{e?.fullName ?? "—"}</div>
                          <div className="font-mono text-[10px] text-fg-tertiary">
                            {e?.employeeNumber} · {e?.jobTitle}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-fg-secondary">
                        {e?.departmentId.replace("dept-", "").toUpperCase() ?? "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <ReviewStatusPill status={r.status} />
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                        {r.goals.length}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-fg-secondary">
                        {r.overallRating ? (
                          <span>
                            <span className="font-mono tnum text-fg-primary">{r.overallRating}/5</span>
                            <span className="ml-1 text-[10px] text-fg-tertiary">
                              {RATING_LABELS[r.overallRating as Rating]}
                            </span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-xs">
                        {r.recommendation ? (
                          <span className="capitalize text-fg-secondary">
                            {r.recommendation}
                            {r.proposedIncrementPct
                              ? ` · +${r.proposedIncrementPct}%`
                              : ""}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="ml-auto inline-flex items-center gap-2">
                          <div className="h-1 w-20 overflow-hidden rounded-full bg-bg-base ring-1 ring-border">
                            <div
                              className="h-full bg-gradient-to-r from-brand-blue to-status-success"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-mono tnum text-[10px] text-fg-tertiary">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
