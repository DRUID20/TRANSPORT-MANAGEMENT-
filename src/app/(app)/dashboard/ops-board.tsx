"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { StatusPill, type TripStatus } from "@/components/dashboard/status-pill";
import { RouteVisual } from "@/components/dashboard/route-visual";
import { StatusTabs, type StatusTab } from "@/components/dashboard/status-tabs";
import { formatMoney } from "@/lib/format";

export type TripRow = {
  id: string;
  truck: string;
  origin: string;
  destination: string;
  km: number;
  driver: string;
  status: TripStatus;
  revenue: number;
};

/**
 * OpsBoard — client island for the interactive trips list with status
 * tabs. Kept narrow on purpose: takes a snapshot of rows from the server
 * page and manages the active tab in local state. Once the real trip
 * feed is on Postgres this stays the same — just point initialTrips
 * at the live action.
 */
export function OpsBoard({ initialTrips }: { initialTrips: TripRow[] }) {
  const [activeTab, setActiveTab] = useState("all");
  const trips =
    activeTab === "all" ? initialTrips : initialTrips.filter((t) => t.status === activeTab);

  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: initialTrips.length },
    { key: "planned", label: "Planned", count: initialTrips.filter((t) => t.status === "planned").length },
    { key: "loading", label: "Loading", count: initialTrips.filter((t) => t.status === "loading").length },
    { key: "in_transit", label: "In transit", count: initialTrips.filter((t) => t.status === "in_transit").length },
    { key: "at_border", label: "At border", count: initialTrips.filter((t) => t.status === "at_border").length },
    { key: "delivered", label: "Delivered", count: initialTrips.filter((t) => t.status === "delivered").length },
    { key: "delayed", label: "Delayed", count: initialTrips.filter((t) => t.status === "delayed").length },
  ];

  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-fg-primary">
            Operations
          </h2>
          <p className="text-xs text-fg-tertiary">
            All trips moving through the fleet right now.
          </p>
        </div>
        <StatusTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-surface/40 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
              <th className="px-5 py-3 font-semibold">Trip</th>
              <th className="px-5 py-3 font-semibold">Truck</th>
              <th className="px-5 py-3 font-semibold">Route</th>
              <th className="px-5 py-3 font-semibold">Driver</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Revenue (KES)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trips.map((t) => (
              <tr key={t.id} className="group transition-colors hover:bg-brand-blue/[0.04]">
                <td className="px-5 py-3.5 font-mono text-[11px] text-fg-secondary">
                  {t.id}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-md border border-border bg-bg-surface text-fg-tertiary">
                      <Truck className="size-3.5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-fg-primary">
                      {t.truck}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <RouteVisual
                    origin={t.origin}
                    destination={t.destination}
                    km={t.km}
                  />
                </td>
                <td className="px-5 py-3.5 text-fg-secondary">{t.driver}</td>
                <td className="px-5 py-3.5">
                  <StatusPill status={t.status} />
                </td>
                <td className="px-5 py-3.5 text-right font-mono tnum text-fg-primary">
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
    </section>
  );
}
