import Link from "next/link";
import { leaveBalances, listLeaveRequests } from "@/server/actions/leave";
import { listEmployees } from "@/server/actions/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/types/leave";

const TYPES: LeaveType[] = ["annual", "sick", "compassionate", "maternity", "paternity"];

export default async function LeaveBalancesPage() {
  const employees = (await listEmployees({ status: "active" })).filter((e) => !e.driverId);
  // Drivers shown separately
  const drivers = (await listEmployees({ status: "active" })).filter((e) => e.driverId);

  const officeBalances = await Promise.all(
    employees.map(async (e) => ({ employee: e, balances: await leaveBalances(e.id) })),
  );
  const driverBalances = await Promise.all(
    drivers.map(async (e) => ({ employee: e, balances: await leaveBalances(e.id) })),
  );

  // Quick top stats from all pending requests
  const pending = (await listLeaveRequests({ status: "pending" })).length;
  const totalAnnualUsed = officeBalances
    .concat(driverBalances)
    .reduce(
      (s, b) => s + (b.balances.find((x) => x.leaveType === "annual")?.used ?? 0),
      0,
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Leave", href: "/hr/leave" },
          { label: "Balances" },
        ]}
        eyebrow="People · Leave"
        title="Leave Balances"
        description="Annual, sick, compassionate, maternity, paternity. Statutory Kenya defaults — overridable per contract."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Pending requests" value={pending} tone="warning" />
        <Stat
          label="Annual leave taken (yr)"
          value={`${totalAnnualUsed} d`}
          tone="info"
        />
        <Stat
          label="Headcount with balances"
          value={officeBalances.length + driverBalances.length}
        />
      </div>

      <BalanceTable title="Office staff" rows={officeBalances} />
      <BalanceTable title="Drivers" rows={driverBalances} />
    </div>
  );
}

function BalanceTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    employee: { id: string; fullName: string; employeeNumber: string; jobTitle: string };
    balances: Array<{
      leaveType: LeaveType;
      entitled: number;
      used: number;
      pending: number;
      remaining: number;
    }>;
  }>;
}) {
  return (
    <Card>
      <CardContent className="!p-0">
        <div className="border-b border-border bg-bg-base/40 px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
          {title} · {rows.length}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                <th className="px-5 py-2 font-medium">Employee</th>
                {TYPES.map((t) => (
                  <th key={t} className="px-3 py-2 text-right font-medium">{LEAVE_TYPE_LABELS[t]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ employee, balances }) => {
                const byType = new Map(balances.map((b) => [b.leaveType, b]));
                return (
                  <tr key={employee.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/hr/employees/${employee.id}`}
                        className="text-fg-primary hover:text-brand-blue"
                      >
                        <div>{employee.fullName}</div>
                        <div className="font-mono text-[10px] text-fg-tertiary">
                          {employee.employeeNumber} · {employee.jobTitle}
                        </div>
                      </Link>
                    </td>
                    {TYPES.map((t) => {
                      const b = byType.get(t);
                      const remaining = b?.remaining ?? 0;
                      const entitled = b?.entitled ?? 0;
                      const used = b?.used ?? 0;
                      return (
                        <td key={t} className="px-3 py-2.5 text-right">
                          <div className="font-mono tnum text-sm text-fg-primary">
                            {remaining}
                            <span className="text-[10px] text-fg-tertiary">/{entitled}</span>
                          </div>
                          {used > 0 && (
                            <div className="font-mono text-[9px] text-fg-tertiary">
                              {used} taken
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={TYPES.length + 1} className="px-5 py-8 text-center text-sm text-fg-tertiary">
                    No employees in this group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "info";
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "info" ? "text-brand-blue" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
