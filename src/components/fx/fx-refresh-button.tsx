"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshFxRatesNow } from "@/server/actions/fx";
import { toast } from "@/components/ui/toast";

/** Pulls fresh rates from the live provider on demand (also runs daily by cron). */
export function FxRefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await refreshFxRatesNow();
          if (r.ok) {
            toast.success("FX rates refreshed", {
              description: r.source ? `Source: ${r.source}` : undefined,
            });
            router.refresh();
          } else {
            toast.error("Could not refresh rates", { description: r.error });
          }
        })
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary disabled:opacity-60"
    >
      <RefreshCw className={"size-3.5" + (pending ? " animate-spin" : "")} />
      {pending ? "Refreshing…" : "Refresh rates"}
    </button>
  );
}
