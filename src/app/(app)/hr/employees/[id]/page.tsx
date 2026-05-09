import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  IdCard,
  Mail,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { getEmployeeById } from "@/server/actions/hr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { EmployeeStatusPill } from "@/components/hr/employee-status-pill";
import { EmployeeComplianceCard } from "@/components/hr/employee-compliance-card";
import { EmployeeLeaveCard } from "@/components/hr/employee-leave-card";
import { EmployeePayrollCard } from "@/components/hr/employee-payroll-card";
import { EmployeeAppraisalCard } from "@/components/hr/employee-appraisal-card";
import { EmployeeJdCard } from "@/components/hr/employee-jd-card";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await getEmployeeById(id);
  if (!e) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Employees", href: "/hr/employees" },
          { label: e.fullName },
        ]}
        eyebrow={`${e.employeeNumber} · ${e.department?.name ?? "—"}`}
        title={e.fullName}
        description={e.jobTitle}
        actions={
          <>
            <EmployeeStatusPill status={e.status} />
            {e.driver && <Badge variant="info">Driver</Badge>}
          </>
        }
      />

      {/* Profile + employment quick facts */}
      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={IdCard} label="National ID" value={e.nationalId} mono />
            <Stat icon={IdCard} label="KRA PIN" value={e.kraPin ?? "—"} mono />
            <Stat icon={Building2} label="Department" value={e.department?.name ?? "—"} />
            <Stat icon={Briefcase} label="Job title" value={e.jobTitle} />
            <Stat icon={CalendarDays} label="Hire date" value={e.hireDate} mono />
            <Stat
              icon={User}
              label="Reports to"
              value={e.lineManager?.fullName ?? "—"}
              href={e.lineManager ? `/hr/employees/${e.lineManager.id}` : undefined}
            />
            {e.driver && (
              <Stat
                icon={Truck}
                label="Driver record"
                value={`Licence ${e.driver.licenceClass}`}
                href={`/drivers/${e.driver.id}`}
              />
            )}
            {e.monthlyCost && (
              <Stat
                icon={Banknote}
                label="Monthly cost"
                value={`${e.monthlyCost.total.toLocaleString()} ${e.monthlyCost.currency}`}
                mono
                tone="info"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <dl className="divide-y divide-border text-sm">
              <Row icon={Phone} label="M-Pesa phone" value={e.mpesaPhone} mono />
              {e.alternatePhone && (
                <Row icon={Phone} label="Alternate phone" value={e.alternatePhone} mono />
              )}
              {e.email && (
                <Row icon={Mail} label="Email" value={e.email} />
              )}
              {e.physicalAddress && (
                <Row icon={Building2} label="Address" value={e.physicalAddress} />
              )}
              {e.emergencyContactName && (
                <Row
                  icon={User}
                  label="Emergency contact"
                  value={`${e.emergencyContactName} (${e.emergencyContactRelationship ?? "—"}) · ${e.emergencyContactPhone ?? ""}`}
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Statutory + Bank */}
        <Card>
          <CardHeader>
            <CardTitle>Statutory & Banking</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            <dl className="divide-y divide-border text-sm">
              <Row icon={IdCard} label="NSSF No" value={e.nssfNo ?? "—"} mono />
              <Row icon={IdCard} label="SHA No" value={e.shaNo ?? "—"} mono />
              {e.bankName && (
                <>
                  <Row icon={CreditCard} label="Bank" value={`${e.bankName}${e.bankBranch ? ` — ${e.bankBranch}` : ""}`} />
                  <Row
                    icon={CreditCard}
                    label="Account"
                    value={`${e.bankAccountNo ?? "—"}${e.bankAccountName ? ` — ${e.bankAccountName}` : ""}`}
                    mono
                  />
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Active contract */}
      <Card>
        <CardHeader>
          <CardTitle>Employment contract</CardTitle>
          <CardDescription>
            {e.activeContract
              ? `${typeLabel(e.activeContract.type)} · ${e.activeContract.payFrequency} · since ${e.activeContract.startDate}`
              : "No active contract on file."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {e.activeContract ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  icon={Banknote}
                  label="Basic salary"
                  value={`${e.activeContract.basicSalary.toLocaleString()} ${e.activeContract.currency}`}
                  mono
                />
                <Stat
                  icon={Banknote}
                  label="Allowances total"
                  value={`${e.activeContract.allowances
                    .reduce((s, a) => s + a.amount, 0)
                    .toLocaleString()} ${e.activeContract.currency}`}
                  mono
                />
                <Stat
                  icon={CalendarDays}
                  label={e.activeContract.endDate ? "End date" : "Notice period"}
                  value={
                    e.activeContract.endDate
                      ? e.activeContract.endDate
                      : `${e.activeContract.noticePeriodDays} days`
                  }
                  mono
                />
              </div>
              {e.activeContract.allowances.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-fg-tertiary">
                    Allowances
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {e.activeContract.allowances.map((a, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-border bg-bg-base/40 px-3 py-1.5 text-xs"
                      >
                        <span className="text-fg-primary">{a.name}</span>
                        {" · "}
                        <span className="font-mono tnum text-fg-secondary">
                          {a.amount.toLocaleString()} {e.activeContract!.currency}
                        </span>
                        <span
                          className={
                            "ml-1 text-[10px] " +
                            (a.taxable ? "text-status-warning" : "text-status-success")
                          }
                        >
                          {a.taxable ? "(taxable)" : "(non-taxable)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-fg-tertiary">
              No contract on file. Contracts will be addable in Phase 6 (HR forms).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contract history */}
      {e.contracts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Contract history</CardTitle>
            <CardDescription>{e.contracts.length} total contracts</CardDescription>
          </CardHeader>
          <CardContent className="!p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Type</th>
                  <th className="px-5 py-2 font-medium">Period</th>
                  <th className="px-5 py-2 text-right font-medium">Basic salary</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {e.contracts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2 capitalize text-fg-primary">{typeLabel(c.type)}</td>
                    <td className="px-5 py-2 font-mono text-[11px] tnum text-fg-secondary">
                      {c.startDate} → {c.endDate ?? "—"}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum text-fg-secondary">
                      {c.basicSalary.toLocaleString()} {c.currency}
                    </td>
                    <td className="px-5 py-2">
                      {c.status === "active" ? (
                        <Badge variant="success" dot>Active</Badge>
                      ) : c.status === "expired" ? (
                        <Badge variant="warning">Expired</Badge>
                      ) : c.status === "terminated" ? (
                        <Badge variant="danger">Terminated</Badge>
                      ) : (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Compliance (Phase 6B) */}
      <EmployeeComplianceCard employeeId={e.id} />

      {/* Leave (Phase 6C) */}
      <EmployeeLeaveCard employeeId={e.id} />

      {/* Payroll & Loans (Phase 6D) */}
      <EmployeePayrollCard employeeId={e.id} />

      {/* Performance (Phase 6E) */}
      <EmployeeAppraisalCard employeeId={e.id} />

      {/* JD & Permissions (Phase 6F) */}
      <EmployeeJdCard employeeId={e.id} />

      {e.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{e.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function typeLabel(t: string) {
  return t.replace("_", " ");
}

function Stat({
  icon: Icon,
  label,
  value,
  mono = false,
  tone = "default",
  href,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "info" | "success" | "danger" | "warning";
  href?: string;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </div>
      <div className={`mt-1 text-base font-medium ${colour} ${mono ? "font-mono tnum" : ""}`}>
        {value}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="hover:text-brand-blue">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-2.5">
      <Icon className="mt-0.5 size-3.5 text-fg-tertiary" />
      <div className="flex-1">
        <dt className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</dt>
        <dd className={`mt-0.5 text-fg-primary ${mono ? "font-mono tnum text-xs" : ""}`}>
          {value}
        </dd>
      </div>
    </div>
  );
}
