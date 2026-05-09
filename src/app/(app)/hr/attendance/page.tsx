import Link from "next/link";
import { listAttendance } from "@/server/actions/leave";
import { listEmployees } from "@/server/actions/hr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import type { AttendanceStatus } from "@/lib/types/leave";

const dayMs = 24 * 60 * 60 * 1000;

const statusBadge: Record<AttendanceStatus, { label: string; color: string }> = {
  present:        { label: "P",   color: "bg-status-success/15 text-status-success ring-status-success/30" },
  absent:         { label: "A",   color: "bg-status-danger/15 text-status-danger ring-status-danger/30" },
  on_leave:       { label: "L",   color: "bg-status-warning/15 text-status-warning ring-status-warning/30" },
  public_holiday: { label: "H",   color: "bg-brand-blue/15 text-brand-blue ring-brand-blue/30" },
  weekend:        { label: "—",   color: "bg-bg-base text-fg-tertiary ring-border" },
  sick:           { label: "S",   color: "bg-status-danger/15 text-status-danger ring-status-danger/30" },
  half_day:       { label: "½",   color: "bg-status-warning/15 text-status-warning ring-status-warning/30" },
};

export default async function AttendancePage() {
  const employees = (await listEmployees({ status: "active" })).filter((e) => !e.driverId);
  const today = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * dayMs);
    days.push(d.toISOString().slice(0, 10));
  }
  const fromDate = days[0]!;
  const toDate = days[days.length - 1]!;
  const allRecords = await listAttendance({ fromDate, toDate });

  // index by employee × date
  const lookup = new Map<string, AttendanceStatus>();
  for (const r of allRecords) {
    lookup.set(`${r.employeeId}|${r.date}`, r.status);
  }

  // Aggregate stats
  const totalCells = employees.length * days.length;
  const presentCells = allRecords.filter((r) => r.status === "present").length;
  const sickCells = allRecords.filter((r) => r.status === "sick").length;
  const halfDays = allRecords.filter((r) => r.status === "half_day").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Attendance" }]}
        eyebrow="People · Attendance"
        title="Attendance — last 7 days"
        description="Office staff. Drivers are tracked through trip status. Click a row to see employee detail."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Days × people" value={totalCells} />
        <Stat label="Present" value={presentCells} tone="success" />
        <Stat label="Sick" value={sickCells} tone="danger" />
        <Stat label="Half days" value={halfDays} tone="warning" />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Employee</th>
                  {days.map((d) => {
                    const dt = new Date(d);
                    const dow = dt.toLocaleDateString(undefined, { weekday: "short" });
                    return (
                      <th key={d} className="px-2 py-2 text-center font-medium">
                        <div className="text-fg-primary">{dow}</div>
                        <div className="font-mono text-[9px] tnum text-fg-tertiary">
                          {d.slice(5)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/hr/employees/${e.id}`}
                        className="text-fg-primary hover:text-brand-blue"
                      >
                        <div>{e.fullName}</div>
                        <div className="font-mono text-[10px] text-fg-tertiary">
                          {e.employeeNumber}
                        </div>
                      </Link>
                    </td>
                    {days.map((d) => {
                      const status = lookup.get(`${e.id}|${d}`);
                      const cfg = status ? statusBadge[status] : statusBadge.absent;
                      return (
                        <td key={d} className="px-2 py-2.5 text-center">
                          <span
                            className={
                              "inline-flex size-7 items-center justify-center rounded-md font-mono text-[11px] font-semibold ring-1 " +
                              cfg.color
                            }
                            title={status ?? "no record"}
                          >
                            {cfg.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 1} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No office staff to display.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-bg-base/40 px-5 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-fg-tertiary">
              <span>Legend:</span>
              <Legend label="P Present" cls={statusBadge.present.color} />
              <Legend label="S Sick" cls={statusBadge.sick.color} />
              <Legend label="L On leave" cls={statusBadge.on_leave.color} />
              <Legend label="½ Half day" cls={statusBadge.half_day.color} />
              <Legend label="H Holiday" cls={statusBadge.public_holiday.color} />
              <Legend label="A Absent" cls={statusBadge.absent.color} />
              <Legend label="— Weekend" cls={statusBadge.weekend.color} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ label, cls }: { label: string; cls: string }) {
  const [letter, ...rest] = label.split(" ");
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={
          "inline-flex size-5 items-center justify-center rounded-md font-mono text-[10px] font-semibold ring-1 " +
          cls
        }
      >
        {letter}
      </span>
      <span>{rest.join(" ")}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
