import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDestinationCard } from "@/components/trips/confirm-destination-card";
import { TripBorders } from "@/components/trips/trip-borders";
import { TripExpensesCard } from "@/components/trips/trip-expenses-card";
import { StageGateBanner } from "@/components/trips/wizard-shared";
import { getTripById } from "@/server/actions/trips";
import { listBorderCrossingsForTrip } from "@/server/actions/borders";
import { wizardReadOnly } from "@/lib/trips/wizard-stages";

/**
 * STAGE 3 — Border.
 *
 * The truck has reached Malaba/Busia. Dispatcher:
 *   - Assigns the destination (rate auto-looks-up via ConfirmDestinationCard)
 *   - Records the Road User Charge + any other border charges
 *   - Logs border-related expenses (expenses are still addable from any
 *     stage; they're just primarily entered here)
 *
 * Advances to Delivery when destination is set AND a border crossing
 * has been recorded.
 */
export default async function TripBorderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const borders = await listBorderCrossingsForTrip(id);
  const readOnly = wizardReadOnly(trip.status);

  if (trip.status === "planned" || trip.status === "loading") {
    return (
      <StageGateBanner
        blocker="Loading isn't complete yet."
        hint="Finish Loading and In transit before recording border charges."
      />
    );
  }

  const destinationSet = !!trip.destination;
  const borderRecorded = borders.length > 0;
  const canComplete = destinationSet && borderRecorded && !readOnly;

  return (
    <div className="flex flex-col gap-5">
      <ConfirmDestinationCard
        tripId={trip.id}
        current={trip.destination}
        confirmedAt={trip.destinationConfirmedAt}
        confirmedBy={trip.destinationConfirmedBy}
        canForce={false}
        defaultActor="Dispatcher"
        origin={trip.origin}
        customerId={trip.customer?.id ?? trip.booking?.customerId}
        cargoClass={trip.product}
        cargoQuantity={trip.cargoQuantity}
        revenueAmount={trip.revenueAmount}
        revenueCurrency={trip.revenueCurrency}
      />

      <TripBorders tripId={trip.id} borders={borders} />

      <TripExpensesCard tripId={trip.id} />

      <CompleteBorder
        tripId={trip.id}
        canComplete={canComplete}
        destinationSet={destinationSet}
        borderRecorded={borderRecorded}
        readOnly={readOnly}
      />
    </div>
  );
}

function CompleteBorder({
  tripId,
  canComplete,
  destinationSet,
  borderRecorded,
  readOnly,
}: {
  tripId: string;
  canComplete: boolean;
  destinationSet: boolean;
  borderRecorded: boolean;
  readOnly: boolean;
}) {
  if (readOnly) return null;

  if (canComplete) {
    return (
      <section className="surface-card surface-3d flex items-center justify-between gap-3 border-2 border-status-success/40 bg-status-success/[0.06] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-extrabold text-fg-primary">Cleared the border</h3>
          <p className="mt-0.5 text-[13px] font-medium text-fg-secondary">
            Destination set + border crossing recorded. Advance to Delivery.
          </p>
        </div>
        <Button asChild size="lg" variant="primary">
          <Link href={`/trips/${tripId}/delivery?advance=1`}>
            Move to Delivery
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <StageGateBanner
      blocker={
        !destinationSet
          ? "Assign the destination so the rate can look up."
          : !borderRecorded
            ? "Record at least one border crossing (Malaba or Busia)."
            : "Border isn't ready."
      }
      hint="Both are needed before we move on to Delivery."
    />
  );
}
