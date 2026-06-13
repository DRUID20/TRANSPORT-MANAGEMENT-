"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { CountUp } from "@/components/dashboard/count-up";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";

type Tone = "default" | "info" | "success" | "warning" | "danger";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-fg-primary",
  info: "text-brand-blue",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

const TONE_SPARK: Record<Tone, string> = {
  default: "rgb(var(--text-tertiary))",
  info: "rgb(var(--brand-blue))",
  success: "rgb(var(--status-success))",
  warning: "rgb(var(--status-warning))",
  danger: "rgb(var(--status-danger))",
};

export interface KpiCardProps {
  label: string;
  /** Number → animates with count-up; string → rendered as-is (pre-formatted). */
  value: string | number;
  unit?: string;
  delta?: number; // fraction, e.g. +0.082 for +8.2%
  trend?: number[];
  icon?: LucideIcon;
  hint?: string;
  tone?: Tone;
  /** decimals for the count-up when value is numeric */
  decimals?: number;
}

/**
 * KPI card — DESIGN.md §10. Label (caps muted) → 32px mono hero number
 * (count-up) → delta pill + caption → optional sparkline. Depth from a 1px
 * border that brightens on hover; no shadow (§4).
 */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  trend,
  icon: Icon,
  hint,
  tone = "default",
  decimals = 0,
}: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  const sparkColor = trend ? (delta !== undefined ? (positive ? "rgb(var(--status-success))" : "rgb(var(--status-danger))") : TONE_SPARK[tone]) : TONE_SPARK[tone];

  return (
    <div className="group surface-card surface-interactive relative flex flex-col gap-3 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20">
              <Icon className="size-4" strokeWidth={1.5} />
            </div>
          )}
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">
            {label}
          </div>
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums",
              positive ? "bg-status-success/12 text-status-success" : "bg-status-danger/12 text-status-danger",
            )}
          >
            {positive ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
            {(positive ? "+" : "") + (delta * 100).toFixed(1) + "%"}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <div className={cn("kpi-number", TONE_TEXT[tone])}>
          {typeof value === "number" ? <CountUp value={value} decimals={decimals} /> : value}
        </div>
        {unit && (
          <div className="font-mono text-xs uppercase tracking-wider text-fg-tertiary">{unit}</div>
        )}
      </div>

      {hint && <div className="text-[11px] text-fg-tertiary">{hint}</div>}

      {trend && trend.length > 0 && (
        <div className="-mx-1 mt-auto pt-1">
          <Sparkline data={trend} color={sparkColor} height={30} />
        </div>
      )}
    </div>
  );
}
