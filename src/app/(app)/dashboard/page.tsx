import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Fuel,
  IdCard as IdCardIcon,
  Shield,
  TriangleAlert,
  Truck,
  Wrench,
  FileWarning,
} from "lucide-react";
import { getComplianceSummary } from "@/server/actions/compliance";
import { getCurrentUser } from "@/server/auth/current-user";
import { listTrips } from "@/server/actions/trips";
import { listTrucks } from "@/server/actions/trucks";
import { listDrivers } from "@/server/actions/drivers";
import { listInvoices } from "@/server/actions/ar";
import { AreaChartCard } from "@/components/dashboard/area-chart-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CountUp } from "@/components/dashboard/count-up";
import { TodaysDispatch } from "@/components/dashboard/todays-dispatch";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OpsBoard, type TripRow } from "./ops-board";

/**
 * Dashboard — operations command center.
 *
 * Reading: B2B operations console for fuel dispatchers + accountants,
 * Linear × Mercury × Ramp language, density 7. ONE dominant hero
 * metric (trucks on the road right now), ONE inline live-status strip,
 * then operational sections in the order an operator actually consumes
 * them: today's dispatch → financial trend → urgent paperwork →
 * full trips board.
 *
 * No KPI-tile-grid, no eyebrow-above-every-section, no decorative
 * separators. Numbers are tabular-numeric monospace throughout.
 */

