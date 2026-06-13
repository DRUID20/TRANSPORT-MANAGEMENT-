"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

const SERIES_COLORS = ["rgb(var(--brand-blue))", "rgb(var(--accent-secondary,94 92 230))"];

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
      return String(n);
  }
}

export function AreaChartCard({
  title,
  data,
  index,
  categories,
  format = "number",
  height = 280,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  index: string;
  categories: string[];
  format?: ChartValueFormat;
  height?: number;
}) {
  return (
    <section className="surface-card overflow-hidden">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg-primary">
          {title}
        </h2>
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
                      <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey={index}
                stroke="rgb(var(--text-tertiary))"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: "rgb(var(--text-tertiary))" }}
              />
              <YAxis
                stroke="rgb(var(--text-tertiary))"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(v) => formatValue(Number(v), format)}
                tick={{ fill: "rgb(var(--text-tertiary))" }}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "rgb(var(--bg-elevated-2))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "rgb(var(--text-primary))",
                }}
                cursor={{ stroke: "rgb(var(--border-strong))" }}
                formatter={(v: number) => formatValue(v, format)}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "rgb(var(--text-secondary))" }}
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
                    isAnimationActive={true}
                    animationDuration={500}
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
