import Link from "next/link";
import { CalendarRange, Plus } from "lucide-react";
import { listLeaveRequests } from "@/server/actions/leave";
import { listEmployees } from "@/server/actions/hr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LeaveStatusPill } from "@/components/hr/leave-status-pill";
import { LEAVE_TYPE_LABELS, type LeaveStatus } from "@/lib/types/leave";
import { LeaveFilters } from "./leave-filters";

const VALID_STATUS: LeaveStatus[] = ["pending", "approved", "taken", "rejected", "cancelled"];

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = (VALID_STATUS as string[]).includes(rawStatus ?? "")
    ? (rawStatus as LeaveStatus)
    : undefined;

  const requests = await listLeaveRequests({ status });
  const all = await listLeaveRequests();
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));

  const counts = {
    pending: all.filter((r) => r.status === "pending").length,
    approved: all.filter((r) => r.status === "approved").length,
    taken: all.filter((r) => r.status === "taken").length,
    rejected: all.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Leave" }]}
        eyebrow="People · Leave"
        title="Leave Requests"
        description="Annual / sick / compassionate / maternity / paternity. Approve or reject pending requests."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/hr/leave/balances">
                <CalendarRange className="size-4" />
                Balances
              </Link>
            </Button>
            <Button asChild>
              <Link href="/hr/leave/new">
                <Plus className="size-4" />
                New Request
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Pending" value={counts.pending} tone="warning" />
        <Stat label="Approved" value={counts.approved} tone="success" />
        <Stat label="Taken" value={counts.taken} tone="info" />
        <Stat label="Rejected" value={counts.rejected} tone="danger" />
      </div>

      <LeaveFilters active={status ?? "all"} />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Request</th>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 text-right font-medium">Days</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r) => {
                  const emp = empById.get(r.employeeId);
                  return (
                    <tr key={r.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/hr/leave/${r.id}`}
                          className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue"
                        >
                          {r.number}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        {emp ? (
                          <Link
                            href={`/hr/employees/${emp.id}`}
                            className="text-fg-primary hover:text-brand-blue"
                          >
                            <div>{emp.fullName}</div>
                            <div className="font-mono text-[10px] text-fg-tertiary">
                              {emp.employeeNumber}
                            </div>
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-fg-secondary">
                        {LEAVE_TYPE_LABELS[r.leaveType]}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[11px] tnum text-fg-secondary">
                        {r.startDate} → {r.endDate}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                        {r.days}
                      </td>
                      <td className="px-5 py-2.5">
                        <LeaveStatusPill status={r.status} />
                      </td>
                    </tr>
                  );
                })}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No leave requests match the filters.
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

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "danger" | "info" | "warning";
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" :
    tone === "success" ? "text-status-success" :
    tone === "info" ? "text-brand-blue" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
