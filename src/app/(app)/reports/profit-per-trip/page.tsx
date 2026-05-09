import Link from "next/link";
import { tripProfitability } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TripStatusPill } from "@/components/trips/trip-status-pill";
import type { TripStatus } from "@/lib/types/trips";

export default async function ProfitPerTripPage() {
  const rows = await tripProfitability();

  const totalRevenue = rows.reduce((s, r) => s + r.revenueKes, 0);
  const totalCosts = rows.reduce((s, r) => s + r.totalCostsKes, 0);
  const totalProfit = totalRevenue - totalCosts;
  const overallMargin = totalRevenue > 0 ? totalProfit / totalRevenue : null;
  const profitable = rows.filter((r) => r.grossProfitKes > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Profit per Trip" }]}
        eyebrow="Finance"
        title="Profit per Trip"
        description="Revenue from invoices minus border charges + driver advance + expenses + fuel — per trip in KES."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Trips" value={rows.length} />
        <Stat label="Profitable" value={profitable} tone="success" />
        <Stat
          label="Total profit (KES)"
          value={`KSh ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          tone={totalProfit >= 0 ? "success" : "danger"}
          mono
        />
        <Stat
          label="Overall margin"
          value={overallMargin !== null ? (overallMargin * 100).toFixed(1) + "%" : "—"}
          tone={overallMargin && overallMargin > 0 ? "success" : "warning"}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Trip</th>
                  <th className="px-5 py-2 font-medium">Route</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 text-right font-medium">Revenue</th>
                  <th className="px-5 py-2 text-right font-medium">Border</th>
                  <th className="px-5 py-2 text-right font-medium">Advance used</th>
                  <th className="px-5 py-2 text-right font-medium">Expenses</th>
                  <th className="px-5 py-2 text-right font-medium">Fuel</th>
                  <th className="px-5 py-2 text-right font-medium">Profit</th>
                  <th className="px-5 py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.tripId} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/trips/${r.tripId}`}
                        className="font-mono text-xs font-medium text-fg-primary hover:text-brand-blue"
                      >
                        {r.number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-fg-secondary">
                      {r.origin} → {r.destination}
                    </td>
                    <td className="px-5 py-2.5">
                      <TripStatusPill status={r.status as TripStatus} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-status-success">
                      {r.revenueKes ? r.revenueKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {r.borderChargesKes ? r.borderChargesKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {r.driverAdvanceUsedKes ? r.driverAdvanceUsedKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {r.expensesKes ? r.expensesKes.toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono tnum text-fg-secondary">
                      {r.fuelKes ? r.fuelKes.toLocaleString() : "—"}
                    </td>
                    <td
                      className={
                        "px-5 py-2.5 text-right font-mono tnum font-semibold " +
                        (r.grossProfitKes >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {r.grossProfitKes.toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-5 py-2.5 text-right font-mono tnum text-xs " +
                        (r.marginPct === null
                          ? "text-fg-tertiary"
                          : r.marginPct >= 0
                            ? "text-status-success"
                            : "text-status-danger")
                      }
                    >
                      {r.marginPct === null ? "—" : (r.marginPct * 100).toFixed(1) + "%"}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trips with cost data yet.
                    </td>
                  </tr>
                )}
                {rows.length > 0 && (
                  <tr className="bg-bg-elevated">
                    <td colSpan={3} className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                      Total
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-status-success">
                      {totalRevenue.toLocaleString()}
                    </td>
                    <td colSpan={4}></td>
                    <td
                      className={
                        "px-5 py-2 text-right font-mono tnum font-semibold " +
                        (totalProfit >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {totalProfit.toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right font-mono tnum font-semibold text-fg-secondary">
                      {overallMargin !== null ? (overallMargin * 100).toFixed(1) + "%" : "—"}
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
  mono = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "danger" | "warning";
  mono?: boolean;
}) {
  const colour =
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
