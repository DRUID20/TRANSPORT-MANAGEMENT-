import { arAgingByCustomer } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportLetterhead } from "@/components/reports/report-letterhead";

export default async function ArAgingPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { asOf } = await searchParams;
  const today = asOf ?? new Date().toISOString().slice(0, 10);
  const rows = await arAgingByCustomer(today);
  const totals = rows.reduce(
    (acc, r) => {
      acc.current += r.current;
      acc.d1to30 += r.d1to30;
      acc.d31to60 += r.d31to60;
      acc.d61to90 += r.d61to90;
      acc.d90plus += r.d90plus;
      acc.total += r.total;
      acc.invoiceCount += r.invoiceCount;
      return acc;
    },
    { current: 0, d1to30: 0, d31to60: 0, d61to90: 0, d90plus: 0, total: 0, invoiceCount: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "AR Aging" }]}
        eyebrow="Finance · AR"
        title="AR Aging"
        description={`Open customer balances aged into buckets as of ${today}. KES base.`}
        actions={
          <ReportExportMenu exportPath={`/api/reports/ar-aging/export?asOf=${today}`} />
        }
      />

      <ReportLetterhead title="Accounts Receivable — Aging" period={`As at ${today}`} />

      <Card>
        <CardContent className="!p-5">
          <form className="flex items-center gap-3">
            <label htmlFor="asOf" className="text-xs uppercase tracking-wider text-fg-tertiary">
              As of
            </label>
            <input
              type="date"
              id="asOf"
              name="asOf"
              defaultValue={today}
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
        <Stat label="Current" value={totals.current} />
        <Stat label="1-30 d" value={totals.d1to30} tone="warning" />
        <Stat label="31-60 d" value={totals.d31to60} tone="warning" />
        <Stat label="61-90 d" value={totals.d61to90} tone="danger" />
        <Stat label="90+ d" value={totals.d90plus} tone="danger" />
        <Stat label="Total" value={totals.total} tone="info" />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 text-right font-medium">Invoices</th>
                  <th className="px-3 py-2 text-right font-medium">Current</th>
                  <th className="px-3 py-2 text-right font-medium">1-30 d</th>
                  <th className="px-3 py-2 text-right font-medium">31-60 d</th>
                  <th className="px-3 py-2 text-right font-medium">61-90 d</th>
                  <th className="px-3 py-2 text-right font-medium">90+ d</th>
                  <th className="px-3 py-2 text-right font-medium">Total (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.customerId} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2 text-fg-primary">{r.customerName}</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">{r.invoiceCount}</td>
                    <Cell amount={r.current} />
                    <Cell amount={r.d1to30} tone="warning" />
                    <Cell amount={r.d31to60} tone="warning" />
                    <Cell amount={r.d61to90} tone="danger" />
                    <Cell amount={r.d90plus} tone="danger" />
                    <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {Math.round(r.total).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No open AR balances.
                    </td>
                  </tr>
                )}
                {rows.length > 0 && (
                  <tr className="bg-bg-elevated">
                    <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">
                      {totals.invoiceCount}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">
                      {Math.round(totals.current).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                      {Math.round(totals.d1to30).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                      {Math.round(totals.d31to60).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-danger">
                      {Math.round(totals.d61to90).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-danger">
                      {Math.round(totals.d90plus).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum font-semibold text-fg-primary">
                      {Math.round(totals.total).toLocaleString()}
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

function Cell({
  amount,
  tone = "default",
}: {
  amount: number;
  tone?: "default" | "warning" | "danger";
}) {
  const colour =
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-secondary";
  return (
    <td className={`px-3 py-2 text-right font-mono tnum ${colour}`}>
      {amount > 0 ? Math.round(amount).toLocaleString() : "—"}
    </td>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "warning" | "danger";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-xl font-medium ${colour}`}>
        {Math.round(value).toLocaleString()}
      </div>
    </div>
  );
}
