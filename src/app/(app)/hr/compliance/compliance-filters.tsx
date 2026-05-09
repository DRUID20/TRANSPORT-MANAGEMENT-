"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const statusFilters = [
  { key: "all",            label: "All" },
  { key: "expired",        label: "Expired" },
  { key: "expiring_soon",  label: "Expiring soon" },
  { key: "valid",          label: "Valid" },
  { key: "missing",        label: "Missing" },
] as const;

const kindFilters = [
  { key: "all",                  label: "All kinds" },
  { key: "driving_licence",      label: "Driving licence" },
  { key: "medical_certificate",  label: "Medical" },
  { key: "passport",             label: "Passport" },
  { key: "comesa_permit",        label: "COMESA" },
  { key: "training_certificate", label: "Training" },
  { key: "work_permit",          label: "Work permit" },
] as const;

export function ComplianceFilters({
  activeStatus,
  activeKind,
}: {
  activeStatus: string;
  activeKind: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setKey(k: "status" | "kind", val: string) {
    const next = new URLSearchParams(params.toString());
    if (val === "all") next.delete(k);
    else next.set(k, val);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-fg-tertiary">Status</span>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setKey("status", f.key)}
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
        <span className="mr-1 text-[10px] uppercase tracking-wider text-fg-tertiary">Kind</span>
        {kindFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setKey("kind", f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              f.key === activeKind
                ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
                : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
