"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProgressHero({
  achieved,
  target,
  unit,
  achievedKes,
  achievedUsd,
}: {
  achieved: number;
  target: number;
  unit: string;
  achievedKes: string;
  achievedUsd: string;
}) {
  const pct = Math.min(100, (achieved / target) * 100);
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-bg-elevated to-bg-elevated-2 dark:from-bg-elevated dark:to-bg-base">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-fg-tertiary">Today's progress</CardTitle>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="kpi-number text-4xl text-fg-primary">{achievedKes}</div>
              <div className="font-mono text-sm text-fg-tertiary">{achievedUsd}</div>
            </div>
            <div className="mt-1 text-xs text-fg-secondary">
              <span className="font-mono tnum text-fg-primary">
                {achieved.toLocaleString()}
              </span>{" "}
              of{" "}
              <span className="font-mono tnum text-fg-primary">
                {target.toLocaleString()}
              </span>{" "}
              {unit} daily target ({pct.toFixed(0)}%)
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-1 font-mono text-[11px] text-status-success">
            <TrendingUp className="size-3" />
            +12.4% MTD
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Gradient progress bar — red → amber → green */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-base/60 ring-1 ring-border">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, rgb(var(--status-danger)) 0%, rgb(var(--status-warning)) 50%, rgb(var(--status-success)) 100%)",
              boxShadow: "0 0 12px rgb(var(--status-success) / 0.4)",
            }}
          />
          {/* Marker dot at the achievement point */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-bg-base ring-2 ring-status-success"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-mono uppercase tracking-wider text-fg-tertiary">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </CardContent>
    </Card>
  );
}
