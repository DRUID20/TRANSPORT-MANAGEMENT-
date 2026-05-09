import Link from "next/link";
import { listEmployees } from "@/server/actions/hr";
import { PageHeader } from "@/components/layout/page-header";
import { LoanCreateForm } from "./loan-create-form";

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const { employee } = await searchParams;
  const employees = (await listEmployees({ status: "active" })).map((e) => ({
    id: e.id,
    name: `${e.fullName} — ${e.jobTitle}`,
  }));
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Loans", href: "/hr/loans" },
          { label: "New Loan" },
        ]}
        eyebrow="People · Salaries & Loans"
        title="New Loan"
        description="Disburse a salary advance or staff loan. Monthly recovery applies on each Paid payroll period."
      />
      <LoanCreateForm employees={employees} preselectEmployeeId={employee} />
      <div className="text-center">
        <Link href="/hr/loans" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Loans
        </Link>
      </div>
    </div>
  );
}
