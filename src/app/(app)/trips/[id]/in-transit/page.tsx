import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { AdvanceStageButton } from "@/components/trips/advance-stage-button";
import { FuelCargoCard, StageGateBanner } from "@/components/trips/wizard-shared";
import { getTripById } from "@/server/actions/trips";
import { wizardReadOnly } from "@/lib/trips/wizard-stages";

/**
 * STAGE 2 — In transit.
 *
 * Passive milestone: the truck is on the road between depot and border.
 * No data capture here — just an explicit "Reached border" advance button
 * the dispatcher hits when the driver checks in.
 */
export default async function TripInTransitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const readOnly = wizardReadOnly(trip.status);

  if (trip.status === "planned" || trip.status === "loading") {
    return (
      <StageGateBanner
        blocker="Loading isn't complete yet."
        hint="Finish the Loading stage first; the truck can't be in transit before it's loaded."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="surface-card surface-3d border-2 border-border-strong p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <Truck className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-extrabold tracking-tight text-fg-primary">
              On the road
            </h2>
            <p className="mt-1 text-[13px] font-medium text-fg-secondary">
              {trip.actualDepartureAt
                ? `Departed ${new Date(trip.actualDepartureAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}.`
                : "Truck is on the move."}{" "}
              Hit the button below when the driver reports arrival at the border post.
            </p>
          </div>
        </div>
      </section>

      <FuelCargoCard trip={trip} bolVolumeL={trip.cargoQuantity} capture="none" />

      {!readOnly && (
        <section className="surface-card surface-3d flex items-center justify-between gap-3 border-2 border-border-strong px-5 py-4">
          <div>
            <h3 className="text-[15px] font-extrabold text-fg-primary">Reached the border?</h3>
            <p className="mt-0.5 text-[13px] font-medium text-fg-secondary">
              Advance to the Border stage to record charges + confirm the destination.
            </p>
          </div>
          <AdvanceStageButton
            tripId={trip.id}
            to="at_border"
            nextSlug="border"
            label="At the border"
          />
        </section>
      )}
    </div>
  );
}
