"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all",       label: "All" },
  { key: "expired",   label: "Expired" },
  { key: "critical",  label: "Critical (≤14d)" },
  { key: "warning",   label: "Warning (≤30d)" },
  { key: "ok",        label: "OK" },
  { key: "insurance", label: "Insurance" },
  { key: "comesa",    label: "COMESA" },
  { key: "driver",    label: "Driver docs" },
] as const;

export function ComplianceFilters({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") {
      next.delete("filter");
    } else {
      next.set("filter", key);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((f) => {
        const isActive = f.key === active;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => go(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isActive
                ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
                : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
