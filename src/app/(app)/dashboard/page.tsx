"use client";

import { useState } from "react";
import { Activity, DollarSign, Fuel, Route as RouteIcon, Truck, Users } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AreaChartCard } from "@/components/dashboard/area-chart-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { StatusPill, type TripStatus } from "@/components/dashboard/status-pill";
import { ProgressHero } from "@/components/dashboard/progress-hero";
import { FleetDistribution } from "@/components/dashboard/fleet-distribution";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { TopPerformer } from "@/components/dashboard/top-performer";
import { FuelPanel } from "@/components/dashboard/fuel-panel";
import { RouteVisual } from "@/components/dashboard/route-visual";
import { StatusTabs, type StatusTab } from "@/components/dashboard/status-tabs";
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
  Array.from({ length: n }, (_, i) =>
    Math.round(base + Math.sin(i * 0.6) * variance + Math.random() * 6),
  );

const revenueChart = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  return {
    day: String(day).padStart(2, "0"),
    "Freight Revenue": Math.round(380000 + Math.sin(i * 0.4) * 120000 + Math.random() * 40000),
    "Direct Costs": Math.round(220000 + Math.sin(i * 0.5) * 80000 + Math.random() * 30000),
  };
});

type TripRow = {
  id: string;
  truck: string;
  origin: string;
  destination: string;
  originFlag: string;
  destinationFlag: string;
  km: number;
  driver: string;
  status: TripStatus;
  revenue: number;
};

const allTrips: TripRow[] = [
  { id: "TRP-2026-0142", truck: "KCB 421R", origin: "Mombasa", destination: "Kampala",  originFlag: "🇰🇪", destinationFlag: "🇺🇬", km: 1180, driver: "Joseph M.", status: "in_transit", revenue: 685000 },
  { id: "TRP-2026-0141", truck: "KDA 117K", origin: "Nairobi", destination: "Juba",     originFlag: "🇰🇪", destinationFlag: "🇸🇸", km: 1640, driver: "Ali H.",     status: "at_border",  revenue: 1240000 },
  { id: "TRP-2026-0140", truck: "KBW 882P", origin: "Mombasa", destination: "Kigali",   originFlag: "🇰🇪", destinationFlag: "🇷🇼", km: 1640, driver: "Daniel O.",  status: "delivered",  revenue: 920000 },
  { id: "TRP-2026-0139", truck: "KCT 559M", origin: "Mombasa", destination: "Goma",     originFlag: "🇰🇪", destinationFlag: "🇨🇩", km: 2080, driver: "Mwangi K.",  status: "delayed",    revenue: 1580000 },
  { id: "TRP-2026-0138", truck: "KDD 304L", origin: "Nairobi", destination: "Bujumbura",originFlag: "🇰🇪", destinationFlag: "🇧🇮", km: 1920, driver: "Patrick W.", status: "closed",     revenue: 845000 },
  { id: "TRP-2026-0137", truck: "KCC 209N", origin: "Nairobi", destination: "Dar es Salaam", originFlag: "🇰🇪", destinationFlag: "🇹🇿", km: 1340, driver: "Stephen N.", status: "loading",    revenue: 720000 },
  { id: "TRP-2026-0136", truck: "KDB 612J", origin: "Mombasa", destination: "Mwanza",   originFlag: "🇰🇪", destinationFlag: "🇹🇿", km: 1480, driver: "Hassan O.",  status: "planned",    revenue: 695000 },
];

