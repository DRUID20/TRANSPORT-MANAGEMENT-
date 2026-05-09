import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { listComplianceRecords } from "@/server/actions/hr-compliance";
import { listEmployees } from "@/server/actions/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ComplianceStatusPill } from "@/components/hr/compliance-status-pill";
import {
  KIND_LABELS,
  complianceStatus,
  daysUntilExpiry,
  type ComplianceKind,
  type ComplianceStatus,
} from "@/lib/types/hr-compliance";
import { ComplianceFilters } from "./compliance-filters";

const VALID_KINDS: ComplianceKind[] = [
  "driving_licence",
  "medical_certificate",
  "passport",
  "comesa_permit",
  "training_certificate",
  "work_permit",
  "kra_pin",
  "national_id",
  "contract",
  "other",
];

const VALID_STATUS: ComplianceStatus[] = ["valid", "expiring_soon", "expired", "missing"];

export default async function HrCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string }>;
}) {
  const { kind: rawKind, status: rawStatus } = await searchParams;
  const kind = (VALID_KINDS as string[]).includes(rawKind ?? "")
    ? (rawKind as ComplianceKind)
    : undefined;
  const status = (VALID_STATUS as string[]).includes(rawStatus ?? "")
    ? (rawStatus as ComplianceStatus)
    : undefined;

  const all = await listComplianceRecords({ kind });
  const employees = await listEmployees();
  const empById = new Map(employees.map((e) => [e.id, e]));

  // Compute status per record + apply status filter
  const enriched = all.map((r) => ({
    ...r,
    status: complianceStatus(r.expiryDate),
    daysToExpiry: daysUntilExpiry(r.expiryDate),
    employee: empById.get(r.employeeId),
  }));
  const filtered = status ? enriched.filter((r) => r.status === status) : enriched;

  const counts = {
    expired: enriched.filter((r) => r.status === "expired").length,
    expiringSoon: enriched.filter((r) => r.status === "expiring_soon").length,
    valid: enriched.filter((r) => r.status === "valid").length,
    total: enriched.length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Compliance" }]}
        eyebrow="People · Compliance"
        title="HR Compliance"
        description="Driving licences, medicals, passports, COMESA permits, training certificates."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total records" value={counts.total} />
        <Stat label="Expired" value={counts.expired} tone="danger" />
        <Stat label="Expiring ≤ 30 d" value={counts.expiringSoon} tone="warning" />
        <Stat label="Valid" value={counts.valid} tone="success" />
      </div>

      <ComplianceFilters
        activeKind={kind ?? "all"}
        activeStatus={status ?? "all"}
      />

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Issued by</th>
                  <th className="px-5 py-3 font-medium">Expiry</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      {r.employee ? (
                        <Link
                          href={`/hr/employees/${r.employee.id}`}
                          className="text-fg-primary group-hover:text-brand-blue"
                        >
                          <div>{r.employee.fullName}</div>
                          <div className="font-mono text-[10px] text-fg-tertiary">
                            {r.employee.employeeNumber} · {r.employee.jobTitle}
                          </div>
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-fg-secondary">
                      <div>{KIND_LABELS[r.kind]}</div>
                      {r.label && <div className="text-[10px] text-fg-tertiary">{r.label}</div>}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-fg-secondary">
                      {r.number ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-fg-secondary">
                      {r.issuingAuthority ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] tnum">
                      {r.expiryDate ? (
                        <div>
                          <div className="text-fg-primary">{r.expiryDate}</div>
                          {r.daysToExpiry !== null && (
                            <div
                              className={
                                "text-[10px] " +
                                (r.daysToExpiry < 0
                                  ? "text-status-danger"
                                  : r.daysToExpiry <= 30
                                    ? "text-status-warning"
                                    : "text-fg-tertiary")
                              }
                            >
                              {r.daysToExpiry < 0
                                ? `${-r.daysToExpiry} d ago`
                                : `in ${r.daysToExpiry} d`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-fg-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <ComplianceStatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      <ShieldCheck className="mx-auto mb-2 size-8 text-fg-tertiary" />
                      No records match the filters.
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
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" :
    tone === "success" ? "text-status-success" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
