import Link from "next/link";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import {
  listPayrollPeriods,
  payrollTotals,
} from "@/server/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollStatusPill } from "@/components/hr/payroll-status-pill";

export default async function PayrollIndexPage() {
  const periods = await listPayrollPeriods();
  const periodsWithTotals = await Promise.all(
    periods.map(async (p) => ({ p, totals: await payrollTotals(p.id) })),
  );

  // Aggregate latest period stats
  const latest = periodsWithTotals[0];
  const latestNet = latest?.totals.netPay ?? 0;
  const latestGross = latest?.totals.grossPay ?? 0;
  const latestPaye = latest?.totals.paye ?? 0;
  const latestEmployerCost = latest?.totals.employerCost ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Payroll" }]}
        eyebrow="People · Payroll"
        title="Payroll Periods"
        description="Captures payroll INPUTS for an external provider; computes indicative Kenyan PAYE / NSSF / SHA / NITA / AHL."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/hr/loans">
                <Wallet className="size-4" />
                Loans
              </Link>
            </Button>
            <Button asChild>
              <Link href="/hr/payroll/new">
                <Plus className="size-4" />
                New Period
              </Link>
            </Button>
          </>
        }
      />

      {latest && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            label={`Gross (${latest.p.yearMonth})`}
            value={`KSh ${Math.round(latestGross).toLocaleString()}`}
            tone="info"
            mono
          />
          <Stat
            label="PAYE"
            value={`KSh ${Math.round(latestPaye).toLocaleString()}`}
            tone="warning"
            mono
          />
          <Stat
            label="Net pay"
            value={`KSh ${Math.round(latestNet).toLocaleString()}`}
            tone="success"
            mono
          />
          <Stat
            label="Employer cost"
            value={`KSh ${Math.round(latestEmployerCost).toLocaleString()}`}
            mono
          />
        </div>
      )}

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Headcount</th>
                  <th className="px-5 py-3 text-right font-medium">Gross</th>
                  <th className="px-5 py-3 text-right font-medium">PAYE</th>
                  <th className="px-5 py-3 text-right font-medium">Net pay</th>
                  <th className="px-5 py-3 text-right font-medium">Employer cost</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periodsWithTotals.map(({ p, totals }) => (
                  <tr key={p.id} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/hr/payroll/${p.id}`}
                        className="font-mono text-sm text-fg-primary group-hover:text-brand-blue"
                      >
                        {p.yearMonth}
                      </Link>
                      <div className="font-mono text-[10px] tnum text-fg-tertiary">
                        {p.startDate} → {p.endDate}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <PayrollStatusPill status={p.status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {totals.count}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-primary">
                      {Math.round(totals.grossPay).toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-status-warning">
                      {Math.round(totals.paye).toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-status-success">
                      {Math.round(totals.netPay).toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {Math.round(totals.employerCost).toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5">
                      <ArrowRight className="size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
                    </td>
                  </tr>
                ))}
                {periodsWithTotals.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No payroll periods yet.
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
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "info" | "success" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
