import Link from "next/link";
import { ArrowRight, Award, Pause, Trophy, Truck } from "lucide-react";
import { customerRouteMatrix, idleTrucks, truckLeaderboard } from "@/server/actions/tracker";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

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

  const board = await truckLeaderboard({ fromDate, toDate });
  const idle = await idleTrucks(14);
  const matrix = await customerRouteMatrix({ fromDate, toDate });

  const champion = board[0];
  const totalFleetRevenue = board.reduce((s, t) => s + t.revenueKes, 0);
  const totalFleetProfit = board.reduce((s, t) => s + t.grossProfitKes, 0);
  const avgScore =
    board.length > 0 ? Math.round(board.reduce((s, t) => s + t.score, 0) / board.length) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations · Performance"
        title="Truck Performance Tracker"
        description={`KPIs and leaderboard for every truck. ${fromDate} → ${toDate}.`}
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={Trophy} label="Champion" value={champion?.registration ?? "—"} tone="success" />
        <Stat
          icon={Award}
          label="Avg score"
          value={`${avgScore}/100`}
          tone="info"
        />
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
      <Card>
        <CardContent className="!p-0">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-fg-primary">Fleet leaderboard</h2>
            <p className="text-[11px] text-fg-tertiary">
              Composite score = 40% margin + 25% fuel + 15% uptime + 10% compliance + 10% utilisation
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Truck</th>
                  <th className="px-3 py-2 text-right font-medium">Trips</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Profit</th>
                  <th className="px-3 py-2 text-right font-medium">Margin</th>
                  <th className="px-3 py-2 text-right font-medium">L/100km</th>
                  <th className="px-3 py-2 text-right font-medium">Downtime</th>
                  <th className="px-3 py-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {board.map((r, i) => (
                  <tr key={r.truckId} className="group transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-2 font-mono tnum text-fg-tertiary">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tracker/${r.truckId}`}
                        className="font-mono text-xs text-fg-primary group-hover:text-brand-blue"
                      >
                        {r.registration}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.tripCount}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-brand-blue">
                      {Math.round(r.revenueKes).toLocaleString()}
                    </td>
                    <td
                      className={
                        "px-3 py-2 text-right font-mono tnum font-semibold " +
                        (r.grossProfitKes >= 0 ? "text-status-success" : "text-status-danger")
                      }
                    >
                      {Math.round(r.grossProfitKes).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.marginPct === null ? "—" : `${(r.marginPct * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.litresPer100km === null ? "—" : r.litresPer100km.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tnum text-fg-secondary">
                      {r.downtimeDays === 0 ? "—" : `${r.downtimeDays}d (${r.downtimePct.toFixed(0)}%)`}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ScorePill score={r.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="!p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-fg-primary">Idle trucks</h3>
              <Link href="/tracker/idle" className="text-[11px] text-brand-blue hover:underline">
                See all →
              </Link>
            </div>
            {idle.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-fg-tertiary">
                Every truck is active.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {idle.slice(0, 5).map((r) => (
                  <li key={r.truckId} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <Link
                      href={`/tracker/${r.truckId}`}
                      className="flex items-center gap-2 text-fg-primary hover:text-brand-blue"
                    >
                      <Truck className="size-3.5 text-fg-tertiary" />
                      <span className="font-mono text-xs">{r.registration}</span>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="!p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-fg-primary">Top customer × route</h3>
              <Link href="/tracker/matrix" className="text-[11px] text-brand-blue hover:underline">
                Full matrix →
              </Link>
            </div>
            {matrix.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-fg-tertiary">
                No trips in the range.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {matrix.slice(0, 5).map((c) => (
                  <li
                    key={c.customerId + c.route}
                    className="flex items-center justify-between gap-3 px-5 py-2.5"
                  >
                    <div className="overflow-hidden">
                      <div className="truncate text-sm text-fg-primary">{c.customerName}</div>
                      <div className="font-mono text-[10px] text-fg-tertiary">{c.route}</div>
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/tracker/idle"
          className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-status-warning/10 text-status-warning ring-1 ring-status-warning/30">
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
          className="group block rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
              <Trophy className="size-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-fg-primary group-hover:text-brand-blue">
                Customer × Route matrix
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
      ? "bg-status-success/15 text-status-success ring-status-success/30"
      : score >= 50
        ? "bg-brand-blue/15 text-brand-blue ring-brand-blue/30"
        : score >= 25
          ? "bg-status-warning/15 text-status-warning ring-status-warning/30"
          : "bg-status-danger/15 text-status-danger ring-status-danger/30";
  return (
    <span
      className={
        "inline-flex min-w-10 items-center justify-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1 " +
        cls
      }
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
    tone === "info" ? "text-brand-blue" :
    tone === "success" ? "text-status-success" :
    tone === "warning" ? "text-status-warning" : "text-fg-primary";
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={`mt-1 font-mono tnum text-lg font-medium ${colour}`}>{value}</div>
    </div>
  );
}
