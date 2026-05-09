import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { listDepartments, listEmployees } from "@/server/actions/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function DepartmentsPage() {
  const departments = await listDepartments();
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));
  const headcountByDept = new Map<string, number>();
  for (const e of employees) {
    headcountByDept.set(e.departmentId, (headcountByDept.get(e.departmentId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Departments" }]}
        eyebrow="People"
        title="Departments"
        description={`${departments.length} departments · ${employees.length} total headcount`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => {
          const head = d.headEmployeeId ? empById.get(d.headEmployeeId) : undefined;
          const count = headcountByDept.get(d.id) ?? 0;
          return (
            <Link
              key={d.id}
              href={{ pathname: "/hr/employees", query: { dept: d.id } }}
              className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                  <Building2 className="size-5" />
                </div>
                <span className="font-mono text-[10px] tnum text-fg-tertiary">{d.code}</span>
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
                  {d.name}
                </div>
                {d.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-fg-tertiary">{d.description}</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <div className="flex items-center gap-1.5 text-fg-secondary">
                  <Users className="size-3.5" />
                  <span>
                    <span className="font-mono tnum text-fg-primary">{count}</span> headcount
                  </span>
                </div>
                <ArrowRight className="size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
              </div>

              {head && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-bg-base/40 px-2 py-1.5 text-[11px]">
                  <span className="text-fg-tertiary">Head:</span>
                  <span className="text-fg-primary">{head.fullName}</span>
                </div>
              )}
              {d.costCentre && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-bg-base px-2 py-0.5 text-[10px] font-mono text-fg-tertiary">
                  cc {d.costCentre}
                </div>
              )}
            </Link>
          );
        })}

        {departments.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-sm text-fg-tertiary">
              No departments yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
