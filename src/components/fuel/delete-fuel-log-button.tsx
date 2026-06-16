"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeFuelLog } from "@/server/actions/fuel";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** Admin-only delete for a fuel log (e.g. a mistaken or duplicate entry). */
export function DeleteFuelLogButton({
  fuelLogId,
  variant = "default",
}: {
  fuelLogId: string;
  variant?: "default" | "row";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this fuel log? It feeds trip km / km-L — this cannot be undone.")) return;
    start(async () => {
      const r = await removeFuelLog(fuelLogId);
      if (!r.ok) {
        toast.error("Could not delete", { description: r.error });
        return;
      }
      toast.success("Fuel log deleted");
      if (variant === "row") router.refresh();
      else {
        router.push("/fuel");
        router.refresh();
      }
    });
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        aria-label="Delete fuel log"
        title="Delete fuel log"
        className="rounded p-1 text-fg-tertiary transition-colors hover:bg-status-danger/10 hover:text-status-danger disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={onDelete}>
      <Trash2 className="size-3.5" /> {pending ? "Deleting…" : "Delete fuel log"}
    </Button>
  );
}
