import Link from "next/link";
import { profitAndLoss } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

interface Section {
  title: string;
  rows: Array<{ accountId: string; code: string; name: string; balanceKes: number }>;
  total: number;
}

export default async function PnlPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const pnl = await profitAndLoss({ fromDate: from, toDate: to });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Profit & Loss" }]}
        eyebrow="Finance"
        title="Profit & Loss"
        description={
          from || to
            ? `Period ${from ?? "…"} → ${to ?? "…"}`
            : "All postings to date · KES base"
        }
      />

      {/* Period filter */}
      <Card>
        <CardContent className="!p-4">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <DateField label="From" name="from" defaultValue={from} />
            <DateField label="To" name="to" defaultValue={to} />
            <button
              type="submit"
              className="h-9 rounded-md border border-border bg-bg-elevated px-3 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Apply
            </button>
            <Link
              href="/reports/profit-and-loss"
              className="self-end text-[11px] text-fg-tertiary hover:text-fg-secondary"
            >
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="!p-0">
          <table className="w-full text-sm">
            <tbody>
              <Section
                title="Revenue"
                rows={pnl.income.rows}
                total={pnl.income.total}
              />
              <Section
                title="Direct Cost of Sales"
                rows={pnl.directCost.rows}
                total={pnl.directCost.total}
                negative
              />
              <SubtotalRow label="Gross Profit" value={pnl.grossProfit} bold />

              <Section
                title="Operating Expenses"
                rows={pnl.expenses.rows}
                total={pnl.expenses.total}
                negative
              />
              <SubtotalRow label="Operating Profit" value={pnl.operatingProfit} bold />

              {(pnl.otherIncome.rows.length > 0 || pnl.otherExpense.rows.length > 0) && (
                <>
                  <Section
                    title="Other Income"
                    rows={pnl.otherIncome.rows}
                    total={pnl.otherIncome.total}
                  />
                  <Section
                    title="Other Expense"
                    rows={pnl.otherExpense.rows}
                    total={pnl.otherExpense.total}
                    negative
                  />
                </>
              )}

              <SubtotalRow label="Profit before Tax" value={pnl.profitBeforeTax} bold />

              {pnl.tax.rows.length > 0 && (
                <Section title="Tax" rows={pnl.tax.rows} total={pnl.tax.total} negative />
              )}

              <SubtotalRow label="Net Profit" value={pnl.netProfit} bold large />
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  rows,
  total,
  negative,
}: Section & { strong?: boolean; negative?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <>
      <tr className="bg-bg-base/40">
        <td colSpan={2} className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">
          {title}
        </td>
        <td className="px-5 py-2"></td>
      </tr>
      {rows.map((r) => (
        <tr key={r.accountId} className="border-b border-border">
          <td className="px-5 py-2">
            <Link
              href={`/accounts/${r.accountId}`}
              className="font-mono text-xs text-fg-secondary hover:text-brand-blue"
            >
              {r.code}
            </Link>
          </td>
          <td className="px-5 py-2 text-fg-primary">{r.name}</td>
          <td
            className={
              "px-5 py-2 text-right font-mono tnum " +
              (negative ? "text-status-danger" : "text-fg-primary")
            }
          >
            {(negative ? -1 : 1) * r.balanceKes !== 0
              ? (negative ? "(" : "") + r.balanceKes.toLocaleString() + (negative ? ")" : "")
              : "—"}
          </td>
        </tr>
      ))}
      <tr className="border-b-2 border-border">
        <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary"></td>
        <td className="px-5 py-2 text-xs text-fg-secondary">Total {title}</td>
        <td
          className={
            "px-5 py-2 text-right font-mono tnum font-semibold " +
            (negative ? "text-status-danger" : "text-fg-primary")
          }
        >
          {(negative ? "(" : "") + total.toLocaleString() + (negative ? ")" : "")}
        </td>
      </tr>
    </>
  );
}

function SubtotalRow({
  label,
  value,
  bold,
  large,
}: {
  label: string;
  value: number;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <tr className={"border-b-2 border-border " + (large ? "bg-bg-elevated" : "")}>
      <td colSpan={2} className={"px-5 py-3 " + (bold ? "font-semibold text-fg-primary " : "text-fg-secondary ") + (large ? "text-base" : "")}>
        {label}
      </td>
      <td
        className={
          "px-5 py-3 text-right font-mono tnum " +
          (bold ? "font-semibold " : "") +
          (large ? "text-lg " : "") +
          (value >= 0 ? "text-status-success" : "text-status-danger")
        }
      >
        KSh {value.toLocaleString()}
      </td>
    </tr>
  );
}

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</label>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 rounded-md border border-border bg-bg-base px-2 font-mono text-xs tnum text-fg-primary"
      />
    </div>
  );
}
