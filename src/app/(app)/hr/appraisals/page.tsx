import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { listAppraisalCycles, listReviewsForCycle } from "@/server/actions/appraisal";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CycleStatusPill } from "@/components/hr/appraisal-status-pill";
import { reviewProgress } from "@/lib/types/appraisal";

export default async function AppraisalsPage() {
  const cycles = await listAppraisalCycles();
  const summary = await Promise.all(
    cycles.map(async (c) => {
      const reviews = await listReviewsForCycle(c.id);
      const finalised = reviews.filter((r) => r.status === "hr_finalised").length;
      const inProgress = reviews.filter(
        (r) => r.status === "employee_submitted" || r.status === "manager_reviewed",
      ).length;
      const draft = reviews.filter((r) => r.status === "draft").length;
      const avgProgress = reviews.length > 0
        ? Math.round(
            reviews.reduce((s, r) => s + reviewProgress(r), 0) / reviews.length,
          )
        : 0;
      return { cycle: c, reviewCount: reviews.length, finalised, inProgress, draft, avgProgress };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Appraisals" }]}
        eyebrow="People · Performance"
        title="Performance Appraisals"
        description="Annual cycle. Goals + competencies + 3-stage signoff (Self → Manager → HR)."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {summary.map(({ cycle, reviewCount, finalised, inProgress, draft, avgProgress }) => (
          <Link
            key={cycle.id}
            href={`/hr/appraisals/${cycle.id}`}
            className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                <GraduationCap className="size-5" />
              </div>
              <CycleStatusPill status={cycle.status} />
            </div>
            <div className="mt-3 text-lg font-semibold text-fg-primary group-hover:text-brand-blue">
              {cycle.label}
            </div>
            <div className="text-[11px] text-fg-tertiary">
              {cycle.startDate} → {cycle.endDate}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
              <Mini label="Done" value={finalised} tone="success" />
              <Mini label="In progress" value={inProgress} tone="info" />
              <Mini label="Draft" value={draft} />
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[10px] text-fg-tertiary">
                <span>Avg progress · {reviewCount} reviews</span>
                <span className="font-mono tnum">{avgProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-base ring-1 ring-border">
                <div
                  className="h-full bg-gradient-to-r from-brand-blue to-status-success"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-3 text-right">
              <ArrowRight className="inline size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
        {summary.length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No appraisal cycles yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "info";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "info" ? "text-brand-blue" : "text-fg-primary";
  return (
    <div>
      <div className={`font-mono tnum text-base font-semibold ${colour}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-fg-tertiary">{label}</div>
    </div>
  );
}
