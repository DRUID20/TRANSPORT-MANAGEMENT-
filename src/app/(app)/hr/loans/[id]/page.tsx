import { notFound } from "next/navigation";
import { CalendarDays, Percent, User, Wallet } from "lucide-react";
import { getLoanById } from "@/server/actions/payroll";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LoanStatusPill } from "@/components/hr/loan-status-pill";
import { CancelLoanButton } from "./cancel-loan-button";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loan = await getLoanById(id);
  if (!loan) notFound();
  const progress =
    loan.principal > 0 ? Math.min(100, Math.round((loan.recovered / loan.principal) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Loans", href: "/hr/loans" },
          { label: loan.number },
        ]}
        eyebrow="Staff Loan"
        title={loan.number}
        description={
          loan.employee
            ? `${loan.employee.fullName} · ${loan.employee.jobTitle}`
            : "—"
        }
        actions={
          <>
            <LoanStatusPill status={loan.status} />
            {loan.status === "active" && <CancelLoanButton loanId={loan.id} />}
          </>
        }
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={User} label="Employee" value={loan.employee?.fullName ?? "—"} />
            <Stat icon={CalendarDays} label="Disbursed" value={loan.disbursedDate} mono />
            <Stat
              icon={Wallet}
              label="Principal"
              value={`${loan.principal.toLocaleString()} ${loan.currency}`}
              mono
            />
            <Stat
              icon={Percent}
              label="Interest p.a."
              value={`${(loan.interestRate * 100).toFixed(2)}%`}
              mono
            />
            <Stat label="Term" value={`${loan.termMonths} months`} />
            <Stat
              label="Monthly recovery"
              value={`${loan.monthlyRecovery.toLocaleString()} ${loan.currency}`}
              mono
            />
            <Stat
              label="Recovered"
              value={`${loan.recovered.toLocaleString()} ${loan.currency}`}
              tone="success"
              mono
            />
            <Stat
              label="Outstanding"
              value={`${loan.balance.toLocaleString()} ${loan.currency}`}
              tone="warning"
              mono
            />
          </div>

          {loan.principal > 0 && (
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-[11px] text-fg-tertiary">
                <span>Recovery progress</span>
                <span className="font-mono tnum">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-base ring-1 ring-border">
                <div
                  className="h-full bg-gradient-to-r from-status-success to-brand-blue"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loan.reason && (
        <Card>
          <CardHeader>
            <CardTitle>Reason</CardTitle>
            <CardDescription>{loan.reason}</CardDescription>
          </CardHeader>
        </Card>
      )}
      {loan.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{loan.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  mono = false,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "success" | "warning";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        {Icon ? <Icon className="size-3" /> : null} {label}
      </div>
      <div className={`mt-1 text-base font-medium ${colour} ${mono ? "font-mono tnum" : ""}`}>
        {value}
      </div>
    </div>
  );
}
