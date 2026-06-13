"use client";

import { ArrowRight } from "lucide-react";

export function RouteVisual({
  origin,
  destination,
  km,
}: {
  origin: string;
  destination: string;
  km?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-status-success" />
          <span className="text-sm text-fg-primary">{origin}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-status-danger" />
          <span className="text-sm text-fg-primary">{destination}</span>
        </div>
      </div>
      {km !== undefined && km > 0 && (
        <div className="ml-auto flex items-center gap-1 font-mono text-[11px] tnum text-fg-tertiary">
          <ArrowRight className="size-3" />
          {km.toLocaleString()} km
        </div>
      )}
    </div>
  );
}
