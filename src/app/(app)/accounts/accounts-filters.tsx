"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all",           label: "All" },
  { key: "Asset",         label: "Assets" },
  { key: "Liability",     label: "Liabilities" },
  { key: "Equity",        label: "Equity" },
  { key: "Income",        label: "Income" },
  { key: "Direct Cost",   label: "Direct Cost" },
  { key: "Expense",       label: "Expenses" },
  { key: "Other Income",  label: "Other Income" },
  { key: "Other Expense", label: "Other Expense" },
  { key: "Tax",           label: "Tax" },
] as const;

export function AccountsFilters({ active, q }: { active: string; q?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("class");
    else next.set("class", key);
    if (q) next.set("q", q);
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
