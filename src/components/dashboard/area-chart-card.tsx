"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const SERIES_COLORS = ["rgb(var(--brand-blue))", "rgb(var(--status-info))"];

/**
 * Value-formatting modes. A plain enum (not a function) so this client
 * component can be rendered from a Server Component without tripping the
 * "functions cannot be passed to Client Components" boundary rule.
 */
export type ChartValueFormat = "kes-compact" | "number";

function formatValue(n: number, format: ChartValueFormat): string {
  switch (format) {
    case "kes-compact":
      return formatMoney(n, "KES", { compact: true });
    case "number":
      return n.toLocaleString();
  }
}

/** Stripe-style tooltip card — mono values, colored series dots (§10). */
function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string }>;
  label?: string | number;
  format: ChartValueFormat;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-lg border border-border-strong bg-bg-elevated-2 px-3 py-2 shadow-modal">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-tertiary">
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-fg-secondary">{p.dataKey}</span>
            <span className="ml-auto font-mono tnum font-medium text-fg-primary">
              {formatValue(Number(p.value ?? 0), format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaChartCard({
  title,
  data,
  index,
  categories,
  format = "number",
  height = 280,
  delta,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  index: string;
  categories: string[];
  format?: ChartValueFormat;
  height?: number;
  /** Optional period-over-period change shown in the header (e.g. 0.124). */
  delta?: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg-primary">{title}</h2>
        <div className="flex items-center gap-4">
          {categories.length > 1 && (
            <div className="flex items-center gap-3">
              {categories.map((cat, i) => (
                <span key={cat} className="inline-flex items-center gap-1.5 text-[11px] text-fg-secondary">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                  />
                  {cat}
                </span>
              ))}
            </div>
          )}
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums",
              up ? "text-status-success" : "text-status-danger",
            )}
          >
            {up ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        </div>
      </header>
      <div className="px-3 py-4">
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {categories.map((cat, i) => {
                  const color = SERIES_COLORS[i % SERIES_COLORS.length];
                  return (
                    <linearGradient key={cat} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
                      {/* §10: 15%→0% gradient fill */}
                      <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              {/* Horizontal grid only, subtle (§10) */}
              <CartesianGrid stroke="rgb(var(--border) / 0.5)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey={index}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: "rgb(var(--text-tertiary))", fontFamily: "var(--font-mono)" }}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) => formatValue(Number(v), format)}
                tick={{ fill: "rgb(var(--text-tertiary))", fontFamily: "var(--font-mono)" }}
                width={56}
              />
              <Tooltip
                content={<ChartTooltip format={format} />}
                cursor={{ stroke: "rgb(var(--border-strong))", strokeDasharray: "4 4" }}
              />
              {categories.map((cat, i) => {
                const color = SERIES_COLORS[i % SERIES_COLORS.length];
                return (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#area-${i})`}
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: color,
                      fill: "rgb(var(--bg-surface))",
                    }}
                    isAnimationActive
                    animationDuration={600}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
