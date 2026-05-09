"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { setBookingStatus } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";

export function BookingActions({
  bookingId,
  action,
}: {
  bookingId: string;
  action: "confirm" | "cancel";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go(status: "confirmed" | "cancelled") {
    start(async () => {
      await setBookingStatus(bookingId, status);
      router.refresh();
    });
  }

  if (action === "confirm") {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => go("confirmed")} disabled={pending} variant="success">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Confirm Booking
        </Button>
        <Button onClick={() => go("cancelled")} disabled={pending} variant="ghost">
          <XCircle className="size-4" />
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={() => go("cancelled")} disabled={pending} variant="danger">
      <XCircle className="size-4" />
      Cancel Booking
    </Button>
  );
}
