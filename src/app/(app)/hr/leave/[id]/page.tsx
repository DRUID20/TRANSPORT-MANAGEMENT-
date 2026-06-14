import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, MessageSquare, Paperclip, User } from "lucide-react";
import { getLeaveRequestById } from "@/server/actions/leave";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { LeaveStatusPill } from "@/components/hr/leave-status-pill";
import { LEAVE_TYPE_LABELS } from "@/lib/types/leave";
import { LeaveActions } from "./leave-actions";

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getLeaveRequestById(id);
  if (!r) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "HR", href: "/hr" },
          { label: "Leave", href: "/hr/leave" },
          { label: r.number },
        ]}
        eyebrow="Leave Request"
        title={r.number}
        description={r.employee ? `${r.employee.fullName} · ${r.employee.jobTitle}` : "—"}
        actions={<LeaveStatusPill status={r.status} />}
      />

      <Card>
        <CardContent className="!p-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat icon={User} label="Employee" value={r.employee?.fullName ?? "—"} />
            <Stat icon={CalendarDays} label="Type" value={LEAVE_TYPE_LABELS[r.leaveType]} />
            <Stat
              icon={CalendarDays}
              label="Period"
              value={`${r.startDate} → ${r.endDate}`}
              mono
            />
            <Stat
              icon={CalendarDays}
              label="Days"
              value={`${r.days} working day${r.days === 1 ? "" : "s"}`}
              tone="info"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-fg-tertiary" />
            Reason
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-fg-primary">{r.reason}</p>
        </CardContent>
      </Card>

      {r.attachmentUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="size-4 text-fg-tertiary" />
              Supporting document
            </CardTitle>
            <CardDescription>Stored privately in Supabase Storage.</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`/api/files/${r.attachmentUrl.split("/").map(encodeURIComponent).join("/")}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
            >
              <ExternalLink className="size-3.5" /> View attachment
            </a>
          </CardContent>
        </Card>
      )}

      <LeaveActions
        id={r.id}
        status={r.status}
      />

      {r.approvedAt && r.approver && (
        <Card>
          <CardHeader>
            <CardTitle>Decision</CardTitle>
            <CardDescription>
              {r.status === "rejected" ? "Rejected" : "Approved"} by {r.approver.fullName} on{" "}
              {new Date(r.approvedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          {r.rejectedReason && (
            <CardContent>
              <div className="rounded-md border border-status-danger/30 bg-status-danger/5 p-3 text-sm text-status-danger">
                <strong>Reason:</strong> {r.rejectedReason}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="text-center">
        <Link href="/hr/leave" className="text-sm text-fg-tertiary hover:text-fg-secondary">
          ← Back to Leave
        </Link>
      </div>
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
  tone?: "default" | "info";
}) {
  const colour = tone === "info" ? "text-brand-blue" : "text-fg-primary";
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