const statusTabs: StatusTab[] = [
  { key: "all",        label: "All",        count: allTrips.length },
  { key: "planned",    label: "Planned",    count: allTrips.filter((t) => t.status === "planned").length },
  { key: "loading",    label: "Loading",    count: allTrips.filter((t) => t.status === "loading").length },
  { key: "in_transit", label: "In Transit", count: allTrips.filter((t) => t.status === "in_transit").length },
  { key: "at_border",  label: "At Border",  count: allTrips.filter((t) => t.status === "at_border").length },
  { key: "delivered",  label: "Delivered",  count: allTrips.filter((t) => t.status === "delivered").length },
  { key: "delayed",    label: "Delayed",    count: allTrips.filter((t) => t.status === "delayed").length },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("all");
  const trips = activeTab === "all" ? allTrips : allTrips.filter((t) => t.status === activeTab);

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

      {/* Top row — Progress hero + Top performer */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgressHero
            achieved={9420}
            target={12000}
            unit="tonnes"
            achievedKes="14.8M KES"
            achievedUsd="≈ $114,728"
          />
        </div>
        <TopPerformer />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Active Trips"     value="47"     delta={0.082}  trend={trend30(30, 40, 8)}  icon={Activity} />
        <KpiCard label="Trucks On Road"   value="38"     unit="of 52"   delta={0.025}               trend={trend30(30, 35, 5)}  icon={Truck} />
        <KpiCard label="Tonnes (MTD)"     value="9,420"  unit="t"       delta={0.118}               trend={trend30(30, 60, 15)} icon={RouteIcon} />
        <KpiCard label="Revenue (MTD)"    value="14.8M"  unit="KES"     delta={0.067}               trend={trend30(30, 70, 20)} icon={DollarSign} hint="≈ $114,728 USD" />
        <KpiCard label="Fuel Eff."        value="3.42"   unit="km/L"    delta={-0.014}              trend={trend30(30, 45, 6)}  icon={Fuel} />
        <KpiCard label="Drivers Active"   value="46"     delta={0.0}    trend={trend30(30, 50, 3)}  icon={Users} />
      </div>

      {/* Chart + sidebar widgets */}
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
        <NeedsAttention />
      </div>

      {/* Fleet distribution + Fuel + Cross-border */}
      <div className="grid gap-4 lg:grid-cols-3">
        <FleetDistribution />
        <FuelPanel />
        <Card>
          <CardHeader>
            <CardTitle>Cross-border status</CardTitle>
            <CardDescription>Live border-crossing snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {[
                { route: "Malaba (KE → UG)",  units: 12, status: "warning" },
                { route: "Busia (KE → UG)",   units: 6,  status: "info" },
                { route: "Namanga (KE → TZ)", units: 4,  status: "info" },
                { route: "Nadapal (KE → SS)", units: 2,  status: "danger" },
                { route: "Mutukula (UG → TZ)", units: 1, status: "info" },
              ].map((b) => (
                <li key={b.route} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-fg-primary">{b.route}</div>
                    <div className="font-mono text-xs text-fg-tertiary">
                      {b.units} unit{b.units === 1 ? "" : "s"}
                    </div>
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

      {/* Trips table with status tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Trips</CardTitle>
              <CardDescription>Sample data — wired to the live feed in Phase 2</CardDescription>
            </div>
            <StatusTabs tabs={statusTabs} active={activeTab} onChange={setActiveTab} />
          </div>
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
                {trips.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-bg-base/40">
                    <td className="px-5 py-4 font-mono text-xs text-fg-secondary">{t.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-bg-base ring-1 ring-border">
                          <Truck className="size-3.5 text-fg-tertiary" />
                        </span>
                        <span className="font-mono text-xs text-fg-primary">{t.truck}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <RouteVisual
                        origin={t.origin}
                        destination={t.destination}
                        originFlag={t.originFlag}
                        destinationFlag={t.destinationFlag}
                        km={t.km}
                      />
                    </td>
                    <td className="px-5 py-4 text-fg-secondary">{t.driver}</td>
                    <td className="px-5 py-4">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-5 py-4 text-right font-mono tnum text-fg-primary">
                      {formatMoney(t.revenue, "KES").replace("KSh ", "")}
                    </td>
                  </tr>
                ))}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-fg-tertiary">
                      No trips in this status.
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
