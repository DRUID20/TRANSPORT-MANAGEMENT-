import Link from "next/link";
import { Wallet } from "lucide-react";
import {
  listLoans,
  listPayrollPeriods,
  getPayrollInputById,
} from "@/server/actions/payroll";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoanStatusPill } from "@/components/hr/loan-status-pill";

export async function EmployeePayrollCard({ employeeId }: { employeeId: string }) {
  const periods = await listPayrollPeriods();
  const latest = periods[0];
  const latestInput = latest ? await getPayrollInputById(latest.id, employeeId) : undefined;
  const loans = await listLoans({ employeeId });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-fg-tertiary" />
              Payroll & Loans
            </CardTitle>
            <CardDescription>
              {latest
                ? `Latest period ${latest.yearMonth}: ${latestInput ? `KSh ${latestInput.netPay.toLocaleString()} net` : "no input"}`
                : "No payroll periods yet."}
              {" · "}
              {loans.length} loan{loans.length === 1 ? "" : "s"} on file
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={{ pathname: "/hr/loans/new", query: { employee: employeeId } }}>
              New loan
            </Link>
          </Button>
        </div>
      </CardHeader>
      {loans.length > 0 && (
        <CardContent className="!p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                <th className="px-5 py-2 font-medium">Loan</th>
                <th className="px-5 py-2 text-right font-medium">Principal</th>
                <th className="px-5 py-2 text-right font-medium">Monthly</th>
                <th className="px-5 py-2 text-right font-medium">Balance</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.slice(0, 5).map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-2 font-mono text-xs text-fg-primary">
                    <Link href={`/hr/loans/${l.id}`} className="hover:text-brand-blue">
                      {l.number}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                    {l.principal.toLocaleString()} {l.currency}
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                    {l.monthlyRecovery.toLocaleString()}
                  </td>
                  <td className="px-5 py-2 text-right font-mono tnum text-status-warning">
                    {l.balance.toLocaleString()}
                  </td>
                  <td className="px-5 py-2">
                    <LoanStatusPill status={l.status} />
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
