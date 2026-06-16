"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBooking } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * Admin-only delete for a booking that hasn't been planned onto a trip.
 * The server action enforces both the admin capability and the
 * not-yet-planned rule; this is the UI affordance.
 */
export function DeleteBookingButton({
  bookingId,
  variant = "default",
}: {
  bookingId: string;
  variant?: "default" | "row";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    start(async () => {
      const r = await deleteBooking(bookingId);
      if (!r.ok) {
        toast.error("Could not delete", { description: r.error });
        return;
      }
      toast.success("Booking deleted");
      if (variant === "row") router.refresh();
      else {
        router.push("/bookings");
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
        aria-label="Delete booking"
        title="Delete booking"
        className="rounded p-1 text-fg-tertiary transition-colors hover:bg-status-danger/10 hover:text-status-danger disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={onDelete}>
      <Trash2 className="size-3.5" /> {pending ? "Deleting…" : "Delete booking"}
    </Button>
  );
}
