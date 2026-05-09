"use client";

import { ChevronDown, Filter, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const presets = ["Today", "7 days", "30 days", "Quarter", "YTD"] as const;

export function FilterBar({
  active = "30 days",
  onChange,
}: {
  active?: (typeof presets)[number];
  onChange?: (next: (typeof presets)[number]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center rounded-md border border-border bg-bg-elevated p-0.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange?.(p)}
            className={
              "rounded px-3 py-1.5 text-xs font-medium transition-colors " +
              (p === active
                ? "bg-bg-base text-fg-primary shadow-soft"
                : "text-fg-secondary hover:text-fg-primary")
            }
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Filter className="size-3.5" />
          Filters
          <ChevronDown className="size-3" />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Refresh">
          <RotateCw className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
