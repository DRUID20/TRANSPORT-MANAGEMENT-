import Link from "next/link";
import { Building2 } from "lucide-react";
import { revenueByCustomer } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportLetterhead } from "@/components/reports/report-letterhead";

export default async function RevenueByCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const rows = await revenueByCustomer({ fromDate, toDate });

  const totals = rows.reduce(
    (acc, r) => {
      acc.invoices += r.invoiceCount;
      acc.invoiced += r.invoicedKes;
      acc.received += r.receivedKes;
      acc.outstanding += r.outstandingKes;
      return acc;
    },
    { invoices: 0, invoiced: 0, received: 0, outstanding: 0 },
  );
  const collectionRate = totals.invoiced > 0 ? (totals.received / totals.invoiced) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Revenue by Customer" }]}
        eyebrow="Finance · Revenue"
        title="Revenue by Customer"
        description={`Invoiced, received and outstanding per customer. ${fromDate} → ${toDate}. KES base.`}
        actions={
          <ReportExportMenu
            exportPath={`/api/reports/revenue-by-customer/export?from=${fromDate}&to=${toDate}`}
          />
        }
      />

      <ReportLetterhead title="Revenue by Customer" period={`${fromDate} → ${toDate}`} />

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Customers" value={rows.length.toLocaleString()} />
        <Stat label="Invoiced" value={`KSh ${Math.round(totals.invoiced).toLocaleString()}`} tone="info" />
        <Stat label="Received" value={`KSh ${Math.round(totals.received).toLocaleString()}`} tone="success" />
        <Stat label="Outstanding" value={`KSh ${Math.round(totals.outstanding).toLocaleString()}`} tone="warning" />
        <Stat
          label="Collection rate"
          value={collectionRate === null ? "—" : `${collectionRate.toFixed(1)}%`}
          tone={collectionRate !== null && collectionRate >= 80 ? "success" : "default"}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 text-right font-medium">Invoices</th>
                  <th className="px-3 py-2 text-right font-medium">Invoiced</th>
                  <th className="px-3 py-2 text-right font-medium">Received</th>
                  <th className="px-3 py-2 text-right font-medium">Outstanding</th>
                  <th className="px-3 py-2 text-right font-medium">Last invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.customerId} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2">
                      <Link
                        href={`/customers/${r.customerId}`}
                        className="inline-flex items-center gap-1.5 text-fg-primary hover:text-brand-blue"
                      >
                        <Building2 className="size-3.5 text-fg-tertiary" />
                        {r.customerName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">{r.invoiceCount}</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(r.invoicedKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-success">
                      {Math.round(r.receivedKes).toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum " +
                        (r.outstandingKes > 0 ? "text-status-warning" : "text-fg-tertiary")
                      }
                    >
                      {r.outstandingKes > 0 ? Math.round(r.outstandingKes).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-xs text-fg-tertiary">
                      {r.lastInvoiceDate ?? "—"}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No invoiced revenue in this period.
                    </td>
                  </tr>
                )}
                {rows.length > 0 && (
                  <tr className="bg-bg-elevated font-semibold">
                    <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">Total</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">{totals.invoices}</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">
                      {Math.round(totals.invoiced).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-success">
                      {Math.round(totals.received).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                      {Math.round(totals.outstanding).toLocaleString()}
                    </td>
                    <td className="px-3 py-2" />
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
  tone?: "default" | "info" | "warning" | "success";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    tone === "success" ? "text-status-success" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>{value}</div>
    </div>
  );
}
