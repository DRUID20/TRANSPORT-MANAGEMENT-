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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SERIES_COLORS = ["rgb(var(--brand-blue))", "rgb(var(--accent-secondary,94 92 230))"];

export function AreaChartCard({
  title,
  data,
  index,
  categories,
  valueFormatter = (n: number) => String(n),
  height = 280,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  index: string;
  categories: string[];
  valueFormatter?: (n: number) => string;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
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
                tickFormatter={(v) => valueFormatter(Number(v))}
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
                formatter={(v: number) => valueFormatter(v)}
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
      </CardContent>
    </Card>
  );
}
