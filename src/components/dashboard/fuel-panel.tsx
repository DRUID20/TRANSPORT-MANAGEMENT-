"use client";

import { Fuel } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "./sparkline";

const trend = [38, 42, 40, 45, 48, 44, 50, 52, 49, 55, 58, 54, 60, 62, 59];

export function FuelPanel() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Fuel usage &amp; cost</CardTitle>
            <CardDescription>Last 30 days · across all countries</CardDescription>
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
              <span className="kpi-number text-fg-primary">3.42</span>
              <span className="font-mono text-[11px] text-fg-tertiary">km/L</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-fg-tertiary">Total cost</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="kpi-number text-fg-primary">2.14M</span>
              <span className="font-mono text-[11px] text-fg-tertiary">KES</span>
            </div>
          </div>
        </div>

        {/* Country split bars */}
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Bar flag="🇰🇪" name="Kenya" pct={0.42} />
          <Bar flag="🇺🇬" name="Uganda" pct={0.28} />
          <Bar flag="🇹🇿" name="Tanzania" pct={0.18} />
          <Bar flag="🇸🇸" name="South Sudan" pct={0.12} />
        </div>

        <div>
          <div className="text-xs text-fg-tertiary">Daily consumption (litres)</div>
          <Sparkline data={trend} height={48} />
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ flag, name, pct }: { flag: string; name: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{flag}</span>
      <span className="w-20 text-xs text-fg-secondary">{name}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-base">
        <div className="h-full rounded-full bg-status-warning" style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="font-mono text-[10px] tnum text-fg-tertiary">{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}