function buildRevenueChart(invoices: Awaited<ReturnType<typeof listInvoices>>) {
  const days = 30;
  const today = new Date();
  const buckets = new Array(days).fill(0).map(() => ({ revenue: 0, costs: 0 }));
  for (const inv of invoices) {
    const issued = new Date(inv.issueDate);
    const ageDays = Math.floor(
      (today.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (ageDays < 0 || ageDays >= days) continue;
    buckets[days - 1 - ageDays]!.revenue += inv.total * inv.fxRate;
  }
  return buckets.map((b, i) => ({
    day: String(i + 1).padStart(2, "0"),
    "Freight Revenue": Math.round(b.revenue),
    "Direct Costs": Math.round(b.costs),
  }));
}

function tripsToRows(
  trips: Awaited<ReturnType<typeof listTrips>>,
  trucksById: Map<string, { registration: string }>,
  driversById: Map<string, { fullName: string }>,
): TripRow[] {
  return trips.map((t) => ({
    id: t.number,
    truck: trucksById.get(t.truckId)?.registration ?? "—",
    origin: t.origin,
    destination: t.destination,
    km: t.actualKm ?? 0,
    driver: driversById.get(t.driverId)?.fullName ?? "—",
    status: t.status,
    revenue: t.revenueAmount,
  }));
}

export default async function DashboardPage() {
  const [me, compliance, trips, trucks, drivers, invoices] = await Promise.all([
    getCurrentUser(),
    getComplianceSummary(),
    listTrips(),
    listTrucks(),
    listDrivers(),
    listInvoices(),
  ]);

  const firstName = (me?.fullName ?? "Operator").split(" ")[0]!;
  const trucksById = new Map(trucks.map((t) => [t.id, { registration: t.registration }]));
  const driversById = new Map(drivers.map((d) => [d.id, { fullName: d.fullName }]));
  const allTrips = tripsToRows(trips, trucksById, driversById);
  const revenueChart = buildRevenueChart(invoices);

  // East Africa Time greeting (UTC+3) — server may be in any TZ.
  const eatHourString = new Date().toLocaleString("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Africa/Nairobi",
  });
  const hour = parseInt(eatHourString, 10);
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayLine = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Nairobi",
  });

  // Counts off the seed trips (real feed lands when the Postgres trips
  // table is wired). All operator-facing numbers come from one source.
  const onRoad = allTrips.filter((t) =>
    ["in_transit", "at_border", "loading"].includes(t.status),
  ).length;
  const atBorder = allTrips.filter((t) => t.status === "at_border").length;
  const delayed = allTrips.filter((t) => t.status === "delayed").length;
  const deliveredMtd = allTrips.filter((t) => t.status === "delivered").length;
  // Revenue MTD is the sum of all invoices issued this calendar month, in
  // KES equivalent. Zero is the correct read when no invoices exist yet.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const revenueMtd = invoices
    .filter((i) => new Date(i.issueDate) >= monthStart)
    .reduce((s, i) => s + i.total * i.fxRate, 0);
  const fleetSize = trucks.length;

  // Revenue sparkline + period delta, derived from the 30-day series.
  const revSeries = revenueChart.map((d) => d["Freight Revenue"] as number);
  const firstHalf = revSeries.slice(0, 15).reduce((a, b) => a + b, 0);
  const secondHalf = revSeries.slice(15).reduce((a, b) => a + b, 0);
  const revDelta = firstHalf > 0 ? (secondHalf - firstHalf) / firstHalf : undefined;
  const needsAttentionCount = delayed + atBorder;

  // Needs-attention rows from real compliance summary (Postgres lands later).
  const attention = buildAttention(compliance);

  return (
    <div className="stagger-children flex flex-col gap-8">
      {/* HERO — greeting + dominant live metric */}
      <section className="flex flex-col gap-6 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-tertiary">
            {todayLine}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-tertiary">
            Nairobi · EAT
          </p>
        </div>

        <div className="grid gap-3">
          <h1 className="font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-fg-primary">
            {greeting}, {firstName}.
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-fg-secondary">
            <span className="font-mono tnum font-semibold text-fg-primary">
              <CountUp value={onRoad} />
            </span>{" "}
            trucks on the road right now, of{" "}
            <span className="font-mono tnum text-fg-primary">{fleetSize}</span>{" "}
            in the fleet.
          </p>
        </div>

      </section>

      {/* HERO KPIs — 4 across (DESIGN.md §10) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="On the road"
          value={onRoad}
          icon={<Truck className="size-4" strokeWidth={1.5} />}
          tone="info"
          hint={`of ${fleetSize} in the fleet`}
        />
        <KpiCard
          label="Revenue MTD"
          value={formatMoney(revenueMtd, "KES", { compact: true }).replace("KSh ", "")}
          unit="KES"
          icon={<Banknote className="size-4" strokeWidth={1.5} />}
          delta={revDelta}
          trend={revSeries}
        />
        <KpiCard
          label="Delivered MTD"
          value={deliveredMtd}
          icon={<CheckCircle2 className="size-4" strokeWidth={1.5} />}
          tone="success"
        />
        <KpiCard
          label="Needs attention"
          value={needsAttentionCount}
          icon={<TriangleAlert className="size-4" strokeWidth={1.5} />}
          tone={needsAttentionCount > 0 ? "danger" : "default"}
          hint={`${delayed} delayed · ${atBorder} at border`}
        />
      </div>

      {/* TODAY · TOMORROW dispatch (already strong, kept) */}
      <TodaysDispatch />

      {/* Revenue trend + Attention */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <AreaChartCard
          title="Revenue vs direct costs"
          data={revenueChart}
          index="day"
          categories={["Freight Revenue", "Direct Costs"]}
          format="kes-compact"
          delta={revDelta}
        />

        <section className="surface-card flex flex-col overflow-hidden">
          <header className="border-b border-border px-5 py-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-fg-primary">
              Needs attention
            </h2>
            <p className="text-xs text-fg-tertiary">
              Compliance + workshop signals across the fleet.
            </p>
          </header>
          {attention.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-fg-tertiary">
              All compliance and workshop signals are green.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attention.map((a) => (
                <li key={a.title}>
                  <Link
                    href={a.href}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bg-surface/60"
                  >
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border",
                        a.tone === "danger"
                          ? "border-status-danger/25 bg-status-danger/10 text-status-danger"
                          : "border-status-warning/30 bg-status-warning/10 text-status-warning",
                      )}
                    >
                      <a.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 truncate">
                        <span className="font-mono tnum text-sm font-semibold text-fg-primary">
                          {a.count}
                        </span>
                        <span className="truncate text-sm text-fg-primary">
                          {a.title}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-fg-tertiary">
                        {a.hint}
                      </p>
                    </div>
                    <ArrowUpRight className="size-3.5 shrink-0 text-fg-tertiary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <OpsBoard initialTrips={allTrips} />
    </div>
  );
}

type AttentionItem = {
  icon: typeof Truck;
  count: number;
  title: string;
  hint: string;
  href: string;
  tone: "warning" | "danger";
};

function buildAttention(
  s: Awaited<ReturnType<typeof getComplianceSummary>>,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (s.trucksInWorkshop > 0) {
    items.push({
      icon: Wrench,
      count: s.trucksInWorkshop,
      title: "in workshop",
      hint: "Open job cards.",
      tone: "danger",
      href: "/workshop",
    });
  }
  if (s.fuelComplianceExpiring > 0) {
    items.push({
      icon: Fuel,
      count: s.fuelComplianceExpiring,
      title: "fuel-carrier documents expiring",
      hint: "HazMat, EPRA, PUC, calibration.",
      tone: "danger",
      href: "/compliance?filter=fuel",
    });
  }
  if (s.insuranceExpiring > 0) {
    items.push({
      icon: Shield,
      count: s.insuranceExpiring,
      title: "insurance policies expiring",
      hint: "Renew within 30 days.",
      tone: "warning",
      href: "/compliance?filter=insurance",
    });
  }
  if (s.comesaExpiring > 0) {
    items.push({
      icon: FileWarning,
      count: s.comesaExpiring,
      title: "COMESA permits expiring",
      hint: "Trucks and drivers.",
      tone: "warning",
      href: "/compliance?filter=comesa",
    });
  }
  if (s.driverDocsExpiring > 0) {
    items.push({
      icon: IdCardIcon,
      count: s.driverDocsExpiring,
      title: "driver licences or medicals expiring",
      hint: "Within 30 days.",
      tone: "warning",
      href: "/compliance?filter=driver",
    });
  }
  return items;
}
