"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: number; // e.g. +0.082 for +8.2%
  trend?: number[];
  icon?: LucideIcon;
  hint?: string;
}

export function KpiCard({ label, value, unit, delta, trend, icon: Icon, hint }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  const trendColor = positive ? "rgb(var(--status-success))" : "rgb(var(--status-danger))";

  return (
    <div className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-bg-elevated p-5 transition-all hover:border-border-strong hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex size-7 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border">
              <Icon className="size-3.5" />
            </div>
          )}
          <div className="text-xs font-medium uppercase tracking-wide text-fg-tertiary">
            {label}
          </div>
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] tnum",
              positive
                ? "bg-status-success/10 text-status-success"
                : "bg-status-danger/10 text-status-danger",
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-2.5" />
            ) : (
              <ArrowDownRight className="size-2.5" />
            )}
            {(positive ? "+" : "") + (delta * 100).toFixed(1) + "%"}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <div className="kpi-number text-fg-primary">{value}</div>
        {unit && (
          <div className="font-mono text-xs uppercase tracking-wider text-fg-tertiary">
            {unit}
          </div>
        )}
      </div>

      {trend && trend.length > 0 && (
        <div className="-mx-1 mt-auto pt-2">
          <Sparkline data={trend} color={trendColor} height={32} />
        </div>
      )}

      {hint && (
        <div className="text-xs text-fg-tertiary">{hint}</div>
      )}
    </div>
  );
}
