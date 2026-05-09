import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { listJobDescriptions } from "@/server/actions/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  RESOURCE_GROUPS,
  RESOURCE_LABELS,
  type RbacResource,
} from "@/lib/types/rbac";

export default async function PermissionMatrixPage() {
  const jds = await listJobDescriptions();

  // Build a lookup: jdId × resource → action count
  const lookup = new Map<string, Map<RbacResource, number>>();
  for (const jd of jds) {
    const inner = new Map<RbacResource, number>();
    for (const p of jd.permissions) inner.set(p.resource, p.actions.length);
    lookup.set(jd.id, inner);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Permissions" },
        ]}
        eyebrow="People · RBAC"
        title="Permission Matrix"
        description="Resources × Job Descriptions. The number is the count of allowed actions for that JD on that resource."
      />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-elevated">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Resource</th>
                  {jds.map((jd) => (
                    <th key={jd.id} className="px-3 py-3 text-center font-medium">
                      <Link
                        href={`/hr/job-descriptions/${jd.id}`}
                        className="hover:text-brand-blue"
                      >
                        <div className="font-mono">{jd.code}</div>
                        <div className="text-[9px] text-fg-tertiary">
                          {jd.assignedCount ?? 0}
                        </div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESOURCE_GROUPS.map((group) => (
                  <Group key={group.label} label={group.label} resources={group.resources} jds={jds} lookup={lookup} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-fg-tertiary">
        <CheckCircle2 className="mr-1 inline size-3 text-status-success" />
        Future enforcement: a middleware will reject requests that don't have the
        required (resource, action) on the calling user's assigned Job Description.
      </p>
    </div>
  );
}

function Group({
  label,
  resources,
  jds,
  lookup,
}: {
  label: string;
  resources: RbacResource[];
  jds: Array<{ id: string; code: string }>;
  lookup: Map<string, Map<RbacResource, number>>;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={jds.length + 1}
          className="bg-bg-base/40 px-5 py-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary"
        >
          {label}
        </td>
      </tr>
      {resources.map((r) => (
        <tr key={r} className="border-b border-border">
          <td className="px-5 py-2 text-fg-primary">{RESOURCE_LABELS[r]}</td>
          {jds.map((jd) => {
            const count = lookup.get(jd.id)?.get(r) ?? 0;
            return (
              <td key={jd.id} className="px-3 py-2 text-center">
                {count > 0 ? (
                  <span
                    className={
                      "inline-flex size-6 items-center justify-center rounded-md font-mono text-[10px] font-semibold " +
                      (count >= 5
                        ? "bg-status-success/15 text-status-success ring-1 ring-status-success/30"
                        : count >= 3
                          ? "bg-brand-blue/15 text-brand-blue ring-1 ring-brand-blue/30"
                          : "bg-bg-base text-fg-secondary ring-1 ring-border")
                    }
                  >
                    {count}
                  </span>
                ) : (
                  <span className="text-fg-tertiary">·</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
