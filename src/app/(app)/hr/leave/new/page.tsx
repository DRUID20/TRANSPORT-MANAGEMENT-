import Link from "next/link";
import { listEmployees } from "@/server/actions/hr";
import { PageHeader } from "@/components/layout/page-header";
import { LeaveRequestForm } from "./leave-request-form";

export default async function NewLeavePage({
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
          { label: "Leave", href: "/hr/leave" },
          { label: "New Request" },
        ]}
        eyebrow="People · Leave"
        title="New Leave Request"
        description="Submit a leave request. Working-days are computed (Sat/Sun excluded)."
      />
      <LeaveRequestForm employees={employees} preselectEmployeeId={employee} />
      <div className="text-center">
        <Link href="/hr/leave" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Leave
        </Link>
      </div>
    </div>
  );
}
