import Link from "next/link";
import { statementOfFinancialPosition } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { asOf } = await searchParams;
  const sfp = await statementOfFinancialPosition(asOf);
  const balanced = Math.abs(sfp.balancingDifference) < 0.01;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Balance Sheet" }]}
        eyebrow="Finance"
        title="Statement of Financial Position"
        description={asOf ? `As at ${asOf}` : "As of today · KES base"}
      />

      <Card>
        <CardContent className="!p-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-fg-tertiary">As of</label>
              <input
                type="date"
                name="asOf"
                defaultValue={asOf ?? ""}
                className="h-9 rounded-md border border-border bg-bg-base px-2 font-mono text-xs tnum text-fg-primary"
              />
            </div>
            <button
              type="submit"
              className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Apply
            </button>
            <Link
              href="/reports/balance-sheet"
              className="self-end text-[11px] text-fg-tertiary hover:text-fg-secondary"
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      {/* Two-column layout: Assets | Equity + Liabilities */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardContent className="!p-0">
            <div className="border-b border-border bg-bg-base/40 px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
              Assets
            </div>
            <table className="w-full text-sm">
              <tbody>
                {sfp.assets.groups.map((g) => (
                  <Group key={g.group} title={g.group} rows={g.rows} total={g.total} />
                ))}
                <tr className="border-t-2 border-border bg-bg-elevated">
                  <td className="px-5 py-3 font-semibold text-fg-primary" colSpan={2}>
                    Total Assets
                  </td>
                  <td className="px-5 py-3 text-right font-mono tnum text-base font-semibold text-fg-primary">
                    KSh {sfp.assets.total.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Equity + Liabilities */}
        <Card>
          <CardContent className="!p-0">
            <div className="border-b border-border bg-bg-base/40 px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
              Equity & Liabilities
            </div>
            <table className="w-full text-sm">
              <tbody>
                <Group title="Equity" rows={sfp.equity.rows} total={sfp.equity.total} />
                {/* Net profit for period (drops into retained earnings) */}
                <tr>
                  <td className="px-5 py-2 text-xs text-fg-tertiary">—</td>
                  <td className="px-5 py-2 text-fg-primary">Net profit for period</td>
                  <td
                    className={
                      "px-5 py-2 text-right font-mono tnum " +
                      (sfp.netProfit >= 0 ? "text-status-success" : "text-status-danger")
                    }
                  >
                    {sfp.netProfit.toLocaleString()}
                  </td>
                </tr>
                {sfp.liabilities.groups.map((g) => (
                  <Group key={g.group} title={g.group} rows={g.rows} total={g.total} />
                ))}
                <tr className="border-t-2 border-border bg-bg-elevated">
                  <td className="px-5 py-3 font-semibold text-fg-primary" colSpan={2}>
                    Total Equity & Liabilities
                  </td>
                  <td className="px-5 py-3 text-right font-mono tnum text-base font-semibold text-fg-primary">
                    KSh {sfp.totalEquityAndLiabilities.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Balancing check */}
      <Card className={balanced ? "border-status-success/30" : "border-status-warning/30"}>
        <CardContent className="!p-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Total Assets</div>
              <div className="mt-0.5 font-mono tnum text-base font-semibold text-fg-primary">
                KSh {sfp.assets.total.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">
                Total Equity & Liabilities
              </div>
              <div className="mt-0.5 font-mono tnum text-base font-semibold text-fg-primary">
                KSh {sfp.totalEquityAndLiabilities.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Difference</div>
              <div
                className={
                  "mt-0.5 font-mono tnum text-base font-semibold " +
                  (balanced ? "text-status-success" : "text-status-warning")
                }
              >
                {balanced ? "✓ Balanced" : `KSh ${sfp.balancingDifference.toLocaleString()}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Group({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ accountId: string; code: string; name: string; balanceKes: number }>;
  total: number;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <tr className="border-t border-border bg-bg-base/30">
        <td colSpan={2} className="px-5 py-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
          {title}
        </td>
        <td className="px-5 py-1.5"></td>
      </tr>
      {rows.map((r) => (
        <tr key={r.accountId} className="border-b border-border">
          <td className="px-5 py-1.5">
            <Link
              href={`/accounts/${r.accountId}`}
              className="font-mono text-xs text-fg-secondary hover:text-brand-blue"
            >
              {r.code}
            </Link>
          </td>
          <td className="px-5 py-1.5 text-fg-primary">{r.name}</td>
          <td className="px-5 py-1.5 text-right font-mono tnum text-fg-primary">
            {r.balanceKes !== 0 ? r.balanceKes.toLocaleString() : "—"}
          </td>
        </tr>
      ))}
      <tr className="border-b border-border">
        <td className="px-5 py-1.5"></td>
        <td className="px-5 py-1.5 text-xs italic text-fg-tertiary">Total {title}</td>
        <td className="px-5 py-1.5 text-right font-mono tnum font-semibold text-fg-secondary">
          {total.toLocaleString()}
        </td>
      </tr>
    </>
  );
}
