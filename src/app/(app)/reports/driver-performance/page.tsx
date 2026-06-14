import Link from "next/link";
import { User } from "lucide-react";
import { driverPerformance } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportLetterhead } from "@/components/reports/report-letterhead";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";

export default async function DriverPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const rows = await driverPerformance({ fromDate, toDate });
  const active = rows.filter((r) => r.tripCount > 0);

  const totals = active.reduce(
    (acc, r) => {
      acc.trips += r.tripCount;
      acc.completed += r.completedTrips;
      acc.revenue += r.revenueKes;
      acc.breaches += r.ullageBreaches;
      return acc;
    },
    { trips: 0, completed: 0, revenue: 0, breaches: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Driver Performance" }]}
        eyebrow="Operations · Drivers"
        title="Driver Performance"
        description={`Trips, completion, revenue generated and ullage discipline per driver. ${fromDate} → ${toDate}.`}
        actions={
          <ReportExportMenu
            exportPath={`/api/reports/driver-performance/export?from=${fromDate}&to=${toDate}`}
          />
        }
      />

      <ReportLetterhead title="Driver Performance" period={`${fromDate} → ${toDate}`} />

      <Card>
        <CardContent className="!p-5">
          <form className="flex flex-wrap items-center gap-3">
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">From</label>
            <input
              type="date"
              name="from"
              defaultValue={fromDate}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm tnum"
            />
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">To</label>
            <input
              type="date"
              name="to"
              defaultValue={toDate}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm tnum"
            />
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Reload
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active drivers" value={active.length.toLocaleString()} />
        <Stat label="Trips" value={`${totals.completed}/${totals.trips}`} />
        <Stat label="Revenue generated" value={`KSh ${Math.round(totals.revenue).toLocaleString()}`} tone="info" />
        <Stat
          label="Ullage breaches"
          value={totals.breaches.toLocaleString()}
          tone={totals.breaches > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Driver</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Trips</th>
                  <th className="px-3 py-2 text-right font-medium">Completed</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Avg ullage</th>
                  <th className="px-3 py-2 text-right font-medium">Breaches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {active.map((r) => (
                  <tr key={r.driverId} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2">
                      <Link
                        href={`/drivers/${r.driverId}`}
                        className="inline-flex items-center gap-1.5 text-fg-primary hover:text-brand-blue"
                      >
                        <User className="size-3.5 text-fg-tertiary" />
                        {r.driverName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={r.status === "active" ? "success" : "neutral"}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">{r.tripCount}</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">{r.completedTrips}</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(r.revenueKes).toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum text-xs " +
                        (r.avgUllagePct === null
                          ? "text-fg-tertiary"
                          : Math.abs(r.avgUllagePct) > ULLAGE_ALERT_THRESHOLD_PCT
                            ? "text-status-danger"
                            : "text-status-success")
                      }
                    >
                      {r.avgUllagePct === null ? "—" : `${r.avgUllagePct.toFixed(2)}%`}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum " +
                        (r.ullageBreaches > 0 ? "text-status-danger" : "text-fg-tertiary")
                      }
                    >
                      {r.ullageBreaches > 0 ? r.ullageBreaches : "—"}
                    </td>
                  </tr>
                ))}
                {active.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No driver trips in this period.
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
  value: string;
  tone?: "default" | "info" | "success" | "danger";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>{value}</div>
    </div>
  );
}
