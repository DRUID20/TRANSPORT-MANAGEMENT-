import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { listDepartments, listEmployees } from "@/server/actions/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmployeeAvatar } from "@/components/hr/employee-avatar";
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

  const [employees, allEmployees, departments] = await Promise.all([
    listEmployees({ status, departmentId: dept, search: q }),
    listEmployees(),
    listDepartments(),
  ]);
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const empById = new Map(allEmployees.map((e) => [e.id, e]));

  const noFilters = !status && !dept && !q;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Employees" }]}
        eyebrow="People"
        title="Employees"
        description={`${allEmployees.length} ${allEmployees.length === 1 ? "person" : "people"} on the register.`}
        actions={
          <Button asChild>
            <Link href="/hr/employees/new">
              <Plus className="size-4" />
              New employee
            </Link>
          </Button>
        }
      />

      <div className="surface-card p-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            name="q"
            type="search"
            placeholder="Search by name, employee #, job title or ID…"
            leadingIcon={<Search />}
            defaultValue={q ?? ""}
            className="h-9 flex-1"
          />
          <input type="hidden" name="status" value={status ?? ""} />
          <input type="hidden" name="dept" value={dept ?? ""} />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      <EmployeesFilters
        activeStatus={status ?? "all"}
        activeDept={dept ?? "all"}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        q={q}
      />

      {employees.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Users}
            title={
              noFilters ? "No employees yet" : "No employees match these filters"
            }
            description={
              noFilters
                ? "Add a person to the register to start scheduling leave, payroll and compliance tracking."
                : "Try clearing filters or broadening your search."
            }
            action={
              noFilters ? (
                <Button asChild>
                  <Link href="/hr/employees/new">
                    <Plus className="size-3.5" />
                    New employee
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {employees.length} of {allEmployees.length} employee
              {allEmployees.length === 1 ? "" : "s"} shown
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Employee</DataTableHeaderCell>
              <DataTableHeaderCell>Job title</DataTableHeaderCell>
              <DataTableHeaderCell>Department</DataTableHeaderCell>
              <DataTableHeaderCell>Reports to</DataTableHeaderCell>
              <DataTableHeaderCell>Hire date</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {employees.map((e) => {
              const d = deptById.get(e.departmentId);
              const mgr = e.lineManagerId ? empById.get(e.lineManagerId) : undefined;
              return (
                <DataTableRow key={e.id} linkHref={`/hr/employees/${e.id}`}>
                  <DataTableCell>
                    <Link
                      href={`/hr/employees/${e.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <EmployeeAvatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
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
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {e.jobTitle}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {d ? (
                      <span>
                        {d.name}{" "}
                        <span className="font-mono text-[10px] text-fg-tertiary">
                          ({d.code})
                        </span>
                      </span>
                    ) : (
                      <span className="text-fg-tertiary">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-xs text-fg-secondary">
                    {mgr?.fullName ?? <span className="text-fg-tertiary">—</span>}
                  </DataTableCell>
                  <DataTableCell mono className="text-[11px] text-fg-tertiary">
                    {e.hireDate}
                  </DataTableCell>
                  <DataTableCell>
                    <EmployeeStatusPill status={e.status} />
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
