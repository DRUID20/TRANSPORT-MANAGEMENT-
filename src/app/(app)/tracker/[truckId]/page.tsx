import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Fuel,
  Pause,
  Route,
  ShieldCheck,
  Trophy,
  Wrench,
} from "lucide-react";
import { truckScorecard } from "@/server/actions/tracker";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export default async function TruckScorecardPage({
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

  const card = await truckScorecard(truckId, { fromDate, toDate });
  if (!card) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Tracker", href: "/tracker" },
          { label: card.registration },
        ]}
        eyebrow={`Truck · ${fromDate} → ${toDate}`}
        title={card.registration}
        description={`${card.tripCount} trip${card.tripCount === 1 ? "" : "s"} · ${card.kmDriven.toLocaleString()} km`}
        actions={
          <>
            <Badge variant={card.status === "active" ? "success" : "neutral"}>
              {card.status}
            </Badge>
            <ScoreBadge score={card.score} />
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

      {/* P&L block */}
      <Card>
        <CardContent className="!p-5">
          <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-fg-tertiary">
            <Banknote className="size-3" /> P&L (KES)
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Revenue" value={card.revenueKes} tone="info" />
            <Metric label="Fuel" value={-card.fuelKes} tone="warning" />
            <Metric label="Expenses" value={-card.expensesKes} tone="warning" />
            <Metric label="Workshop" value={-card.workshopKes} tone="warning" />
            <Metric label="Tyres (of workshop)" value={-card.tyreKes} subtle />
            <Metric
              label="Gross profit"
              value={card.grossProfitKes}
              tone={card.grossProfitKes >= 0 ? "success" : "danger"}
              bold
            />
          </div>
          <div className="mt-3 text-[11px] text-fg-tertiary">
            Margin:{" "}
            <span
              className={
                "font-mono tnum " +
                (card.marginPct === null
                  ? ""
                  : card.marginPct >= 0
                    ? "text-status-success"
                    : "text-status-danger")
              }
            >
              {card.marginPct === null ? "—" : `${(card.marginPct * 100).toFixed(1)}%`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Operational KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Fuel}
          label="Fuel efficiency"
          primary={card.litresPer100km === null ? "—" : `${card.litresPer100km.toFixed(1)}`}
          unit="L/100km"
          secondary={card.kesPerKm === null ? "—" : `KSh ${card.kesPerKm.toFixed(1)} / km`}
          tone={
            card.litresPer100km === null
              ? "default"
              : card.litresPer100km <= 35
                ? "success"
                : card.litresPer100km <= 45
                  ? "warning"
                  : "danger"
          }
        />
        <KpiCard
          icon={Pause}
          label="Downtime"
          primary={String(card.downtimeDays)}
          unit="days"
          secondary={`${card.downtimePct.toFixed(0)}% of period`}
          tone={card.downtimePct < 10 ? "success" : card.downtimePct < 25 ? "warning" : "danger"}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Compliance"
          primary={
            card.complianceTotal === 0
              ? "—"
              : `${card.complianceValid}/${card.complianceTotal}`
          }
          unit="valid docs"
          secondary={
            card.complianceExpired > 0
              ? `${card.complianceExpired} expired`
              : card.complianceExpiring > 0
                ? `${card.complianceExpiring} expiring ≤ 30d`
                : "all valid"
          }
          tone={
            card.complianceExpired > 0
              ? "danger"
              : card.complianceExpiring > 0
                ? "warning"
                : "success"
          }
        />
        <KpiCard
          icon={Route}
          label="Utilisation"
          primary={String(card.tripCount)}
          unit="trips"
          secondary={
            card.daysSinceLastTrip === null
              ? "no trips yet"
              : `last trip ${card.daysSinceLastTrip}d ago`
          }
          tone={
            card.tripCount === 0
              ? "danger"
              : card.daysSinceLastTrip !== null && card.daysSinceLastTrip <= 7
                ? "success"
                : "warning"
          }
        />
      </div>

      {/* Score breakdown explainer */}
      <Card>
        <CardContent className="!p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-fg-tertiary">
              <Trophy className="size-3" /> Score breakdown
            </div>
            <ScoreBadge score={card.score} />
          </div>
          <div className="text-[11px] text-fg-secondary">
            Composite (0-100). Weights: 40 margin · 25 fuel · 15 uptime · 10 compliance · 10
            utilisation. Higher is better.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Link
          href={`/reports/profit-per-truck/${truckId}?from=${fromDate}&to=${toDate}`}
          className="group block rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-strong"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
            <Banknote className="size-3.5" /> Full P&L statement
          </div>
          <div className="text-[11px] text-fg-secondary">
            Direct + indirect cost breakdown.
          </div>
        </Link>
        <Link
          href={`/trucks/${truckId}`}
          className="group block rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-strong"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
            <Route className="size-3.5" /> Open truck details
          </div>
          <div className="text-[11px] text-fg-secondary">Asset card, drivers, telematics.</div>
        </Link>
        <Link
          href={`/workshop?truck=${truckId}`}
          className="group block rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-strong"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
            <Wrench className="size-3.5" /> Workshop history
          </div>
          <div className="text-[11px] text-fg-secondary">Job cards + spares + tyres.</div>
        </Link>
        <Link
          href={`/reports/fuel-efficiency?from=${fromDate}&to=${toDate}`}
          className="group block rounded-lg border border-border bg-bg-elevated p-4 transition-all hover:border-border-strong"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
            <Fuel className="size-3.5" /> Fleet fuel report
          </div>
          <div className="text-[11px] text-fg-secondary">Compare against other trucks.</div>
        </Link>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
  bold = false,
  subtle = false,
}: {
  label: string;
  value: number;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  bold?: boolean;
  subtle?: boolean;
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "success"
        ? "text-status-success"
        : tone === "warning"
          ? "text-status-warning"
          : tone === "danger"
            ? "text-status-danger"
            : subtle
              ? "text-fg-tertiary"
              : "text-fg-primary";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div
        className={
          `mt-0.5 font-mono tnum text-base ${bold ? "font-semibold" : "font-medium"} ${colour}`
        }
      >
        {Math.round(value).toLocaleString()}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  primary,
  unit,
  secondary,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  unit: string;
  secondary: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const colour =
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" :
    tone === "danger" ? "text-status-danger" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`font-mono tnum text-2xl font-semibold ${colour}`}>{primary}</span>
        <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">{unit}</span>
      </div>
      <div className="mt-1 text-[11px] text-fg-secondary">{secondary}</div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 75
      ? "bg-status-success/15 text-status-success ring-status-success/30"
      : score >= 50
        ? "bg-brand-blue/15 text-brand-blue ring-brand-blue/30"
        : score >= 25
          ? "bg-status-warning/15 text-status-warning ring-status-warning/30"
          : "bg-status-danger/15 text-status-danger ring-status-danger/30";
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold ring-1 " +
        cls
      }
    >
      <CheckCircle2 className="size-3" />
      {score}/100
    </span>
  );
}
