import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { listDepartments, listEmployees } from "@/server/actions/hr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { EmployeeStatusPill } from "@/components/hr/employee-status-pill";
import { EmployeesFilters } from "./employees-filters";
import type { EmployeeStatus } from "@/lib/types/hr";

const VALID_STATUS: EmployeeStatus[] = [
  "active",
  "probation",
  "on_leave",
  "suspended",
  "terminated",
];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dept?: string; q?: string }>;
}) {
  const { status: rawStatus, dept, q } = await searchParams;
  const status = (VALID_STATUS as string[]).includes(rawStatus ?? "")
    ? (rawStatus as EmployeeStatus)
    : undefined;

  const employees = await listEmployees({
    status,
    departmentId: dept,
    search: q,
  });
  const departments = await listDepartments();
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const empById = new Map(
    (await listEmployees()).map((e) => [e.id, e]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Employees" }]}
        eyebrow="People"
        title="Employees"
        description={`${employees.length} ${employees.length === 1 ? "person" : "people"} on the register`}
        actions={
          <Button asChild>
            <Link href="/hr/employees/new">
              <Plus className="size-4" />
              New Employee
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="!p-4">
          <form className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary" />
              <Input
                name="q"
                type="search"
                placeholder="Search by name, employee #, job title or ID…"
                className="pl-9"
                defaultValue={q ?? ""}
              />
            </div>
            <input type="hidden" name="status" value={status ?? ""} />
            <input type="hidden" name="dept" value={dept ?? ""} />
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <EmployeesFilters
        activeStatus={status ?? "all"}
        activeDept={dept ?? "all"}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        q={q}
      />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Job title</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Reports to</th>
                  <th className="px-5 py-3 font-medium">Hire date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((e) => {
                  const dept = deptById.get(e.departmentId);
                  const mgr = e.lineManagerId ? empById.get(e.lineManagerId) : undefined;
                  return (
                    <tr key={e.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/hr/employees/${e.id}`}
                          className="flex items-center gap-2"
                        >
                          <span className="flex size-8 items-center justify-center rounded-full bg-bg-base text-[10px] font-semibold ring-1 ring-border text-fg-secondary">
                            {initials(e.fullName)}
                          </span>
                          <div className="flex flex-col leading-tight">
                            <span className="text-fg-primary group-hover:text-brand-blue">
                              {e.fullName}
                            </span>
                            <span className="font-mono text-[10px] tnum text-fg-tertiary">
                              {e.employeeNumber}
                              {e.driverId ? " · driver" : ""}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-xs text-fg-secondary">{e.jobTitle}</td>
                      <td className="px-5 py-2.5 text-xs text-fg-secondary">
                        {dept ? (
                          <span>
                            {dept.name}{" "}
                            <span className="font-mono text-[10px] text-fg-tertiary">
                              ({dept.code})
                            </span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-fg-secondary">
                        {mgr?.fullName ?? "—"}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[11px] tnum text-fg-tertiary">
                        {e.hireDate}
                      </td>
                      <td className="px-5 py-2.5">
                        <EmployeeStatusPill status={e.status} />
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      <Users className="mx-auto mb-2 size-8 text-fg-tertiary" />
                      No employees match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
