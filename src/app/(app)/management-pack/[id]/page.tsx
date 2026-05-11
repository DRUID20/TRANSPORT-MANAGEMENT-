import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  FileBarChart,
  FileText,
  Printer,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getEmployeeById } from "@/server/actions/hr";
import { getManagementPackById } from "@/server/actions/management-pack";
import {
  apAgingBySupplier,
  arAgingByCustomer,
  fleetUtilisation,
  fuelEfficiencyByTruck,
  profitAndLoss,
  statementOfFinancialPosition,
} from "@/server/actions/reports";
import { truckLeaderboard } from "@/server/actions/tracker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { STATUS_LABELS, type ManagementPackStatus } from "@/lib/types/management-pack";
import { NarrativeEditor } from "./narrative-editor";
import { PackActions } from "./pack-actions";

const STATUS_VARIANT: Record<
  ManagementPackStatus,
  "neutral" | "info" | "success" | "warning"
> = {
  draft: "neutral",
  in_review: "warning",
  signed_off: "success",
  published: "info",
};

export default async function ManagementPackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pack = await getManagementPackById(id);
  if (!pack) notFound();

  const range = { fromDate: pack.startDate, toDate: pack.endDate };
  const [pnl, sfp, ar, ap, fleet, fuel, leaderboard, prepared, reviewed, signedOff] =
    await Promise.all([
      profitAndLoss(range),
      statementOfFinancialPosition(pack.endDate),
      arAgingByCustomer(pack.endDate),
      apAgingBySupplier(pack.endDate),
      fleetUtilisation(range),
      fuelEfficiencyByTruck(range),
      truckLeaderboard(range),
      pack.preparedById ? getEmployeeById(pack.preparedById) : Promise.resolve(undefined),
      pack.reviewedById ? getEmployeeById(pack.reviewedById) : Promise.resolve(undefined),
      pack.signedOffById ? getEmployeeById(pack.signedOffById) : Promise.resolve(undefined),
    ]);

  const arTotal = ar.reduce((s, r) => s + r.total, 0);
  const apTotal = ap.reduce((s, r) => s + r.total, 0);
  const fleetRevenue = fleet.reduce((s, r) => s + r.revenueKes, 0);
  const fleetProfit = fleet.reduce((s, r) => s + r.grossProfitKes, 0);
  const champion = leaderboard[0];

  const locked = pack.status === "signed_off" || pack.status === "published";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Management Pack", href: "/management-pack" },
          { label: pack.yearMonth },
        ]}
        eyebrow={`Monthly close · ${pack.startDate} → ${pack.endDate}`}
        title={`Pack ${pack.yearMonth}`}
        description="Snapshot of operational + financial performance for the month."
        actions={
          <>
            <Badge variant={STATUS_VARIANT[pack.status]} dot>
              {STATUS_LABELS[pack.status]}
            </Badge>
            <Link
              href={`/print-management-pack/${id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              <Printer className="size-3.5" />
              Print view
            </Link>
          </>
        }
      />

      {/* Signoff bar */}
      <Card>
        <CardContent className="!p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <SignoffStage
              label="Prepared"
              employeeName={prepared?.fullName}
              at={pack.preparedAt}
              active={pack.status !== "draft"}
            />
            <SignoffStage
              label="Reviewed"
              employeeName={reviewed?.fullName}
              at={pack.reviewedAt}
              active={pack.status === "signed_off" || pack.status === "published"}
            />
            <SignoffStage
              label="Signed-off"
              employeeName={signedOff?.fullName}
              at={pack.signedOffAt}
              active={pack.status === "signed_off" || pack.status === "published"}
            />
          </div>
        </CardContent>
      </Card>

      <PackActions packId={pack.id} status={pack.status} locked={locked} />

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat icon={TrendingUp} label="Revenue" value={pnl.income.total} tone="info" />
        <Stat
          icon={Banknote}
          label="Net profit"
          value={pnl.netProfit}
          tone={pnl.netProfit >= 0 ? "success" : "danger"}
        />
        <Stat icon={TrendingDown} label="AR open" value={arTotal} tone="warning" />
        <Stat icon={TrendingDown} label="AP open" value={apTotal} tone="warning" />
        <Stat icon={Truck} label="Fleet profit" value={fleetProfit} tone="info" />
      </div>

      {/* Narrative */}
      <NarrativeEditor
        packId={pack.id}
        locked={locked}
        narrative={pack.narrative}
        highlights={pack.highlights}
        risks={pack.risks}
      />

      {/* Sections grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Profit & Loss"
          icon={TrendingUp}
          href="/reports/profit-and-loss"
        >
          <SectionRow label="Revenue" value={pnl.income.total} tone="info" />
          <SectionRow label="Direct costs" value={pnl.directCost.total} />
          <SectionRow label="Gross profit" value={pnl.grossProfit} bold />
          <SectionRow label="Operating expenses" value={pnl.expenses.total} />
          <SectionRow
            label="Net profit"
            value={pnl.netProfit}
            tone={pnl.netProfit >= 0 ? "success" : "danger"}
            bold
          />
        </Section>

        <Section
          title="Statement of Financial Position"
          icon={FileBarChart}
          href="/reports/balance-sheet"
        >
          <SectionRow label="Total assets" value={sfp.assets.total} tone="info" />
          <SectionRow label="Total liabilities" value={sfp.liabilities.total} />
          <SectionRow label="Total equity" value={sfp.equity.total} bold />
          <SectionRow
            label="Balance check"
            value={sfp.balancingDifference}
            tone={Math.abs(sfp.balancingDifference) < 1 ? "success" : "danger"}
            small
          />
        </Section>

        <Section
          title={`AR Aging — ${ar.length} customers, KSh ${Math.round(arTotal).toLocaleString()}`}
          icon={TrendingDown}
          href="/reports/ar-aging"
        >
          {ar.slice(0, 4).map((r) => (
            <SectionRow
              key={r.customerId}
              label={r.customerName}
              value={r.total}
              tone={
                r.d90plus > 0 ? "danger" : r.d61to90 > 0 ? "warning" : "default"
              }
            />
          ))}
          {ar.length === 0 && (
            <div className="px-1 py-2 text-xs text-fg-tertiary">All customers current.</div>
          )}
        </Section>

        <Section
          title={`AP Aging — ${ap.length} suppliers, KSh ${Math.round(apTotal).toLocaleString()}`}
          icon={TrendingDown}
          href="/reports/ap-aging"
        >
          {ap.slice(0, 4).map((r) => (
            <SectionRow
              key={r.supplierId}
              label={r.supplierName}
              value={r.total}
              tone={
                r.d90plus > 0 ? "danger" : r.d61to90 > 0 ? "warning" : "default"
              }
            />
          ))}
          {ap.length === 0 && (
            <div className="px-1 py-2 text-xs text-fg-tertiary">No open supplier balances.</div>
          )}
        </Section>

        <Section
          title={`Fleet — ${fleet.length} trucks, KSh ${Math.round(fleetRevenue).toLocaleString()}`}
          icon={Truck}
          href="/reports/fleet-utilisation"
        >
          {fleet.slice(0, 4).map((r) => (
            <SectionRow
              key={r.truckId}
              label={r.registration}
              value={r.grossProfitKes}
              tone={r.grossProfitKes >= 0 ? "success" : "danger"}
              hint={`${r.tripCount} trips · ${r.kmDriven.toLocaleString()} km`}
            />
          ))}
        </Section>

        <Section
          title={`Fuel — ${fuel.length} trucks reporting`}
          icon={Truck}
          href="/reports/fuel-efficiency"
        >
          {fuel
            .filter((r) => r.litresPer100km !== null)
            .slice(0, 4)
            .map((r) => (
              <SectionRow
                key={r.truckId}
                label={r.registration}
                value={r.litresPer100km ?? 0}
                unit="L/100km"
                tone={
                  (r.litresPer100km ?? 0) <= 35
                    ? "success"
                    : (r.litresPer100km ?? 0) <= 45
                      ? "warning"
                      : "danger"
                }
                hint={r.kesPerKm === null ? "" : `KSh ${r.kesPerKm.toFixed(1)} / km`}
              />
            ))}
        </Section>

        <Section
          title={`Performance leaderboard — champion ${champion?.registration ?? "—"}`}
          icon={CheckCircle2}
          href="/tracker"
        >
          {leaderboard.slice(0, 4).map((r, i) => (
            <SectionRow
              key={r.truckId}
              label={`${i + 1}. ${r.registration}`}
              value={r.score}
              unit="/100"
              tone={
                r.score >= 75
                  ? "success"
                  : r.score >= 50
                    ? "info"
                    : r.score >= 25
                      ? "warning"
                      : "danger"
              }
              hint={`${r.tripCount} trips · ${r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(0)}%`} margin`}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "danger" | "warning";
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>
        KSh {Math.round(value).toLocaleString()}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="!p-5">
        <Link
          href={href}
          className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-fg-primary hover:text-brand-blue"
        >
          <span className="inline-flex items-center gap-2">
            <Icon className="size-3.5 text-fg-tertiary" /> {title}
          </span>
          <FileText className="size-3 text-fg-tertiary" />
        </Link>
        <div className="flex flex-col gap-1.5">{children}</div>
      </CardContent>
    </Card>
  );
}

