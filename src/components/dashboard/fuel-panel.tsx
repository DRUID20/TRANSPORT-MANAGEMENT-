"use client";

import { useEffect, useState } from "react";
import { Fuel } from "lucide-react";
import { fleetFuelSnapshot } from "@/server/actions/fuel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const flag: Record<string, string> = {
  KE: "🇰🇪",
  UG: "🇺🇬",
  TZ: "🇹🇿",
  RW: "🇷🇼",
  SS: "🇸🇸",
  CD: "🇨🇩",
  BI: "🇧🇮",
  ET: "🇪🇹",
};

const name: Record<string, string> = {
  KE: "Kenya",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  SS: "South Sudan",
  CD: "DR Congo",
  BI: "Burundi",
  ET: "Ethiopia",
};

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function FuelPanel() {
  const [snap, setSnap] = useState<Awaited<ReturnType<typeof fleetFuelSnapshot>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fleetFuelSnapshot().then((s) => {
      if (!cancelled) setSnap(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Fuel usage &amp; cost</CardTitle>
            <CardDescription>Across the fleet · live</CardDescription>
          </div>
          <div className="flex size-9 items-center justify-center rounded-md bg-status-warning/10 text-status-warning ring-1 ring-status-warning/20">
            <Fuel className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-fg-tertiary">Avg efficiency</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="kpi-number text-fg-primary">
                {snap?.fleetKmPerLitre ?? "—"}
              </span>
              <span className="font-mono text-[11px] text-fg-tertiary">km/L</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-fg-tertiary">Total cost</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="kpi-number text-fg-primary">
                {snap ? compact(snap.totalCostKes) : "—"}
              </span>
              <span className="font-mono text-[11px] text-fg-tertiary">KES</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {snap === null
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse rounded bg-bg-base/60" />
              ))
            : snap.byCountry.length === 0
              ? (
                  <p className="text-center text-xs text-fg-tertiary">
                    No fuel logs yet.
                  </p>
                )
              : snap.byCountry.map((c) => (
                  <div key={c.code} className="flex items-center gap-3">
                    <span className="text-base">{flag[c.code] ?? "🏳"}</span>
                    <span className="w-20 text-xs text-fg-secondary">
                      {name[c.code] ?? c.code}
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-base">
                      <div
                        className="h-full rounded-full bg-status-warning"
                        style={{ width: `${c.pct * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tnum text-fg-tertiary">
                      {(c.pct * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
        </div>

        <div>
          <div className="text-xs text-fg-tertiary">Total litres</div>
          <div className="mt-1 font-mono tnum text-base font-semibold text-fg-primary">
            {snap ? snap.totalLitres.toLocaleString() : "—"} L
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
