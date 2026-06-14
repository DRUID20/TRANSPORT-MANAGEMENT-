import { vatSummary } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportLetterhead } from "@/components/reports/report-letterhead";

export default async function VatSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;
  const data = await vatSummary({ fromDate, toDate });
  const payable = data.netPayableKes >= 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "VAT Summary" }]}
        eyebrow="Finance · Tax"
        title="VAT Summary"
        description={`Output VAT (sales) vs input VAT (purchases). ${fromDate} → ${toDate}. KES base.`}
        actions={
          <ReportExportMenu
            exportPath={`/api/reports/vat-summary/export?from=${fromDate}&to=${toDate}`}
          />
        }
      />

      <ReportLetterhead title="VAT Summary" period={`${fromDate} → ${toDate}`} />

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label={`Output VAT · ${data.invoiceCount} invoices`}
          value={`KSh ${Math.round(data.outputVatKes).toLocaleString()}`}
          tone="info"
        />
        <Stat
          label={`Input VAT · ${data.billCount} bills`}
          value={`KSh ${Math.round(data.inputVatKes).toLocaleString()}`}
          tone="warning"
        />
        <Stat
          label={payable ? "Net VAT payable" : "Net VAT reclaimable"}
          value={`KSh ${Math.round(Math.abs(data.netPayableKes)).toLocaleString()}`}
          tone={payable ? "danger" : "success"}
        />
      </div>

      <Card>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">Month</th>
                  <th className="px-3 py-2 text-right font-medium">Output VAT</th>
                  <th className="px-3 py-2 text-right font-medium">Input VAT</th>
                  <th className="px-3 py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byMonth.map((m) => (
                  <tr key={m.month} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2 text-fg-primary">{m.label}</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(m.outputKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                      {Math.round(m.inputKes).toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum font-semibold " +
                        (m.netKes >= 0 ? "text-fg-primary" : "text-status-success")
                      }
                    >
                      {Math.round(m.netKes).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {data.byMonth.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No VAT activity in this period.
                    </td>
                  </tr>
                )}
                {data.byMonth.length > 0 && (
                  <tr className="bg-bg-elevated font-semibold">
                    <td className="px-5 py-2 text-xs uppercase tracking-wider text-fg-tertiary">Total</td>
                    <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(data.outputVatKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-status-warning">
                      {Math.round(data.inputVatKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-primary">
                      {Math.round(data.netPayableKes).toLocaleString()}
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
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum text-xl font-medium ${colour}`}>{value}</div>
    </div>
  );
}
