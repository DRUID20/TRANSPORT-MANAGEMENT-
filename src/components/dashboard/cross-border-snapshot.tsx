"use client";

import { useEffect, useState } from "react";
import { listActiveBorderCrossings } from "@/server/actions/borders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Row = { route: string; units: number; tone: "info" | "warning" | "danger" };

export function CrossBorderSnapshot() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listActiveBorderCrossings().then((all) => {
      if (cancelled) return;
      const grouped = new Map<string, Row>();
      for (const c of all) {
        const tone: Row["tone"] =
          c.status === "rejected"
            ? "danger"
            : c.status === "queued"
              ? "warning"
              : "info";
        const existing = grouped.get(c.postName);
        if (existing) {
          existing.units += 1;
          // Escalate tone if needed
          if (tone === "danger" || (tone === "warning" && existing.tone === "info")) {
            existing.tone = tone;
          }
        } else {
          grouped.set(c.postName, { route: c.postName, units: 1, tone });
        }
      }
      setRows([...grouped.values()].sort((a, b) => b.units - a.units));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-border status</CardTitle>
        <CardDescription>Live border-crossing snapshot</CardDescription>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-9 animate-pulse rounded-md bg-bg-base/60" />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-fg-tertiary">
            No active border crossings right now.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((b) => (
              <li key={b.route} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-fg-primary">{b.route}</div>
                  <div className="font-mono text-xs text-fg-tertiary">
                    {b.units} unit{b.units === 1 ? "" : "s"}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex size-2.5 rounded-full ring-2",
                    b.tone === "danger" && "bg-status-danger ring-status-danger/20",
                    b.tone === "warning" && "bg-status-warning ring-status-warning/20",
                    b.tone === "info" && "bg-status-info ring-status-info/20",
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
