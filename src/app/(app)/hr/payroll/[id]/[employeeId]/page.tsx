import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployeeById } from "@/server/actions/hr";
import {
  getPayrollInputById,
  getPayrollPeriodById,
} from "@/server/actions/payroll";
import { listLoans } from "@/server/actions/payroll";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollStatusPill } from "@/components/hr/payroll-status-pill";
import { PayrollInputForm } from "./payroll-input-form";

export default async function PayrollInputDetailPage({
  params,
}: {
  params: Promise<{ id: string; employeeId: string }>;
}) {
  const { id, employeeId } = await params;
  const period = await getPayrollPeriodById(id);
  const employee = await getEmployeeById(employeeId);
  const input = await getPayrollInputById(id, employeeId);
  if (!period || !employee || !input) notFound();

  const empLoans = await listLoans({ employeeId, status: "active" });
  const locked = period.status === "paid" || period.status === "closed";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Payroll", href: "/hr/payroll" },
          { label: period.yearMonth, href: `/hr/payroll/${id}` },
          { label: employee.fullName },
        ]}
        eyebrow={`${period.yearMonth} · ${employee.employeeNumber}`}
        title={employee.fullName}
        description={employee.jobTitle}
        actions={<PayrollStatusPill status={period.status} />}
      />

      {/* Allowances summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract allowances</CardTitle>
          <CardDescription>
            Pulled from the active contract. Adjust adhoc lines below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {input.allowances.length === 0 ? (
            <p className="text-sm text-fg-tertiary">No allowances on the active contract.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {input.allowances.map((a, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border bg-bg-base/40 px-3 py-1.5 text-xs"
                >
                  <span className="text-fg-primary">{a.name}</span>
                  {" · "}
                  <span className="font-mono tnum text-fg-secondary">
                    {a.amount.toLocaleString()} {input.currency}
                  </span>
                  <span className={
                    "ml-1 text-[10px] " +
                    (a.taxable ? "text-status-warning" : "text-status-success")
                  }>
                    {a.taxable ? "(taxable)" : "(non-taxable)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Active loans */}
      {empLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active loans</CardTitle>
            <CardDescription>
              Total monthly recovery across active loans is auto-populated below.
            </CardDescription>
          </CardHeader>
          <CardContent className="!p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Loan</th>
                  <th className="px-5 py-2 text-right font-medium">Principal</th>
                  <th className="px-5 py-2 text-right font-medium">Monthly</th>
                  <th className="px-5 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {empLoans.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2 font-mono text-xs text-fg-primary">{l.number}</td>
                    <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                      {l.principal.toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                      {l.monthlyRecovery.toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum text-status-warning">
                      {l.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Inputs form */}
      <PayrollInputForm
        periodId={id}
        employeeId={employeeId}
        currency={input.currency}
        initial={{
          basicSalary: input.basicSalary,
          overtimeHours: input.overtimeHours,
          overtimeRate: input.overtimeRate,
          bonus: input.bonus,
          otherDeductions: input.otherDeductions,
          loanRecovery: input.loanRecovery,
          notes: input.notes ?? "",
        }}
        computed={{
          grossPay: input.grossPay,
          paye: input.paye,
          nssfEmployee: input.nssfEmployee,
          shaEmployee: input.shaEmployee,
          ahlEmployee: input.ahlEmployee,
          totalDeductions: input.totalDeductions,
          netPay: input.netPay,
          employerCost: input.employerCost,
        }}
        locked={locked}
      />

      <div className="text-center">
        <Link
          href={`/hr/payroll/${id}`}
          className="text-sm text-fg-tertiary hover:text-fg-secondary"
        >
          ← Back to register
        </Link>
      </div>
    </div>
  );
}
