"use client";

import { Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TopPerformer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top truck — month to date</CardTitle>
        <CardDescription>By gross profit per km</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex size-14 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-navy text-white shadow-soft">
              <span className="font-mono text-[10px] font-bold tracking-wider">KCB</span>
            </div>
            <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-status-warning text-black ring-2 ring-bg-elevated">
              <Star className="size-3 fill-current" />
            </div>
          </div>
          <div className="flex-1">
            <div className="font-mono text-base font-semibold text-fg-primary">KCB 421R</div>
            <div className="text-xs text-fg-secondary">Driver: Joseph M. · Mombasa → Kampala</div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-status-success/10 px-2 py-0.5 font-mono text-[10px] text-status-success">
              <TrendingUp className="size-2.5" />
              +18.2% vs fleet avg
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
          <Stat label="Profit / km" value="42.80" unit="KES" />
          <Stat label="Trips MTD" value="14" />
          <Stat label="Fuel eff." value="3.81" unit="km/L" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono tnum text-lg font-medium text-fg-primary">{value}</span>
        {unit && <span className="font-mono text-[10px] text-fg-tertiary">{unit}</span>}
      </div>
    </div>
  );
}
