"use client";

import { cn } from "@/lib/utils";

export interface StatusTab {
  key: string;
  label: string;
  count: number;
}

export function StatusTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: StatusTab[];
  active: string;
  onChange?: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange?.(t.key)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isActive
                ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
                : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
            )}
          >
            {t.label}
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] tnum",
                isActive ? "bg-brand-blue/15 text-brand-blue" : "bg-bg-base text-fg-tertiary ring-1 ring-border",
              )}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
