"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const statusFilters = [
  { key: "all",        label: "All" },
  { key: "active",     label: "Active" },
  { key: "probation",  label: "Probation" },
  { key: "on_leave",   label: "On leave" },
  { key: "suspended",  label: "Suspended" },
  { key: "terminated", label: "Terminated" },
] as const;

export function EmployeesFilters({
  activeStatus,
  activeDept,
  departments,
  q,
}: {
  activeStatus: string;
  activeDept: string;
  departments: Array<{ id: string; name: string }>;
  q?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function navTo(next: URLSearchParams) {
    if (q) next.set("q", q);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }
  function setStatus(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "all") next.delete("status");
    else next.set("status", key);
    navTo(next);
  }
  function setDept(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id === "all") next.delete("dept");
    else next.set("dept", id);
    navTo(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-fg-tertiary mr-1">Status</span>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              f.key === activeStatus
                ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
                : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-fg-tertiary mr-1">Department</span>
        <button
          type="button"
          onClick={() => setDept("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            activeDept === "all"
              ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
              : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
          )}
        >
          All
        </button>
        {departments.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDept(d.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              d.id === activeDept
                ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
                : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>
    </div>
  );
}
