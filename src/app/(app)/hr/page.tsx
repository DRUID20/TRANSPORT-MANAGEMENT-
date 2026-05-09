import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  GraduationCap,
  Plus,
  KeyRound,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { listContracts, listDepartments, listEmployees } from "@/server/actions/hr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export default async function HrIndexPage() {
  const employees = await listEmployees();
  const departments = await listDepartments();
  const contracts = await listContracts({ status: "active" });

  const active = employees.filter((e) => e.status === "active").length;
  const probation = employees.filter((e) => e.status === "probation").length;
  const onLeave = employees.filter((e) => e.status === "on_leave").length;

  // Total monthly payroll cost in KES (sum of basic + allowances of active contracts)
  const monthlyPayrollKes = contracts
    .filter((c) => c.currency === "KES")
    .reduce(
      (s, c) =>
        s + c.basicSalary + c.allowances.reduce((a, x) => a + x.amount, 0),
      0,
    );

  const tiles = [
    {
      href: "/hr/employees",
      label: "Employees",
      icon: Users,
      desc: "Master register of all staff (drivers + office).",
      count: employees.length,
    },
    {
      href: "/hr/departments",
      label: "Departments",
      icon: Building2,
      desc: "Organisation structure + cost centres.",
      count: departments.length,
    },
    {
      href: "/hr/compliance",
      label: "Compliance",
      icon: ShieldCheck,
      desc: "Driving licences, medicals, passports, COMESA permits, training certs.",
      count: undefined,
    },
    {
      href: "/hr/leave",
      label: "Leave & Attendance",
      icon: CalendarRange,
      desc: "Annual / sick / compassionate leave + attendance grid.",
      count: undefined,
    },
    {
      href: "/hr/payroll",
      label: "Payroll Inputs",
      icon: Wallet,
      desc: "Per-period payroll inputs + statutory deductions + CSV export to external provider.",
      count: undefined,
    },
    {
      href: "/hr/loans",
      label: "Salaries & Loans",
      icon: Wallet,
      desc: "Staff loans + auto-recovery on each Paid payroll period.",
      count: undefined,
    },
    {
      href: "/hr/appraisals",
      label: "Performance",
      icon: GraduationCap,
      desc: "Annual appraisal cycle. Goals + competencies + 3-stage signoff.",
      count: undefined,
    },
    {
      href: "/hr/permissions",
      label: "Job-Description Permissions",
      icon: KeyRound,
      desc: "JD-driven RBAC — each role activates specific screens.",
      count: undefined,
      soon: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="People"
        title="Human Resources"
        description="Employee master, contracts, leave, payroll, appraisal, JD-based permissions."
        actions={
          <Button asChild>
            <Link href="/hr/employees/new">
              <Plus className="size-4" />
              New Employee
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active" value={active} tone="success" />
        <Stat label="Probation" value={probation} tone="info" />
        <Stat label="On leave" value={onLeave} tone="warning" />
        <Stat
          label="Monthly payroll (KES)"
          value={`KSh ${monthlyPayrollKes.toLocaleString()}`}
          tone="info"
          mono
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          const Wrap = ({ children }: { children: React.ReactNode }) =>
            t.soon ? (
              <div className="block opacity-60">{children}</div>
            ) : (
              <Link href={t.href} className="group block">
                {children}
              </Link>
            );
          return (
            <Wrap key={t.href}>
              <Card className="transition-all group-hover:border-border-strong group-hover:shadow-soft">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
                      <Icon className="size-5" />
                    </div>
                    {t.soon ? (
                      <Badge variant="neutral">Soon</Badge>
                    ) : t.count !== undefined ? (
                      <span className="font-mono tnum text-xs text-fg-tertiary">
                        {t.count}
                      </span>
                    ) : null}
                  </div>
                  <CardTitle className="mt-3 group-hover:text-brand-blue">{t.label}</CardTitle>
                  <CardDescription>{t.desc}</CardDescription>
                </CardHeader>
                {!t.soon && (
                  <CardContent className="pt-0">
                    <span className="inline-flex items-center gap-1 text-xs text-fg-tertiary group-hover:text-brand-blue">
                      Open
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                )}
              </Card>
            </Wrap>
          );
        })}
      </div>
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
  tone?: "default" | "info" | "success" | "danger" | "warning";
  mono?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum" : ""} text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
