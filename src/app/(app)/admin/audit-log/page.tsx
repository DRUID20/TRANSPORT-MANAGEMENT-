import { History } from "lucide-react";
import { listAuditLog } from "@/server/actions/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  let rows: Awaited<ReturnType<typeof listAuditLog>>;
  try {
    rows = await listAuditLog();
  } catch (e) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Admin", href: "/settings" }, { label: "Audit log" }]}
          eyebrow="Admin"
          title="Audit Log"
          description="Forensic trail of high-trust mutations."
        />
        <Card>
          <CardContent className="!p-6">
            <p className="text-sm text-status-danger">
              {e instanceof Error ? e.message : "Permission denied"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Admin", href: "/settings" }, { label: "Audit log" }]}
        eyebrow="Admin"
        title="Audit Log"
        description={`Most recent ${rows.length} action${rows.length === 1 ? "" : "s"} captured (latest first).`}
      />
      {rows.length === 0 ? (
        <Card>
          <CardContent className="!p-6">
            <EmptyState
              icon={History}
              title="No audit entries yet"
              description="High-trust actions (invoice send/cancel, bill send/cancel, payments, journal post/reverse, loan create/cancel) are recorded here as they happen."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-fg-secondary">
                    <th className="px-5 py-2">When</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2 font-mono text-[11px] tnum text-fg-tertiary">
                        {new Date(r.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-fg-primary">{r.actorName ?? "—"}</div>
                        <div className="font-mono text-[10px] text-fg-tertiary">
                          {r.actorEmail ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={badgeFor(r.action)}>{r.action}</Badge>
                      </td>
                      <td className="px-3 py-2 text-fg-secondary">{r.entityType}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-fg-tertiary">
                        {r.entityId ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function badgeFor(action: string): "danger" | "warning" | "success" | "info" | "neutral" {
  if (action === "cancel" || action === "reverse") return "danger";
  if (action === "send" || action === "post") return "info";
  if (action === "create" || action === "pay") return "success";
  return "neutral";
}
