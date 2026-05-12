import Link from "next/link";
import { Droplet } from "lucide-react";
import { ullageReport, ullageSummary } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";

/**
 * Ullage report (F-6). Lists every trip with both loading and discharge
 * observations captured, sorted worst-loss-first. Above the table the
 * fleet summary shows total loaded vs discharged litres and the
 * weighted-average ullage % across the period.
 */
export default async function UllageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;

  const [rows, summary] = await Promise.all([
    ullageReport({ fromDate, toDate }),
    ullageSummary({ fromDate, toDate }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Ullage" }]}
        eyebrow="Operations · Fuel"
        title="Ullage report"
        description={`Loaded vs discharged litres (@ 20 °C) per trip. Threshold ${ULLAGE_ALERT_THRESHOLD_PCT}%. ${fromDate} → ${toDate}.`}
      />

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Trips measured" value={String(summary.tripCount)} />
        <Tile
          label={`Above ${ULLAGE_ALERT_THRESHOLD_PCT}%`}
          value={String(summary.tripsAboveThreshold)}
          tone={summary.tripsAboveThreshold > 0 ? "danger" : "default"}
        />
        <Tile
          label="Total loaded"
          value={`${summary.totalLoadedLitres.toLocaleString()} L`}
          mono
        />
        <Tile
          label="Total delivered"
          value={`${summary.totalDischargedLitres.toLocaleString()} L`}
          mono
        />
        <Tile
          label="Fleet ullage"
          value={
            summary.tripCount === 0
              ? "—"
              : `${summary.fleetUllagePct >= 0 ? "" : "+"}${(-summary.fleetUllagePct).toFixed(2)} %`
          }
          tone={
            summary.tripCount === 0
              ? "default"
              : Math.abs(summary.fleetUllagePct) <= ULLAGE_ALERT_THRESHOLD_PCT
                ? "success"
                : "danger"
          }
          mono
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Trip</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Truck / Driver</th>
                  <th className="px-5 py-3 text-right font-medium">Loaded</th>
                  <th className="px-5 py-3 text-right font-medium">Delivered</th>
                  <th className="px-5 py-3 text-right font-medium">Net</th>
                  <th className="px-5 py-3 text-right font-medium">Ullage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr
                    key={r.tripId}
                    className="group transition-colors hover:bg-bg-base/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/trips/${r.tripId}`}
                        className="flex flex-col leading-tight"
                      >
                        <span className="font-mono text-xs font-medium text-fg-primary group-hover:text-brand-blue">
                          {r.tripNumber}
                        </span>
                        {r.product && (
                          <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                            <Droplet className="mr-0.5 inline size-2.5" />
                            {r.product}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      <span className="text-fg-primary">{r.origin}</span>
                      <span className="text-fg-tertiary"> → </span>
                      <span className="text-fg-primary">{r.destination}</span>
                      {r.customerName && (
                        <div className="text-[11px] text-fg-tertiary">
                          {r.customerName}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-fg-secondary">
                      <span className="font-mono text-xs text-fg-primary">
                        {r.truckRegistration ?? "—"}
                      </span>
                      {r.driverName && (
                        <div className="text-[11px] text-fg-tertiary">
                          {r.driverName}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tnum text-xs text-fg-primary">
                      {r.loadedLitres20C?.toLocaleString()} L
                    </td>
                    <td className="px-5 py-3 text-right font-mono tnum text-xs text-fg-primary">
                      {r.dischargedLitres20C?.toLocaleString()} L
                    </td>
                    <td
                      className={
                        "px-5 py-3 text-right font-mono tnum text-xs " +
                        (r.netLitres < 0 ? "text-status-danger" : "text-status-success")
                      }
                    >
                      {r.netLitres > 0 ? "+" : ""}
                      {r.netLitres.toLocaleString()} L
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={r.alert ? "danger" : "neutral"}>
                        {r.ullagePct >= 0 ? "" : "+"}
                        {(-r.ullagePct).toFixed(2)} %
                      </Badge>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trips with both loading and discharge observations in this range.
                      Capture them on the trip detail page to populate this report.
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

function Tile({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
  mono?: boolean;
}) {
  const colour =
    tone === "danger"
      ? "text-status-danger"
      : tone === "success"
        ? "text-status-success"
        : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono tnum " : ""}text-2xl font-medium ${colour}`}>
        {value}
      </div>
    </div>
  );
}
