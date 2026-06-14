import { notFound } from "next/navigation";
import { supplierStatement, defaultStatementRange } from "@/server/repos/statements";
import { getSupplier } from "@/server/repos/suppliers";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { ReportLetterhead } from "@/components/reports/report-letterhead";
import { StatementSummary, StatementTable } from "@/components/reports/statement-view";

export default async function SupplierStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;
  const def = defaultStatementRange();
  const fromDate = from ?? def.fromDate;
  const toDate = to ?? def.toDate;

  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const stmt = await supplierStatement(id, { fromDate, toDate });
  const period = `${fromDate} → ${toDate}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Suppliers", href: "/suppliers" },
          { label: supplier.name, href: `/suppliers/${id}` },
          { label: "Statement" },
        ]}
        eyebrow="Finance · AP"
        title={`${supplier.name} — Statement`}
        description={`Account statement (payable) in KES. ${period}.`}
        actions={
          <ReportExportMenu
            exportPath={`/api/statements/supplier/${id}/export?from=${fromDate}&to=${toDate}`}
          />
        }
      />

      <ReportLetterhead title={`Supplier Statement — ${supplier.name}`} period={period} />

      <Card className="no-print">
        <CardContent className="!p-5">
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="from" className="text-xs uppercase tracking-wider text-fg-tertiary">
                From
              </label>
              <input
                type="date"
                id="from"
                name="from"
                defaultValue={fromDate}
                className="rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm tnum"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="to" className="text-xs uppercase tracking-wider text-fg-tertiary">
                To
              </label>
              <input
                type="date"
                id="to"
                name="to"
                defaultValue={toDate}
                className="rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm tnum"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              Reload
            </button>
          </form>
        </CardContent>
      </Card>

      <StatementSummary stmt={stmt} />
      <StatementTable stmt={stmt} party="supplier" />
    </div>
  );
}
