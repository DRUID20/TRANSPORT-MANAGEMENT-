import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { listLoans } from "@/server/actions/payroll";
import { listEmployees } from "@/server/actions/hr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LoanStatusPill } from "@/components/hr/loan-status-pill";

export default async function LoansPage() {
  const loans = await listLoans();
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));

  const active = loans.filter((l) => l.status === "active");
  const totalBalance = active.reduce((s, l) => s + l.balance, 0);
  const totalPrincipal = active.reduce((s, l) => s + l.principal, 0);
  const recovered = active.reduce((s, l) => s + l.recovered, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Loans" }]}
        eyebrow="People · Salaries & Loans"
        title="Staff Loans"
        description="Salary advances and loans to staff. Recoveries auto-apply when a payroll period is marked Paid."
        actions={
          <Button asChild>
            <Link href="/hr/loans/new">
              <Plus className="size-4" />
              New Loan
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active loans" value={active.length} tone="info" />
        <Stat
          label="Total principal"
          value={`KSh ${totalPrincipal.toLocaleString()}`}
          mono
        />
        <Stat
          label="Recovered"
          value={`KSh ${recovered.toLocaleString()}`}
          tone="success"
          mono
        />
        <Stat
          label="Outstanding"
          value={`KSh ${totalBalance.toLocaleString()}`}
          tone="warning"
          mono
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Loan</th>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Disbursed</th>
                  <th className="px-5 py-3 text-right font-medium">Principal</th>
                  <th className="px-5 py-3 text-right font-medium">Monthly</th>
                  <th className="px-5 py-3 text-right font-medium">Recovered</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loans.map((l) => {
                  const e = empById.get(l.employeeId);
                  return (
                    <tr key={l.id} className="group transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/hr/loans/${l.id}`}
                          className="flex items-center gap-2"
                        >
                          <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                            <Wallet className="size-3.5 text-fg-tertiary" />
                          </span>
                          <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                            {l.number}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        {e ? (
                          <Link
                            href={`/hr/employees/${e.id}`}
                            className="text-fg-primary hover:text-brand-blue"
                          >
                            <div>{e.fullName}</div>
                            <div className="font-mono text-[10px] text-fg-tertiary">
                              {e.employeeNumber}
                            </div>
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[11px] tnum text-fg-secondary">
                        {l.disbursedDate}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                        {l.principal.toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                        {l.monthlyRecovery.toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum text-status-success">
                        {l.recovered.toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tnum font-semibold text-status-warning">
                        {l.balance.toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5">
                        <LoanStatusPill status={l.status} />
                      </td>
                    </tr>
                  );
                })}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No loans on file.
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
  value: string | number;
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
