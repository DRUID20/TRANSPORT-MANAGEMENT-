import Link from "next/link";
import { Droplet } from "lucide-react";
import { ullageReport, ullageSummary } from "@/server/actions/reports";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";
import { cn } from "@/lib/utils";

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
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
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

      {rows.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            icon={Droplet}
            title="No measured trips in this range"
            description="Capture loading and discharge observations on the trip detail page to populate this report."
          />
        </div>
      ) : (
        <DataTable
          caption={
            <span>
              {rows.length} trip{rows.length === 1 ? "" : "s"} measured · worst variance first
            </span>
          }
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Trip</DataTableHeaderCell>
              <DataTableHeaderCell>Route</DataTableHeaderCell>
              <DataTableHeaderCell>Truck / Driver</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Loaded</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Delivered</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Net</DataTableHeaderCell>
              <DataTableHeaderCell align="right">Ullage</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((r) => (
              <DataTableRow key={r.tripId} linkHref={`/trips/${r.tripId}`}>
                <DataTableCell>
                  <Link
                    href={`/trips/${r.tripId}`}
                    className="flex flex-col leading-tight"
                  >
                    <span className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue">
                      {r.tripNumber}
                    </span>
                    {r.product && (
                      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
                        <Droplet className="mr-0.5 inline size-2.5" />
                        {r.product}
                      </span>
                    )}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-fg-primary">{r.origin}</span>
                  <span className="text-fg-tertiary"> → </span>
                  <span className="text-fg-primary">{r.destination}</span>
                  {r.customerName && (
                    <div className="text-[11px] text-fg-tertiary">{r.customerName}</div>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <span className="font-mono text-xs text-fg-primary">
                    {r.truckRegistration ?? "—"}
                  </span>
                  {r.driverName && (
                    <div className="text-[11px] text-fg-tertiary">{r.driverName}</div>
                  )}
                </DataTableCell>
                <DataTableCell align="right" mono className="text-xs">
                  {r.loadedLitres20C?.toLocaleString()} L
                </DataTableCell>
                <DataTableCell align="right" mono className="text-xs">
                  {r.dischargedLitres20C?.toLocaleString()} L
                </DataTableCell>
                <DataTableCell
                  align="right"
                  mono
                  className={cn(
                    "text-xs",
                    r.netLitres < 0 ? "text-status-danger" : "text-status-success",
                  )}
                >
                  {r.netLitres > 0 ? "+" : ""}
                  {r.netLitres.toLocaleString()} L
                </DataTableCell>
                <DataTableCell align="right">
                  <Badge variant={r.alert ? "danger" : "neutral"}>
                    {r.ullagePct >= 0 ? "" : "+"}
                    {(-r.ullagePct).toFixed(2)} %
                  </Badge>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
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
    <div className="surface-card lift-on-hover p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold", mono && "font-mono tnum", colour)}>
        {value}
      </div>
    </div>
  );
}
