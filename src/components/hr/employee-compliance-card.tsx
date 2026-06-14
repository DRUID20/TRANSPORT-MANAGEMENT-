import { ExternalLink, ShieldCheck } from "lucide-react";
import { listComplianceRecords } from "@/server/actions/hr-compliance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceStatusPill } from "@/components/hr/compliance-status-pill";
import { AddComplianceForm } from "@/components/hr/add-compliance-form";
import {
  KIND_LABELS,
  complianceStatus,
  daysUntilExpiry,
} from "@/lib/types/hr-compliance";

export async function EmployeeComplianceCard({ employeeId }: { employeeId: string }) {
  const records = await listComplianceRecords({ employeeId });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-fg-tertiary" />
              Compliance
            </CardTitle>
            <CardDescription>
              {records.length === 0
                ? "No compliance records on file."
                : `${records.length} document${records.length === 1 ? "" : "s"} tracked. Stored privately in Supabase Storage.`}
            </CardDescription>
          </div>
          <AddComplianceForm employeeId={employeeId} />
        </div>
      </CardHeader>
      {records.length > 0 && (
        <CardContent className="!p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                <th className="px-5 py-2 font-medium">Document</th>
                <th className="px-5 py-2 font-medium">Number</th>
                <th className="px-5 py-2 font-medium">Expiry</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => {
                const status = complianceStatus(r.expiryDate);
                const days = daysUntilExpiry(r.expiryDate);
                const fileHref =
                  r.attachmentUrl &&
                  `/api/files/${r.attachmentUrl.split("/").map(encodeURIComponent).join("/")}`;
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-2 text-fg-primary">
                      <div>{KIND_LABELS[r.kind]}</div>
                      {r.label && <div className="text-[10px] text-fg-tertiary">{r.label}</div>}
                    </td>
                    <td className="px-5 py-2 font-mono text-[11px] text-fg-secondary">
                      {r.number ?? "—"}
                    </td>
                    <td className="px-5 py-2 font-mono text-[11px] tnum">
                      {r.expiryDate ? (
                        <div>
                          <div className="text-fg-primary">{r.expiryDate}</div>
                          {days !== null && (
                            <div
                              className={
                                "text-[10px] " +
                                (days < 0
                                  ? "text-status-danger"
                                  : days <= 30
                                    ? "text-status-warning"
                                    : "text-fg-tertiary")
                              }
                            >
                              {days < 0 ? `${-days} d ago` : `in ${days} d`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-fg-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2">
                      <ComplianceStatusPill status={status} />
                    </td>
                    <td className="px-5 py-2">
                      {fileHref ? (
                        <a
                          href={fileHref}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
                        >
                          <ExternalLink className="size-3" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-fg-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}
