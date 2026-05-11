import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Truck } from "lucide-react";
import { truckProfitAndLoss } from "@/server/actions/reports";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export default async function PerTruckPnlPage({
  params,
  searchParams,
}: {
  params: Promise<{ truckId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { truckId } = await params;
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;

  const pl = await truckProfitAndLoss(truckId, { fromDate, toDate });
  if (!pl) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "P&L per truck", href: "/reports/profit-per-truck" },
          { label: pl.registration },
        ]}
        eyebrow={`Income statement · ${fromDate} → ${toDate}`}
        title={pl.registration}
        description={`${pl.tripCount} trip${pl.tripCount === 1 ? "" : "s"} · ${pl.kmDriven.toLocaleString()} km · ${pl.invoiceCount} invoice${pl.invoiceCount === 1 ? "" : "s"}`}
        actions={
          <>
            <Badge variant={pl.status === "active" ? "success" : "neutral"}>{pl.status}</Badge>
            <Link
              href={`/api/reports/truck-pnl/export?from=${fromDate}&to=${toDate}&truck=${truckId}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              <Download className="size-3.5" /> CSV
            </Link>
          </>
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

      {/* Income statement */}
      <Card>
        <CardContent className="!p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {/* Revenue */}
              <SectionHeading label="Revenue" />
              <Line label="Invoiced revenue" value={pl.revenueKes} tone="info" hint={`${pl.invoiceCount} invoice${pl.invoiceCount === 1 ? "" : "s"}`} />

              {/* Direct cost block */}
              <SectionHeading label="Direct costs" />
              <Line label="Fuel" value={-pl.fuelKes} />
              <Line label="Border charges" value={-pl.borderChargesKes} />
              <Line label="Driver advance used" value={-pl.driverAdvanceUsedKes} />
              <Line label="Trip expenses (approved)" value={-pl.tripExpensesKes} />
              <Subtotal label="Total direct cost" value={-pl.directCostTotal} />

              {/* Gross profit */}
              <Subtotal
                label="Gross profit"
                value={pl.grossProfit}
                tone={pl.grossProfit >= 0 ? "success" : "danger"}
                hint={pl.grossMarginPct === null ? undefined : `${(pl.grossMarginPct * 100).toFixed(1)}% gross margin`}
                strong
              />

              {/* Indirect */}
              <SectionHeading label="Indirect costs" />
              <Line
                label="Workshop (job cards)"
                value={-pl.workshopKes}
                hint={pl.tyreKes > 0 ? `incl. tyres KSh ${Math.round(pl.tyreKes).toLocaleString()}` : undefined}
              />
              <Subtotal label="Total indirect cost" value={-pl.indirectCostTotal} />

              {/* Operating profit */}
              <Subtotal
                label="Operating profit"
                value={pl.operatingProfit}
                tone={pl.operatingProfit >= 0 ? "success" : "danger"}
                hint={pl.operatingMarginPct === null ? undefined : `${(pl.operatingMarginPct * 100).toFixed(1)}% op margin`}
                strong
              />
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Unit economics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UnitCard label="Revenue / km" value={pl.revenuePerKm} tone="info" />
        <UnitCard label="Cost / km" value={pl.costPerKm} tone="warning" />
        <UnitCard
          label="Profit / km"
          value={pl.profitPerKm}
          tone={pl.profitPerKm !== null && pl.profitPerKm >= 0 ? "success" : "danger"}
          bold
        />
      </div>

      {/* Cross-links */}
      <div className="grid gap-3 md:grid-cols-3">
        <CrossLink
          href={`/tracker/${pl.truckId}?from=${fromDate}&to=${toDate}`}
          label="Open performance scorecard"
          hint="Composite score · fuel · downtime · compliance"
        />
        <CrossLink
          href={`/trucks/${pl.truckId}`}
          label="Truck asset card"
          hint="Spec, drivers, telematics, documents"
        />
        <CrossLink
          href={`/reports/fleet-utilisation?from=${fromDate}&to=${toDate}`}
          label="Compare to fleet"
          hint="Fleet utilisation report"
        />
      </div>
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <tr className="bg-bg-base/40">
      <td colSpan={2} className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-tertiary">
        {label}
      </td>
    </tr>
  );
}

function Line({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <tr className="transition-colors hover:bg-bg-base/40">
      <td className="px-5 py-2 text-sm text-fg-secondary">
        {label}
        {hint && <div className="font-mono text-[10px] text-fg-tertiary">{hint}</div>}
      </td>
      <td className={`px-5 py-2 text-right font-mono tnum text-sm ${colour}`}>
        {value === 0 ? "—" : Math.round(value).toLocaleString()}
      </td>
    </tr>
  );
}

function Subtotal({
  label,
  value,
  tone = "default",
  hint,
  strong = false,
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  hint?: string;
  strong?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <tr className={"bg-bg-elevated " + (strong ? "border-y-2 border-border-strong" : "")}>
      <td className={`px-5 py-2.5 ${strong ? "text-base font-semibold" : "text-sm font-medium"} text-fg-primary`}>
        {label}
        {hint && <div className="font-mono text-[10px] text-fg-tertiary">{hint}</div>}
      </td>
      <td
        className={
          `px-5 py-2.5 text-right font-mono tnum ${strong ? "text-lg font-bold" : "text-sm font-semibold"} ${colour}`
        }
      >
        {Math.round(value).toLocaleString()}
      </td>
    </tr>
  );
}

function UnitCard({
  label,
  value,
  tone = "default",
  bold = false,
}: {
  label: string;
  value: number | null;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  bold?: boolean;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-1 font-mono tnum ${bold ? "text-3xl font-bold" : "text-2xl font-medium"} ${colour}`}>
        {value === null ? "—" : Math.round(value).toLocaleString()}
      </div>
      <div className="font-mono text-[10px] text-fg-tertiary">KSh per km</div>
    </div>
  );
}

function CrossLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-strong"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
        <Truck className="size-3.5" /> {label}
      </div>
      <div className="text-[11px] text-fg-secondary">{hint}</div>
    </Link>
  );
}
