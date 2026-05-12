"use client";

import { cn } from "@/lib/utils";

/**
 * SegmentedControl — Apple-style chip selector for 2-5 mutually-exclusive
 * options. Use this when a Select would be overkill (and slow) and a
 * radio group would look heavy. Common uses: view switchers (month/week/
 * day), product pickers (PMS / AGO), unit pickers.
 *
 * Renders as a single rounded pill with each option as a button. The
 * active segment lifts via a moving background pill — but for simplicity
 * and to avoid layout shift we just render each segment with its own
 * background state. Visually identical, lighter to implement.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  fullWidth = false,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  className?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const itemPad =
    size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-sm";
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-bg-surface p-0.5",
        fullWidth && "w-full",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all",
              itemPad,
              fullWidth && "flex-1",
              active
                ? "bg-bg-elevated text-fg-primary shadow-soft ring-1 ring-border"
                : "text-fg-secondary hover:text-fg-primary",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
