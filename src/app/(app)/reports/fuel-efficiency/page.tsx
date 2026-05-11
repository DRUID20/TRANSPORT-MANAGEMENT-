import Link from "next/link";
import { Download, Fuel } from "lucide-react";
import { fuelEfficiencyByTruck } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function FuelEfficiencyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const rows = await fuelEfficiencyByTruck({ fromDate, toDate });

  const reporting = rows.filter((r) => r.litresPer100km !== null);
  const avgConsumption =
    reporting.length > 0
      ? reporting.reduce((s, r) => s + (r.litresPer100km ?? 0), 0) / reporting.length
      : null;
  const totalLitres = rows.reduce((s, r) => s + r.totalLitres, 0);
  const totalKes = rows.reduce((s, r) => s + r.totalKes, 0);
  const totalKm = rows.reduce((s, r) => s + r.kmCovered, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Fuel Efficiency" }]}
        eyebrow="Operations · Fuel"
        title="Fuel Efficiency"
        description={`Per-truck consumption (L/100km), KES per km, average price. ${fromDate} → ${toDate}.`}
        actions={
          <Link
            href={`/api/reports/fuel-efficiency/export?from=${fromDate}&to=${toDate}`}
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Avg L/100km"
          value={avgConsumption === null ? "—" : avgConsumption.toFixed(1)}
          tone="info"
        />
        <Stat label="Litres pumped" value={totalLitres.toLocaleString()} />
        <Stat label="Fuel KES" value={Math.round(totalKes).toLocaleString()} tone="warning" />
        <Stat label="KM covered" value={totalKm.toLocaleString()} />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Truck</th>
                  <th className="px-3 py-2 text-right font-medium">Fills</th>
                  <th className="px-3 py-2 text-right font-medium">Litres</th>
                  <th className="px-3 py-2 text-right font-medium">Fuel KES</th>
                  <th className="px-3 py-2 text-right font-medium">KM</th>
                  <th className="px-3 py-2 text-right font-medium">L/100km</th>
                  <th className="px-3 py-2 text-right font-medium">KES/km</th>
                  <th className="px-3 py-2 text-right font-medium">Avg KES/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const efficiency = r.litresPer100km;
                  const efficiencyColour =
                    efficiency === null
                      ? "text-fg-tertiary"
                      : efficiency <= 35
                        ? "text-status-success"
                        : efficiency <= 45
                          ? "text-status-warning"
                          : "text-status-danger";
                  return (
                    <tr key={r.truckId} className="transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2">
                        <Link
                          href={`/trucks/${r.truckId}`}
                          className="inline-flex items-center gap-1.5 text-fg-primary hover:text-brand-blue"
                        >
                          <Fuel className="size-3.5 text-fg-tertiary" />
                          <span className="font-mono tnum text-xs">{r.registration}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {r.fills}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {r.totalLitres.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                        {Math.round(r.totalKes).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {r.kmCovered.toLocaleString()}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono tnum font-semibold ${efficiencyColour}`}>
                        {efficiency === null ? "—" : efficiency.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {r.kesPerKm === null ? "—" : r.kesPerKm.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {r.avgPricePerLitre === null ? "—" : r.avgPricePerLitre.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No fuel data in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-fg-tertiary">
        L/100km uses the tank-to-tank method: litres in all but the first fill,
        divided by distance between first and last odometer.
        Green = ≤ 35 L/100km · Amber = ≤ 45 · Red = above 45.
      </p>
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
  tone?: "default" | "info" | "warning";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-2xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
