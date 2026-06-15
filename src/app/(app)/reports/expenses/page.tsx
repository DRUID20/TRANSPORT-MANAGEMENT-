import { expenseBreakdown } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportLetterhead } from "@/components/reports/report-letterhead";

type Dimension = "category" | "truck" | "currency";
const DIMENSIONS: Dimension[] = ["category", "truck", "currency"];

const DIMENSION_LABELS: Record<Dimension, string> = {
  category: "By category",
  truck: "By truck",
  currency: "By currency",
};

export default async function ExpensesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; dim?: string }>;
}) {
  const { from, to, dim } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const dimension: Dimension = (DIMENSIONS as string[]).includes(dim ?? "")
    ? (dim as Dimension)
    : "category";

  const rows = await expenseBreakdown({ dimension, fromDate, toDate });
  const total = rows.reduce((s, r) => s + r.amountKes, 0);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Expense Breakdown" }]}
        eyebrow="Finance · Expenses"
        title="Expense Breakdown"
        description={`Approved expenses, ${fromDate} → ${toDate}. KES base.`}
        actions={
          <ReportExportMenu exportPath={`/api/reports/expenses/export?from=${fromDate}&to=${toDate}&dim=${dimension}`} />
        }
      />

      <ReportLetterhead title="Expense Breakdown" period={`${fromDate} → ${toDate}`} />

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
            <label className="text-xs uppercase tracking-wider text-fg-tertiary">Dimension</label>
            <select
              name="dim"
              defaultValue={dimension}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            >
              {DIMENSIONS.map((d) => (
                <option key={d} value={d}>{DIMENSION_LABELS[d]}</option>
              ))}
            </select>
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
        <Stat label="Rows" value={rows.length.toLocaleString()} />
        <Stat label="Total entries" value={totalCount.toLocaleString()} />
        <Stat label="Total KES" value={Math.round(total).toLocaleString()} tone="warning" />
        <Stat
          label="Avg per entry"
          value={totalCount > 0 ? Math.round(total / totalCount).toLocaleString() : "—"}
          tone="info"
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">{DIMENSION_LABELS[dimension]}</th>
                  <th className="px-3 py-2 text-right font-medium">Entries</th>
                  <th className="px-3 py-2 text-right font-medium">Amount (KES)</th>
                  <th className="px-3 py-2 text-right font-medium">% of total</th>
                  <th className="px-3 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const pct = total > 0 ? (r.amountKes / total) * 100 : 0;
                  return (
                    <tr key={r.key} className="transition-colors hover:bg-bg-base/40">
                      <td className="px-5 py-2 text-fg-primary capitalize">{r.label}</td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {r.count}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                        {Math.round(r.amountKes).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-base ring-1 ring-border">
                          <div
                            className="h-full bg-gradient-to-r from-status-warning to-brand-blue"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No expenses in this range.
                    </td>
                  </tr>
                )}
                {rows.length > 0 && (
                  <tr className="bg-bg-elevated">
                    <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">
                      {totalCount}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {Math.round(total).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-tertiary">100%</td>
                    <td className="px-3 py-2"></td>
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
