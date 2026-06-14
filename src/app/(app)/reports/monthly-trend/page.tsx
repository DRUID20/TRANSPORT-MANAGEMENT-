import { monthlyPerformance } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportLetterhead } from "@/components/reports/report-letterhead";
import { AreaChartCard } from "@/components/dashboard/area-chart-card";

export default async function MonthlyTrendPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const { months } = await searchParams;
  const n = Math.min(36, Math.max(3, Number(months) || 12));
  const rows = await monthlyPerformance(n);

  const chartData = rows.map((r) => ({
    month: r.label,
    Revenue: Math.round(r.revenueKes),
    Cost: Math.round(r.costKes),
    "Gross profit": Math.round(r.profitKes),
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.trips += r.tripCount;
      acc.revenue += r.revenueKes;
      acc.cost += r.costKes;
      acc.profit += r.profitKes;
      return acc;
    },
    { trips: 0, revenue: 0, cost: 0, profit: 0 },
  );
  const avgMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Monthly Trend" }]}
        eyebrow="Finance · Trend"
        title="Monthly Performance Trend"
        description={`Revenue, cost and gross profit by month over the last ${n} months. Trip-level basis, KES.`}
      />

      <ReportLetterhead title="Monthly Performance Trend" period={`Last ${n} months`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Trips" value={totals.trips.toLocaleString()} />
        <Stat label="Revenue" value={`KSh ${Math.round(totals.revenue).toLocaleString()}`} tone="info" />
        <Stat
          label="Gross profit"
          value={`KSh ${Math.round(totals.profit).toLocaleString()}`}
          tone={totals.profit >= 0 ? "success" : "danger"}
        />
        <Stat label="Avg margin" value={avgMargin === null ? "—" : `${avgMargin.toFixed(1)}%`} />
      </div>

      <div className="no-print">
        <AreaChartCard
          title="Revenue vs Gross profit"
          data={chartData}
          index="month"
          categories={["Revenue", "Gross profit"]}
          format="kes-compact"
          height={300}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Month</th>
                  <th className="px-3 py-2 text-right font-medium">Trips</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Gross profit</th>
                  <th className="px-3 py-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const margin = r.revenueKes > 0 ? (r.profitKes / r.revenueKes) * 100 : null;
                  return (
                    <tr key={r.month} className="transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2 text-fg-primary">{r.label}</td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">{r.tripCount}</td>
                      <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                        {Math.round(r.revenueKes).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                        {Math.round(r.costKes).toLocaleString()}
                      </td>
                      <td
                        className={
                          "px-3 py-2 text-right font-mono tnum font-semibold " +
                          (r.profitKes >= 0 ? "text-status-success" : "text-status-danger")
                        }
                      >
                        {Math.round(r.profitKes).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-xs text-fg-tertiary">
                        {margin === null ? "—" : `${margin.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
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
