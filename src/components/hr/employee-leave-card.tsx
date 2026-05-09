import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { leaveBalances, listLeaveRequests } from "@/server/actions/leave";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaveStatusPill } from "@/components/hr/leave-status-pill";
import { LEAVE_TYPE_LABELS } from "@/lib/types/leave";

export async function EmployeeLeaveCard({ employeeId }: { employeeId: string }) {
  const balances = await leaveBalances(employeeId);
  const requests = await listLeaveRequests({ employeeId });
  const annual = balances.find((b) => b.leaveType === "annual");
  const sick = balances.find((b) => b.leaveType === "sick");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-fg-tertiary" />
              Leave
            </CardTitle>
            <CardDescription>
              {annual ? `Annual ${annual.remaining}/${annual.entitled}` : "—"}
              {sick ? ` · Sick ${sick.remaining}/${sick.entitled}` : ""}
              {" · "}{requests.length} request{requests.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={{ pathname: "/hr/leave/new", query: { employee: employeeId } }}>
              New request
            </Link>
          </Button>
        </div>
      </CardHeader>
      {requests.length > 0 && (
        <CardContent className="!p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                <th className="px-5 py-2 font-medium">Request</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Period</th>
                <th className="px-5 py-2 text-right font-medium">Days</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.slice(0, 5).map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2 font-mono text-xs text-fg-primary">
                    <Link href={`/hr/leave/${r.id}`} className="hover:text-brand-blue">
                      {r.number}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-xs text-fg-secondary">
                    {LEAVE_TYPE_LABELS[r.leaveType]}
                  </td>
                  <td className="px-5 py-2 font-mono text-[11px] tnum text-fg-secondary">
                    {r.startDate} → {r.endDate}
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum text-fg-primary">
                    {r.days}
                  </td>
                  <td className="px-5 py-2">
                    <LeaveStatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}
