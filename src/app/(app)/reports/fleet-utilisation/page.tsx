import Link from "next/link";
import { Download, Truck } from "lucide-react";
import { fleetUtilisation } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

export default async function FleetUtilisationPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const rows = await fleetUtilisation({ fromDate, toDate });

  const totals = rows.reduce(
    (acc, r) => {
      acc.trips += r.tripCount;
      acc.km += r.kmDriven;
      acc.revenue += r.revenueKes;
      acc.fuel += r.fuelKes;
      acc.expenses += r.expensesKes;
      acc.profit += r.grossProfitKes;
      return acc;
    },
    { trips: 0, km: 0, revenue: 0, fuel: 0, expenses: 0, profit: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Fleet Utilisation" }]}
        eyebrow="Operations · Fleet"
        title="Fleet Utilisation"
        description={`Per-truck trips, KM, revenue, costs and profit. ${fromDate} → ${toDate}. KES base.`}
        actions={
          <Link
            href={`/api/reports/fleet-utilisation/export?from=${fromDate}&to=${toDate}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
          >
            <Download className="size-3.5" /> CSV
          </Link>
        }
      />

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <Stat label="Trucks" value={rows.length.toLocaleString()} />
        <Stat label="Trips" value={totals.trips.toLocaleString()} />
        <Stat label="KM driven" value={totals.km.toLocaleString()} />
        <Stat label="Revenue" value={`KSh ${Math.round(totals.revenue).toLocaleString()}`} tone="info" />
        <Stat label="Costs" value={`KSh ${Math.round(totals.fuel + totals.expenses).toLocaleString()}`} tone="warning" />
        <Stat
          label="Gross profit"
          value={`KSh ${Math.round(totals.profit).toLocaleString()}`}
          tone={totals.profit >= 0 ? "success" : "danger"}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Truck</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Trips</th>
                  <th className="px-3 py-2 text-right font-medium">KM</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Fuel</th>
                  <th className="px-3 py-2 text-right font-medium">Expenses</th>
                  <th className="px-3 py-2 text-right font-medium">Gross profit</th>
                  <th className="px-3 py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.truckId} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2">
                      <Link
                        href={`/trucks/${r.truckId}`}
                        className="inline-flex items-center gap-1.5 text-fg-primary hover:text-brand-blue"
                      >
                        <Truck className="size-3.5 text-fg-tertiary" />
                        <span className="font-mono tnum text-xs">{r.registration}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={r.status === "active" ? "success" : "neutral"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.tripCount}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.kmDriven.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(r.revenueKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                      {Math.round(r.fuelKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {Math.round(r.expensesKes).toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum font-semibold " +
                        (r.grossProfitKes >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {Math.round(r.grossProfitKes).toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum text-xs " +
                        (r.marginPct === null
                          ? "text-fg-tertiary"
                          : r.marginPct >= 0
                            ? "text-status-success"
                            : "text-status-danger")
                      }
                    >
                      {r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trucks match the range.
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
  tone?: "default" | "info" | "warning" | "success" | "danger";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>{value}</div>
    </div>
  );
}