function SectionRow({
  label,
  value,
  tone = "default",
  bold = false,
  small = false,
  unit,
  hint,
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "danger" | "warning";
  bold?: boolean;
  small?: boolean;
  unit?: string;
  hint?: string;
}) {
  const colour =
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <div className="overflow-hidden">
        <span className={small ? "text-fg-tertiary" : "text-fg-secondary"}>{label}</span>
        {hint && <div className="font-mono text-[10px] text-fg-tertiary">{hint}</div>}
      </div>
      <span
        className={
          "font-mono tnum " +
          (bold ? "text-sm font-semibold " : "text-xs ") +
          colour
        }
      >
        {unit
          ? `${typeof value === "number" ? value.toFixed(unit === "L/100km" ? 1 : 0) : value} ${unit}`
          : Math.round(value).toLocaleString()}
      </span>
    </div>
  );
}

function SignoffStage({
  label,
  employeeName,
  at,
  active,
}: {
  label: string;
  employeeName: string | undefined;
  at: string | undefined;
  active: boolean;
}) {
  return (
    <div
      className={
        "rounded-md border p-3 transition-colors " +
        (active
          ? "border-status-success/30 bg-status-success/5"
          : "border-border bg-bg-base/40 opacity-70")
      }
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        <CheckCircle2
          className={active ? "size-3 text-status-success" : "size-3 text-fg-tertiary"}
        />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-fg-primary">
        {employeeName ?? "—"}
      </div>
      <div className="font-mono text-[10px] tnum text-fg-tertiary">
        {at ? new Date(at).toLocaleDateString() : "pending"}
      </div>
    </div>
  );
}
