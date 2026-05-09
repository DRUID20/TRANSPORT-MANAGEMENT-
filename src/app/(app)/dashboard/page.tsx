"use client";

import { Activity, DollarSign, Fuel, Route, Truck, Users } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AreaChartCard } from "@/components/dashboard/area-chart-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatusPill, type TripStatus } from "@/components/dashboard/status-pill";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

// Sample data — replaced with real queries in Phase 1+
const trend30 = (n: number, base = 50, variance = 20) =>
  Array.from({ length: n }, (_, i) => Math.round(base + Math.sin(i * 0.6) * variance + Math.random() * 6));

const revenueChart = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  return {
    day: String(day).padStart(2, "0"),
    "Freight Revenue": Math.round(380000 + Math.sin(i * 0.4) * 120000 + Math.random() * 40000),
    "Direct Costs": Math.round(220000 + Math.sin(i * 0.5) * 80000 + Math.random() * 30000),
  };
});

const recentTrips: Array<{
  id: string;
  truck: string;
  route: string;
  driver: string;
  status: TripStatus;
  revenue: number;
}> = [
  { id: "TRP-2026-0142", truck: "KCB 421R", route: "Mombasa → Kampala", driver: "Joseph M.", status: "in_transit", revenue: 685000 },
  { id: "TRP-2026-0141", truck: "KDA 117K", route: "Nairobi → Juba", driver: "Ali H.", status: "at_border", revenue: 1240000 },
  { id: "TRP-2026-0140", truck: "KBW 882P", route: "Mombasa → Kigali", driver: "Daniel O.", status: "delivered", revenue: 920000 },
  { id: "TRP-2026-0139", truck: "KCT 559M", route: "Mombasa → Goma", driver: "Mwangi K.", status: "delayed", revenue: 1580000 },
  { id: "TRP-2026-0138", truck: "KDD 304L", route: "Nairobi → Bujumbura", driver: "Patrick W.", status: "closed", revenue: 845000 },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.16em] text-fg-tertiary">
            Operations · Live
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg-primary">
            Fleet Command Centre
          </h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Today's performance across the fleet — KES with USD equivalent.
          </p>
        </div>
        <FilterBar />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Active Trips"
          value="47"
          delta={0.082}
          trend={trend30(30, 40, 8)}
          icon={Activity}
        />
        <KpiCard
          label="Trucks On Road"
          value="38"
          unit="of 52"
          delta={0.025}
          trend={trend30(30, 35, 5)}
          icon={Truck}
        />
        <KpiCard
          label="Tonnes (MTD)"
          value="9,420"
          unit="t"
          delta={0.118}
          trend={trend30(30, 60, 15)}
          icon={Route}
        />
        <KpiCard
          label="Revenue (MTD)"
          value="14.8M"
          unit="KES"
          delta={0.067}
          trend={trend30(30, 70, 20)}
          icon={DollarSign}
          hint="≈ $114,728 USD"
        />
        <KpiCard
          label="Fuel Eff."
          value="3.42"
          unit="km/L"
          delta={-0.014}
          trend={trend30(30, 45, 6)}
          icon={Fuel}
        />
        <KpiCard
          label="Drivers Active"
          value="46"
          delta={0.0}
          trend={trend30(30, 50, 3)}
          icon={Users}
        />
      </div>

      {/* Chart + side cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaChartCard
            title="Revenue vs Direct Costs — last 30 days"
            data={revenueChart}
            index="day"
            categories={["Freight Revenue", "Direct Costs"]}
            valueFormatter={(n) => formatMoney(n, "KES", { compact: true })}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cross-border status</CardTitle>
            <CardDescription>Live border-crossing snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {[
                { route: "Malaba (KE → UG)", units: 12, status: "warning" },
                { route: "Busia (KE → UG)", units: 6, status: "info" },
                { route: "Namanga (KE → TZ)", units: 4, status: "info" },
                { route: "Nadapal (KE → SS)", units: 2, status: "danger" },
                { route: "Mutukula (UG → TZ)", units: 1, status: "info" },
              ].map((b) => (
                <li key={b.route} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-fg-primary">{b.route}</div>
                    <div className="font-mono text-xs text-fg-tertiary">{b.units} unit{b.units === 1 ? "" : "s"}</div>
                  </div>
                  <span
                    className={
                      "inline-flex size-2.5 rounded-full ring-2 " +
                      (b.status === "danger"
                        ? "bg-status-danger ring-status-danger/20"
                        : b.status === "warning"
                          ? "bg-status-warning ring-status-warning/20"
                          : "bg-status-info ring-status-info/20")
                    }
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent trips */}
      <Card>
        <CardHeader>
          <CardTitle>Recent trips</CardTitle>
          <CardDescription>Sample data — wired to the live feed in Phase 2</CardDescription>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-tertiary">
                  <th className="px-5 py-3 font-medium">Trip ID</th>
                  <th className="px-5 py-3 font-medium">Truck</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Revenue (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTrips.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-3 font-mono text-xs text-fg-secondary">{t.id}</td>
                    <td className="px-5 py-3 font-mono text-xs text-fg-primary">{t.truck}</td>
                    <td className="px-5 py-3 text-fg-primary">{t.route}</td>
                    <td className="px-5 py-3 text-fg-secondary">{t.driver}</td>
                    <td className="px-5 py-3"><StatusPill status={t.status} /></td>
                    <td className="px-5 py-3 text-right font-mono tnum text-fg-primary">
                      {formatMoney(t.revenue, "KES").replace("KSh ", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
