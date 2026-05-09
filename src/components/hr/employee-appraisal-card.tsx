import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { reviewsForEmployee } from "@/server/actions/appraisal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewStatusPill } from "@/components/hr/appraisal-status-pill";
import { RATING_LABELS, type Rating } from "@/lib/types/appraisal";

export async function EmployeeAppraisalCard({ employeeId }: { employeeId: string }) {
  const reviews = await reviewsForEmployee(employeeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="size-4 text-fg-tertiary" />
          Performance
        </CardTitle>
        <CardDescription>
          {reviews.length === 0
            ? "No appraisals yet."
            : `${reviews.length} review${reviews.length === 1 ? "" : "s"} on file.`}
        </CardDescription>
      </CardHeader>
      {reviews.length > 0 && (
        <CardContent className="!p-0">
          <ul className="divide-y divide-border">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/hr/appraisals/${r.cycleId}/${r.employeeId}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-base/40"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm text-fg-primary">
                      Cycle {r.cycleId.replace("apc-", "")}
                    </span>
                    <span className="text-[11px] text-fg-tertiary">
                      {r.goals.length} goals · {r.competencies.length} competencies
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.overallRating && (
                      <span className="font-mono tnum text-sm text-fg-primary">
                        {r.overallRating}/5
                        <span className="ml-1 text-[10px] text-fg-tertiary">
                          {RATING_LABELS[r.overallRating as Rating]}
                        </span>
                      </span>
                    )}
                    <ReviewStatusPill status={r.status} />
                    <ArrowRight className="size-3.5 text-fg-tertiary" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
