import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { NewPeriodForm } from "./new-period-form";

export default function NewPayrollPeriodPage() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextYm = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Payroll", href: "/hr/payroll" },
          { label: "New Period" },
        ]}
        eyebrow="People · Payroll"
        title="New Payroll Period"
        description="Auto-populates inputs for every active employee from their contract."
      />
      <NewPeriodForm defaultYearMonth={nextYm} />
      <div className="text-center">
        <Link href="/hr/payroll" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Payroll
        </Link>
      </div>
    </div>
  );
}
