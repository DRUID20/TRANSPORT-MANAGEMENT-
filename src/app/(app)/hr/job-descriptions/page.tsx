import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { listJobDescriptions } from "@/server/actions/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

const levelColour: Record<string, string> = {
  executive:  "bg-status-danger/10 text-status-danger ring-status-danger/30",
  manager:    "bg-brand-blue/10 text-brand-blue ring-brand-blue/30",
  supervisor: "bg-status-warning/10 text-status-warning ring-status-warning/30",
  officer:    "bg-bg-base text-fg-secondary ring-border",
  operator:   "bg-status-success/10 text-status-success ring-status-success/30",
};

export default async function JdListPage() {
  const jds = await listJobDescriptions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Job Descriptions" }]}
        eyebrow="People · RBAC"
        title="Job Descriptions"
        description="Each JD activates specific screens and actions. Assign one to every employee."
        actions={
          <Link
            href="/hr/permissions"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
          >
            <ShieldCheck className="size-3.5" />
            Permission matrix
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jds.map((jd) => {
          const totalActions = jd.permissions.reduce((s, p) => s + p.actions.length, 0);
          return (
            <Link
              key={jd.id}
              href={`/hr/job-descriptions/${jd.id}`}
              className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                  <KeyRound className="size-5" />
                </div>
                <span
                  className={
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 " +
                    (levelColour[jd.level] ?? "bg-bg-base text-fg-secondary ring-border")
                  }
                >
                  {jd.level}
                </span>
              </div>
              <div className="mt-3">
                <div className="font-mono text-[10px] tnum text-fg-tertiary">{jd.code}</div>
                <div className="text-base font-semibold text-fg-primary group-hover:text-brand-blue">
                  {jd.title}
                </div>
                <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-fg-secondary">
                  {jd.summary}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <div className="flex flex-col">
                  <span className="font-mono tnum text-base font-semibold text-fg-primary">
                    {jd.permissions.length}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-fg-tertiary">
                    resources
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono tnum text-base font-semibold text-fg-primary">
                    {totalActions}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-fg-tertiary">
                    actions
                  </span>
                </div>
                <div className="flex flex-col">
                  <Badge variant={jd.assignedCount && jd.assignedCount > 0 ? "info" : "neutral"}>
                    {jd.assignedCount ?? 0} assigned
                  </Badge>
                </div>
                <ArrowRight className="size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
        {jds.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No job descriptions defined.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
