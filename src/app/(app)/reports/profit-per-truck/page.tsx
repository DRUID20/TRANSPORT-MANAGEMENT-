import Link from "next/link";
import { Download, Truck } from "lucide-react";
import { fleetProfitAndLoss } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function ProfitPerTruckPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const rows = await fleetProfitAndLoss({ fromDate, toDate });

  // Fleet totals
  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenueKes;
      acc.fuel += r.fuelKes;
      acc.border += r.borderChargesKes;
      acc.advance += r.driverAdvanceUsedKes;
      acc.trip += r.tripExpensesKes;
      acc.direct += r.directCostTotal;
      acc.gross += r.grossProfit;
      acc.workshop += r.workshopKes;
      acc.tyres += r.tyreKes;
      acc.indirect += r.indirectCostTotal;
      acc.operating += r.operatingProfit;
      acc.km += r.kmDriven;
      acc.trips += r.tripCount;
      return acc;
    },
    {
      revenue: 0,
      fuel: 0,
      border: 0,
      advance: 0,
      trip: 0,
      direct: 0,
      gross: 0,
      workshop: 0,
      tyres: 0,
      indirect: 0,
      operating: 0,
      km: 0,
      trips: 0,
    },
  );

  const fleetGrossMarginPct = totals.revenue > 0 ? totals.gross / totals.revenue : null;
  const fleetOpMarginPct = totals.revenue > 0 ? totals.operating / totals.revenue : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "P&L per truck" }]}
        eyebrow="Operations · Per-truck income statement"
        title="Profit & Loss per truck"
        description={`Revenue − direct costs − indirect costs, per truck. ${fromDate} → ${toDate}. KES base.`}
        actions={
          <Link
            href={`/api/reports/truck-pnl/export?from=${fromDate}&to=${toDate}`}
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

      {/* Fleet totals */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue" value={totals.revenue} tone="info" />
        <Stat label="Direct cost" value={totals.direct} tone="warning" />
        <Stat
          label="Gross profit"
          value={totals.gross}
          tone={totals.gross >= 0 ? "success" : "danger"}
          hint={fleetGrossMarginPct === null ? undefined : `${(fleetGrossMarginPct * 100).toFixed(1)}%`}
        />
        <Stat label="Indirect cost" value={totals.indirect} tone="warning" />
        <Stat
          label="Operating profit"
          value={totals.operating}
          tone={totals.operating >= 0 ? "success" : "danger"}
          hint={fleetOpMarginPct === null ? undefined : `${(fleetOpMarginPct * 100).toFixed(1)}%`}
          bold
        />
        <Stat
          label="KM driven"
          value={totals.km}
          dim
          hint={`${totals.trips} trip${totals.trips === 1 ? "" : "s"}`}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-base/40 text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th rowSpan={2} className="px-4 py-2 font-medium">Truck</th>
                  <th rowSpan={2} className="px-2 py-2 text-right font-medium">Trips</th>
                  <th rowSpan={2} className="px-2 py-2 text-right font-medium">KM</th>
                  <th rowSpan={2} className="border-l border-border px-2 py-2 text-right font-medium">
                    Revenue
                  </th>
                  <th colSpan={4} className="border-l border-border px-2 py-2 text-center font-medium">
                    Direct cost
                  </th>
                  <th rowSpan={2} className="border-l border-border px-2 py-2 text-right font-medium">
                    Gross
                  </th>
                  <th colSpan={2} className="border-l border-border px-2 py-2 text-center font-medium">
                    Indirect
                  </th>
                  <th rowSpan={2} className="border-l border-border px-2 py-2 text-right font-medium">
                    Operating
                  </th>
                  <th rowSpan={2} className="px-2 py-2 text-right font-medium">Op %</th>
                  <th rowSpan={2} className="border-l border-border px-2 py-2 text-right font-medium">
                    KES/km
                  </th>
                </tr>
                <tr className="border-b border-border bg-bg-base/40 text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="border-l border-border px-2 py-1 text-right font-medium">Fuel</th>
                  <th className="px-2 py-1 text-right font-medium">Border</th>
                  <th className="px-2 py-1 text-right font-medium">Advance</th>
                  <th className="px-2 py-1 text-right font-medium">Other</th>
                  <th className="border-l border-border px-2 py-1 text-right font-medium">Workshop</th>
                  <th className="px-2 py-1 text-right font-medium">incl. tyres</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.truckId} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/reports/profit-per-truck/${r.truckId}?from=${fromDate}&to=${toDate}`}
                        className="inline-flex items-center gap-1.5 text-fg-primary group-hover:text-brand-blue"
                      >
                        <Truck className="size-3.5 text-fg-tertiary" />
                        <span className="font-mono text-xs">{r.registration}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.tripCount}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.kmDriven.toLocaleString()}
                    </td>
                    <td className="border-l border-border px-2 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(r.revenueKes).toLocaleString()}
                    </td>
                    <Num value={r.fuelKes} firstInGroup />
                    <Num value={r.borderChargesKes} />
                    <Num value={r.driverAdvanceUsedKes} />
                    <Num value={r.tripExpensesKes} />
                    <td
                      className={
                        "border-l border-border px-2 py-2 text-right font-mono tnum font-semibold " +
                        (r.grossProfit >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {Math.round(r.grossProfit).toLocaleString()}
                    </td>
                    <Num value={r.workshopKes} firstInGroup />
                    <td className="px-2 py-2 text-right font-mono tnum text-fg-tertiary text-[10px]">
                      {r.tyreKes > 0 ? Math.round(r.tyreKes).toLocaleString() : "—"}
                    </td>
                    <td
                      className={
                        "border-l border-border px-2 py-2 text-right font-mono tnum font-semibold " +
                        (r.operatingProfit >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {Math.round(r.operatingProfit).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tnum text-xs text-fg-secondary">
                      {r.operatingMarginPct === null
                        ? "—"
                        : `${(r.operatingMarginPct * 100).toFixed(1)}%`}
                    </td>
                    <td className="border-l border-border px-2 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.costPerKm === null ? "—" : Math.round(r.costPerKm).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-sm text-fg-tertiary">
                      No truck activity in this range.
                    </td>
                  </tr>
                )}
                {rows.length > 0 && (
                  <tr className="bg-bg-elevated font-semibold">
                    <td className="px-4 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                      Fleet total
                    </td>
                    <td className="px-2 py-2 text-right font-mono tnum text-fg-primary">
                      {totals.trips}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tnum text-fg-primary">
                      {totals.km.toLocaleString()}
                    </td>
                    <td className="border-l border-border px-2 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(totals.revenue).toLocaleString()}
                    </td>
                    <Num value={totals.fuel} firstInGroup bold />
                    <Num value={totals.border} bold />
                    <Num value={totals.advance} bold />
                    <Num value={totals.trip} bold />
                    <td
                      className={
                        "border-l border-border px-2 py-2 text-right font-mono tnum " +
                        (totals.gross >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {Math.round(totals.gross).toLocaleString()}
                    </td>
                    <Num value={totals.workshop} firstInGroup bold />
                    <td className="px-2 py-2 text-right font-mono tnum text-[10px] text-fg-tertiary">
                      {totals.tyres > 0 ? Math.round(totals.tyres).toLocaleString() : "—"}
                    </td>
                    <td
                      className={
                        "border-l border-border px-2 py-2 text-right font-mono tnum " +
                        (totals.operating >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {Math.round(totals.operating).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tnum text-xs text-fg-secondary">
                      {fleetOpMarginPct === null
                        ? "—"
                        : `${(fleetOpMarginPct * 100).toFixed(1)}%`}
                    </td>
                    <td className="border-l border-border px-2 py-2 text-right font-mono tnum text-fg-primary">
                      {totals.km > 0
                        ? Math.round((totals.direct + totals.indirect) / totals.km).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-fg-tertiary">
        Direct = trip-attributable (fuel + border charges + driver advance used + approved trip
        expenses). Indirect = period-attributable (workshop job cards; tyres broken out for
        visibility but already included in workshop). Click a truck for a full per-truck statement.
      </p>
    </div>
  );
}

function Num({
  value,
  firstInGroup = false,
  bold = false,
}: {
  value: number;
  firstInGroup?: boolean;
  bold?: boolean;
}) {
  const cls =
    "px-2 py-2 text-right font-mono tnum text-fg-secondary " +
    (firstInGroup ? "border-l border-border " : "") +
    (bold ? "font-semibold text-fg-primary" : "");
  return <td className={cls}>{value > 0 ? Math.round(value).toLocaleString() : "—"}</td>;
}

function Stat({
  label,
  value,
  tone = "default",
  hint,
  bold = false,
  dim = false,
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  hint?: string;
  bold?: boolean;
  dim?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" :
    dim ? "text-fg-secondary" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum ${bold ? "text-2xl font-bold" : "text-xl font-medium"} ${colour}`}>
        {Math.round(value).toLocaleString()}
      </div>
      {hint && <div className="font-mono text-[10px] text-fg-tertiary">{hint}</div>}
    </div>
  );
}
