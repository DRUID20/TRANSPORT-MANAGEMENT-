import Link from "next/link";
import { ArrowRight, Award, Pause, Trophy, Truck } from "lucide-react";
import { customerRouteMatrix, idleTrucks, truckLeaderboard } from "@/server/actions/tracker";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

export default async function TrackerHubPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const fromDate = from ?? startOfYear;
  const toDate = to ?? today;

  const [board, idle, matrix] = await Promise.all([
    truckLeaderboard({ fromDate, toDate }),
    idleTrucks(14),
    customerRouteMatrix({ fromDate, toDate }),
  ]);

  const champion = board[0];
  const totalFleetRevenue = board.reduce((s, t) => s + t.revenueKes, 0);
  const totalFleetProfit = board.reduce((s, t) => s + t.grossProfitKes, 0);
  const avgScore =
    board.length > 0
      ? Math.round(board.reduce((s, t) => s + t.score, 0) / board.length)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations · Performance"
        title="Truck performance tracker"
        description={`KPIs and leaderboard for every truck. ${fromDate} → ${toDate}.`}
      />

      <div className="surface-card p-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              From
            </label>
            <Input
              type="date"
              name="from"
              defaultValue={fromDate}
              className="h-9 font-mono tnum sm:max-w-[180px]"
            />
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              To
            </label>
            <Input
              type="date"
              name="to"
              defaultValue={toDate}
              className="h-9 font-mono tnum sm:max-w-[180px]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Reload
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat icon={Trophy} label="Champion" value={champion?.registration ?? "—"} tone="success" />
        <Stat icon={Award} label="Avg score" value={`${avgScore}/100`} tone="info" />
        <Stat
          icon={Truck}
          label="Fleet revenue"
          value={`KSh ${Math.round(totalFleetRevenue).toLocaleString()}`}
        />
        <Stat
          icon={Pause}
          label="Idle ≥ 14 d"
          value={String(idle.length)}
          tone={idle.length > 0 ? "warning" : "success"}
        />
      </div>

      {/* Leaderboard */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-fg-primary">
            Fleet leaderboard
          </h2>
          <p className="text-[11px] text-fg-tertiary">
            Score = 40% margin · 25% fuel · 15% uptime · 10% compliance · 10% utilisation
          </p>
        </div>
        {board.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icon={Trophy}
              title="No tracker data in this range"
              description="Pick a wider date range or wait for trip + fuel logs to accumulate."
              size="sm"
            />
          </div>
        ) : (
          <DataTable
            density="compact"
            caption={
              <span>
                {board.length} truck{board.length === 1 ? "" : "s"} measured · period {fromDate} → {toDate}
              </span>
            }
          >
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>#</DataTableHeaderCell>
                <DataTableHeaderCell>Truck</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Trips</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Revenue</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Profit</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Margin</DataTableHeaderCell>
                <DataTableHeaderCell align="right">L/100km</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Downtime</DataTableHeaderCell>
                <DataTableHeaderCell align="right">Score</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {board.map((r, i) => (
                <DataTableRow key={r.truckId} linkHref={`/tracker/${r.truckId}`}>
                  <DataTableCell mono className="text-fg-tertiary">
                    {i + 1}
                  </DataTableCell>
                  <DataTableCell>
                    <Link
                      href={`/tracker/${r.truckId}`}
                      className="font-mono text-xs font-semibold text-fg-primary group-hover:text-brand-blue"
                    >
                      {r.registration}
                    </Link>
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-fg-secondary">
                    {r.tripCount}
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-brand-blue">
                    {Math.round(r.revenueKes).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell
                    mono
                    align="right"
                    className={cn(
                      "font-semibold",
                      r.grossProfitKes >= 0 ? "text-status-success" : "text-status-danger",
                    )}
                  >
                    {Math.round(r.grossProfitKes).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-fg-secondary">
                    {r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(1)}%`}
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-fg-secondary">
                    {r.litresPer100km === null ? "—" : r.litresPer100km.toFixed(1)}
                  </DataTableCell>
                  <DataTableCell mono align="right" className="text-fg-secondary">
                    {r.downtimeDays === 0
                      ? "—"
                      : `${r.downtimeDays}d (${r.downtimePct.toFixed(0)}%)`}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <ScorePill score={r.score} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-fg-primary">Idle trucks</h3>
            <Link href="/tracker/idle" className="text-[11px] text-brand-blue hover:underline">
              See all →
            </Link>
          </div>
          {idle.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-fg-tertiary">
              Every truck is active.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {idle.slice(0, 5).map((r) => (
                <li
                  key={r.truckId}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <Link
                    href={`/tracker/${r.truckId}`}
                    className="flex items-center gap-2 text-fg-primary hover:text-brand-blue"
                  >
                    <Truck className="size-3.5 text-fg-tertiary" />
                    <span className="font-mono text-xs font-semibold">
                      {r.registration}
                    </span>
                  </Link>
                  <div className="text-right">
                    <div className="font-mono tnum text-xs text-status-warning">
                      {r.daysIdle === null ? "never used" : `${r.daysIdle}d`}
                    </div>
                    <div className="font-mono text-[10px] text-fg-tertiary">
                      {r.defaultDriverName ?? "no driver"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-fg-primary">
              Top customer × route
            </h3>
            <Link href="/tracker/matrix" className="text-[11px] text-brand-blue hover:underline">
              Full matrix →
            </Link>
          </div>
          {matrix.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-fg-tertiary">
              No trips in the range.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {matrix.slice(0, 5).map((c) => (
                <li
                  key={c.customerId + c.route}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="overflow-hidden">
                    <div className="truncate text-sm font-medium text-fg-primary">
                      {c.customerName}
                    </div>
                    <div className="font-mono text-[10px] text-fg-tertiary">
                      {c.route}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono tnum text-xs text-brand-blue">
                      KSh {Math.round(c.revenueKes).toLocaleString()}
                    </div>
                    <div className="font-mono text-[10px] text-fg-tertiary">
                      {c.tripCount} trip{c.tripCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/tracker/idle"
          className="surface-card surface-interactive lift-on-hover group block p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning ring-1 ring-status-warning/30">
              <Pause className="size-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
                Idle truck list
              </div>
              <div className="text-[11px] text-fg-secondary">
                Trucks with no trip activity in the last 14 days.
              </div>
            </div>
            <ArrowRight className="size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
        <Link
          href="/tracker/matrix"
          className="surface-card surface-interactive lift-on-hover group block p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
              <Trophy className="size-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
                Customer × route matrix
              </div>
              <div className="text-[11px] text-fg-secondary">
                Pivot of who's running which lanes and how much revenue each generates.
              </div>
            </div>
            <ArrowRight className="size-3.5 text-fg-tertiary group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      <p className="text-center text-[11px] text-fg-tertiary">
        Fleet revenue {Math.round(totalFleetRevenue).toLocaleString()} · gross profit{" "}
        {Math.round(totalFleetProfit).toLocaleString()} KES · period {fromDate} → {toDate}
      </p>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 75
      ? "bg-status-success/10 text-status-success ring-status-success/20"
      : score >= 50
        ? "bg-brand-blue/10 text-brand-blue ring-brand-blue/20"
        : score >= 25
          ? "bg-status-warning/10 text-status-warning ring-status-warning/25"
          : "bg-status-danger/10 text-status-danger ring-status-danger/20";
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset",
        cls,
      )}
    >
      {score}
    </span>
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
  value: string;
  tone?: "default" | "info" | "success" | "warning";
}) {
  const colour =
    tone === "info"
      ? "text-brand-blue"
      : tone === "success"
        ? "text-status-success"
        : tone === "warning"
          ? "text-status-warning"
          : "text-fg-primary";
  return (
    <div className="surface-card lift-on-hover p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={cn("mt-1 font-mono tnum text-lg font-semibold", colour)}>
        {value}
      </div>
    </div>
  );
}
