import Link from "next/link";
import {
  getNextEmployeeNumber,
  listDepartments,
  listEmployees,
  listUnlinkedDrivers,
} from "@/server/actions/hr";
import { PageHeader } from "@/components/layout/page-header";
import { EmployeeCreateForm } from "./employee-create-form";

export default async function NewEmployeePage() {
  const departments = await listDepartments();
  const employees = await listEmployees({ status: "active" });
  const unlinkedDrivers = await listUnlinkedDrivers();
  const nextNumber = await getNextEmployeeNumber();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Employees", href: "/hr/employees" },
          { label: "New Employee" },
        ]}
        eyebrow="People"
        title="New Employee"
        description={`Default employee number: ${nextNumber} — adjustable.`}
      />
      <EmployeeCreateForm
        nextNumber={nextNumber}
        departments={departments.map((d) => ({ id: d.id, name: d.name, code: d.code }))}
        managers={employees.map((e) => ({ id: e.id, name: `${e.fullName} — ${e.jobTitle}` }))}
        unlinkedDrivers={unlinkedDrivers.map((d) => ({
          id: d.id,
          name: `${d.fullName} (${d.licenceClass})`,
        }))}
      />
      <div className="text-center">
        <Link href="/hr/employees" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Employees
        </Link>
      </div>
    </div>
  );
}
