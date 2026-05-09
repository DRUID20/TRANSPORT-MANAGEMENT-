"use client";

import { Truck, Container, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { label: string; count: number; pct: number; icon: LucideIcon };

const rows: Row[] = [
  { label: "Prime Movers", count: 28, pct: 0.84, icon: Truck },
  { label: "Trailers", count: 32, pct: 0.6, icon: Container },
  { label: "Workshop", count: 4, pct: 0.4, icon: Wrench },
];

export function FleetDistribution() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet distribution</CardTitle>
        <CardDescription>By asset type · current</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fg-primary">{r.label}</span>
                    <span className="font-mono tnum text-sm text-fg-secondary">{r.count}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-base">
                      <div
                        className="h-full rounded-full bg-brand-blue transition-all duration-700"
                        style={{ width: `${r.pct * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] tnum text-fg-tertiary">
                      {(r.pct * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
