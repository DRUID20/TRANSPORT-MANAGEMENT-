import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, KeyRound, Users } from "lucide-react";
import { getJobDescriptionById } from "@/server/actions/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  ALL_ACTIONS,
  RESOURCE_GROUPS,
  RESOURCE_LABELS,
  type RbacAction,
  type RbacResource,
} from "@/lib/types/rbac";

const levelColour: Record<string, string> = {
  executive:  "bg-status-danger/10 text-status-danger ring-status-danger/30",
  manager:    "bg-brand-blue/10 text-brand-blue ring-brand-blue/30",
  supervisor: "bg-status-warning/10 text-status-warning ring-status-warning/30",
  officer:    "bg-bg-base text-fg-secondary ring-border",
  operator:   "bg-status-success/10 text-status-success ring-status-success/30",
};

export default async function JdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jd = await getJobDescriptionById(id);
  if (!jd) notFound();

  // Index permissions by resource
  const byResource = new Map<RbacResource, Set<RbacAction>>();
  for (const p of jd.permissions) {
    byResource.set(p.resource, new Set(p.actions));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Job Descriptions", href: "/hr/job-descriptions" },
          { label: jd.title },
        ]}
        eyebrow={`${jd.code} · ${jd.title}`}
        title={jd.title}
        description={jd.summary}
        actions={
          <span
            className={
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 " +
              (levelColour[jd.level] ?? "")
            }
          >
            {jd.level}
          </span>
        }
      />

      {/* Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle>Key responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {jd.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-fg-primary">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-status-success" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Permissions matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-fg-tertiary" />
            Permissions matrix
          </CardTitle>
          <CardDescription>
            Resources this JD can access, with allowed actions per resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {RESOURCE_GROUPS.map((group) => {
            const rows = group.resources.filter((r) => byResource.has(r));
            if (rows.length === 0) return null;
            return (
              <div key={group.label}>
                <div className="border-b border-t border-border bg-bg-base/40 px-5 py-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
                  {group.label}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                      <th className="px-5 py-2 font-medium">Resource</th>
                      {ALL_ACTIONS.map((a) => (
                        <th key={a} className="px-3 py-2 text-center font-medium">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => {
                      const actions = byResource.get(r)!;
                      return (
                        <tr key={r}>
                          <td className="px-5 py-2 text-fg-primary">{RESOURCE_LABELS[r]}</td>
                          {ALL_ACTIONS.map((a) => (
                            <td key={a} className="px-3 py-2 text-center">
                              {actions.has(a) ? (
                                <CheckCircle2 className="inline size-4 text-status-success" />
                              ) : (
                                <span className="text-fg-tertiary">·</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Assigned employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-fg-tertiary" />
            Assigned to
          </CardTitle>
          <CardDescription>
            {jd.assignedEmployees.length === 0
              ? "No employees assigned this JD."
              : `${jd.assignedEmployees.length} employee${jd.assignedEmployees.length === 1 ? "" : "s"} assigned this JD.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          {jd.assignedEmployees.length > 0 && (
            <ul className="divide-y divide-border">
              {jd.assignedEmployees.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/hr/employees/${e.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-base/40"
                  >
                    <div>
                      <div className="text-fg-primary">{e.fullName}</div>
                      <div className="font-mono text-[10px] text-fg-tertiary">
                        {e.employeeNumber} · {e.jobTitle}
                      </div>
                    </div>
                    <Badge
                      variant={
                        e.status === "active" ? "success" :
                          e.status === "probation" ? "info" : "neutral"
                      }
                    >
                      {e.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
