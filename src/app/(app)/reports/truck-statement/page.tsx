import Link from "next/link";
import { Truck } from "lucide-react";
import { listTrucks } from "@/server/actions/trucks";
import { getTruckStatement } from "@/server/actions/truck-statement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { ReportLetterhead } from "@/components/reports/report-letterhead";

export default async function TruckStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ truck?: string }>;
}) {
  const { truck } = await searchParams;
  const trucks = (await listTrucks()).map((t) => ({
    id: t.id,
    registration: t.registration,
    ownerType: t.ownerType,
  }));
  const statement = truck ? await getTruckStatement(truck) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Truck Statement" }]}
        eyebrow="Operations · Per-truck"
        title="Truck Statement"
        description="Monthly retained earnings carried forward per truck — owned or subcontracted. KES."
      />

      <Card>
        <CardContent className="!p-5">
          <form className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">
              Truck
            </label>
            <select
              name="truck"
              defaultValue={truck ?? ""}
              className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-sm font-semibold text-fg-primary"
            >
              <option value="">— Select a truck —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.registration} {t.ownerType === "subcontractor" ? "(subcontracted)" : "(owned)"}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              View statement
            </button>
          </form>
        </CardContent>
      </Card>

      {statement && (
        <>
          <ReportLetterhead
            title={`Truck Statement — ${statement.registration}`}
            period="Cumulative, month by month (KES)"
          />

          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-fg-primary">
              <Truck className="size-4 text-fg-tertiary" />
              {statement.registration}
            </span>
            {statement.ownerType === "subcontractor" ? (
              <Badge variant="info">
                Subcontracted · {statement.subcontractorName ?? "—"} · they keep{" "}
                {Math.round(statement.revenueShare * 100)}%
              </Badge>
            ) : (
              <Badge variant="success">Company owned</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Months active" value={statement.months.length.toLocaleString()} />
            <Stat label="Revenue credited" value={kes(statement.totalRevenue)} tone="info" />
            <Stat label="Costs deducted" value={kes(statement.totalCosts)} tone="warning" />
            <Stat
              label="Closing balance"
              value={kes(statement.closingBalance)}
              tone={statement.closingBalance >= 0 ? "success" : "danger"}
            />
          </div>

          <Card>
            <CardContent className="!p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-fg-secondary">
                      <th className="px-5 py-2.5">Month</th>
                      <th className="px-3 py-2.5 text-right">Opening b/f</th>
                      <th className="px-3 py-2.5 text-right">Trips</th>
                      <th className="px-3 py-2.5 text-right">Revenue credited</th>
                      <th className="px-3 py-2.5 text-right">Costs deducted</th>
                      <th className="px-3 py-2.5 text-right">Net</th>
                      <th className="px-3 py-2.5 text-right">Closing c/f</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {statement.months.map((m) => (
                      <tr key={m.month} className="transition-colors hover:bg-bg-base/40">
                        <td className="px-5 py-2.5 text-fg-primary">{m.label}</td>
                        <td className="px-3 py-2.5 text-right font-mono tnum text-fg-tertiary">
                          {Math.round(m.openingBalance).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tnum text-fg-secondary">
                          {m.tripCount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tnum text-brand-blue">
                          {Math.round(m.revenueKes).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tnum text-status-warning">
                          {Math.round(m.costsKes).toLocaleString()}
                        </td>
                        <td
                          className={
                            "px-3 py-2.5 text-right font-mono tnum " +
                            (m.netKes >= 0 ? "text-status-success" : "text-status-danger")
                          }
                        >
                          {Math.round(m.netKes).toLocaleString()}
                        </td>
                        <td
                          className={
                            "px-3 py-2.5 text-right font-mono tnum font-semibold " +
                            (m.closingBalance >= 0 ? "text-fg-primary" : "text-status-danger")
                          }
                        >
                          {Math.round(m.closingBalance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {statement.months.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                          No closed trips for this truck yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-fg-tertiary">
            Costs deducted = fuel + trip expenses + border charges + driver advance used + workshop.
            {statement.ownerType === "subcontractor" &&
              " Revenue credited is the subcontractor's share of freight (after our commission)."}{" "}
            This is a management statement (memo), not a General Ledger equity account.
          </p>
        </>
      )}

      {!statement && (
        <div className="text-center text-sm text-fg-tertiary">
          Pick a truck above to see its month-by-month statement.{" "}
          <Link href="/reports" className="text-brand-blue hover:underline">
            Back to reports
          </Link>
        </div>
      )}
    </div>
  );
}

function kes(n: number) {
  return `KSh ${Math.round(n).toLocaleString()}`;
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
      <div className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>{value}</div>
    </div>
  );
}
