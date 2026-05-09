"use client";

import { ArrowRight } from "lucide-react";

/**
 * Visualises a trip route as origin → destination dots with country flags.
 * Inspired by Transcope (image 3) and MoveIQ (image 2) reference dashboards.
 */
export function RouteVisual({
  origin,
  destination,
  originFlag,
  destinationFlag,
  km,
}: {
  origin: string;
  destination: string;
  originFlag: string; // emoji flag
  destinationFlag: string;
  km?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-status-success" />
          <span className="text-xs text-fg-secondary">{originFlag}</span>
          <span className="text-sm text-fg-primary">{origin}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-status-danger" />
          <span className="text-xs text-fg-secondary">{destinationFlag}</span>
          <span className="text-sm text-fg-primary">{destination}</span>
        </div>
      </div>
      {km !== undefined && (
        <div className="ml-auto flex items-center gap-1 font-mono text-[11px] tnum text-fg-tertiary">
          <ArrowRight className="size-3" />
          {km.toLocaleString()} km
        </div>
      )}
    </div>
  );
}
