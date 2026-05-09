import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  getPayrollPeriodById,
  listPayrollInputs,
  payrollTotals,
} from "@/server/actions/payroll";
import { listEmployees } from "@/server/actions/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollStatusPill } from "@/components/hr/payroll-status-pill";
import { PeriodActions } from "./period-actions";

export default async function PayrollPeriodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const period = await getPayrollPeriodById(id);
  if (!period) notFound();
  const inputs = await listPayrollInputs(id);
  const totals = await payrollTotals(id);
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Payroll", href: "/hr/payroll" },
          { label: period.yearMonth },
        ]}
        eyebrow={`${period.startDate} → ${period.endDate}`}
        title={`Payroll · ${period.yearMonth}`}
        description={`${totals.count} employees on the register`}
        actions={<PayrollStatusPill status={period.status} />}
      />

      <PeriodActions periodId={period.id} status={period.status} />

      {/* Aggregate totals */}
      <Card>
        <CardContent className="!p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <Stat label="Headcount" value={totals.count} />
            <Stat label="Gross" value={`KSh ${Math.round(totals.grossPay).toLocaleString()}`} mono tone="info" />
            <Stat label="PAYE" value={`KSh ${Math.round(totals.paye).toLocaleString()}`} mono tone="warning" />
            <Stat label="NSSF (employee)" value={`KSh ${Math.round(totals.nssfEmployee).toLocaleString()}`} mono />
            <Stat label="SHA" value={`KSh ${Math.round(totals.shaEmployee).toLocaleString()}`} mono />
            <Stat label="AHL" value={`KSh ${Math.round(totals.ahlEmployee).toLocaleString()}`} mono />
            <Stat
              label="Net pay"
              value={`KSh ${Math.round(totals.netPay).toLocaleString()}`}
              mono
              tone="success"
            />
          </div>
        </CardContent>
      </Card>

      {/* Register */}
      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Employee</th>
                  <th className="px-5 py-2 text-right font-medium">Basic</th>
                  <th className="px-5 py-2 text-right font-medium">Allowances</th>
                  <th className="px-5 py-2 text-right font-medium">Gross</th>
                  <th className="px-5 py-2 text-right font-medium">PAYE</th>
                  <th className="px-5 py-2 text-right font-medium">NSSF</th>
                  <th className="px-5 py-2 text-right font-medium">SHA</th>
                  <th className="px-5 py-2 text-right font-medium">AHL</th>
                  <th className="px-5 py-2 text-right font-medium">Loan</th>
                  <th className="px-5 py-2 text-right font-medium">Other</th>
                  <th className="px-5 py-2 text-right font-medium">Net pay</th>
                  <th className="px-5 py-2 font-medium">Ccy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inputs.map((p) => {
                  const e = empById.get(p.employeeId);
                  const allowanceTotal = p.allowances.reduce((s, a) => s + a.amount, 0);
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2">
                        <Link
                          href={`/hr/payroll/${period.id}/${p.employeeId}`}
                          className="text-fg-primary group-hover:text-brand-blue"
                        >
                          <div>{e?.fullName ?? "—"}</div>
                          <div className="font-mono text-[10px] text-fg-tertiary">
                            {e?.employeeNumber} · {e?.jobTitle}
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {p.basicSalary.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {allowanceTotal.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-primary">
                        {p.grossPay.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-status-warning">
                        {p.paye.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {p.nssfEmployee.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {p.shaEmployee.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {p.ahlEmployee.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {p.loanRecovery > 0 ? p.loanRecovery.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                        {p.otherDeductions > 0 ? p.otherDeductions.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-mono tnum font-semibold text-status-success">
                        {p.netPay.toLocaleString()}
                      </td>
                      <td className="px-5 py-2 font-mono text-[10px] text-fg-tertiary">
                        {p.currency}
                      </td>
                    </tr>
                  );
                })}
                {inputs.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No payroll inputs in this period.
                    </td>
                  </tr>
                )}
                {inputs.length > 0 && (
                  <tr className="bg-bg-elevated">
                    <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">Total</td>
                    <td colSpan={2}></td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {Math.round(totals.grossPay).toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-status-warning">
                      {Math.round(totals.paye).toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-secondary">
                      {Math.round(totals.nssfEmployee).toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-secondary">
                      {Math.round(totals.shaEmployee).toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-secondary">
                      {Math.round(totals.ahlEmployee).toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-secondary">
                      {Math.round(totals.loanRecovery).toLocaleString()}
                    </td>
                    <td className="px-5 py-2"></td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-status-success">
                      {Math.round(totals.netPay).toLocaleString()}
                    </td>
                    <td className="px-5 py-2"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-fg-tertiary">
        <CalendarDays className="mr-1 inline size-3" />
        Indicative only — Kenyan PAYE / NSSF / SHA / AHL approximated. The external payroll
        provider performs the authoritative calculation. Export this register as CSV
        feed-in.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "info" | "success" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono tnum" : ""} text-base font-semibold ${colour}`}>
        {value}
      </div>
    </div>
  );
}
