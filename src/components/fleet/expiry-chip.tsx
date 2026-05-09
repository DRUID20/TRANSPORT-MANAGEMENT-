import { cn } from "@/lib/utils";
import { classifyExpiry } from "@/lib/types/fleet";

export function ExpiryChip({ date }: { date?: string }) {
  if (!date) return <span className="text-xs text-fg-tertiary">—</span>;

  const status = classifyExpiry(date);
  const d = new Date(date);
  const today = new Date();
  const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formatted = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const tone =
    status === "expired"
      ? "text-status-danger"
      : status === "critical"
        ? "text-status-danger"
        : status === "warning"
          ? "text-status-warning"
          : "text-fg-secondary";

  const dotTone =
    status === "expired" || status === "critical"
      ? "bg-status-danger"
      : status === "warning"
        ? "bg-status-warning"
        : "bg-status-success";

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", dotTone)} />
      <div className="flex flex-col leading-tight">
        <span className={cn("font-mono text-xs tnum", tone)}>{formatted}</span>
        {status !== "ok" && (
          <span className="font-mono text-[10px] text-fg-tertiary">
            {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}
          </span>
        )}
      </div>
    </div>
  );
}
