"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const channelFilters = [
  { key: "all",    label: "All channels" },
  { key: "email",  label: "Email" },
  { key: "sms",    label: "SMS" },
  { key: "in_app", label: "In-app" },
] as const;

const statusFilters = [
  { key: "all",       label: "All statuses" },
  { key: "queued",    label: "Queued" },
  { key: "sent",      label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "failed",    label: "Failed" },
  { key: "read",      label: "Read" },
] as const;

export function LogFilters({
  activeChannel,
  activeStatus,
}: {
  activeChannel: string;
  activeStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(key: "channel" | "status", val: string) {
    const next = new URLSearchParams(params.toString());
    if (val === "all") next.delete(key);
    else next.set(key, val);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-fg-tertiary">Channel</span>
        {channelFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => go("channel", f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              f.key === activeChannel
                ? "bg-bg-elevated-2 text-fg-primary ring-1 ring-border-strong shadow-soft"
                : "text-fg-secondary hover:bg-bg-elevated hover:text-fg-primary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-fg-tertiary">Status</span>
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => go("status", f.key)}
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
    </div>
  );
}
