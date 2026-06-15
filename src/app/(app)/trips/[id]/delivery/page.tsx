import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FuelCargoCard, StageGateBanner } from "@/components/trips/wizard-shared";
import { getTripById } from "@/server/actions/trips";
import { wizardReadOnly } from "@/lib/trips/wizard-stages";

/**
 * STAGE 4 — Delivery.
 *
 * Customer-side discharge. Dispatcher records the delivered volume + seal
 * verification (delivery note attachment is optional for now — slated for
 * the next iteration of the documents pipeline).
 *
 * Advances to the Invoice stage once the discharged volume is captured.
 * Any short delivery automatically posts a deduction to the driver's
 * account when the invoice is created (existing recordDriverShortageIfAny).
 */
export default async function TripDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const readOnly = wizardReadOnly(trip.status);

  if (trip.status === "planned" || trip.status === "loading" || trip.status === "in_transit") {
    return (
      <StageGateBanner
        blocker="Truck hasn't cleared the border yet."
        hint="Finish the Border stage so destination + RUC are on file before delivery."
      />
    );
  }

  const dischargeCaptured = trip.dischargedLitres !== undefined;
  const canComplete = dischargeCaptured && !readOnly;

  return (
    <div className="flex flex-col gap-5">
      <FuelCargoCard trip={trip} bolVolumeL={trip.cargoQuantity} />

      <ShortageNotice trip={trip} />

      <CompleteDelivery tripId={trip.id} canComplete={canComplete} dischargeCaptured={dischargeCaptured} readOnly={readOnly} />
    </div>
  );
}

function ShortageNotice({
  trip,
}: {
  trip: NonNullable<Awaited<ReturnType<typeof getTripById>>>;
}) {
  if (trip.loadedLitres === undefined || trip.dischargedLitres === undefined) return null;
  const short = trip.loadedLitres - trip.dischargedLitres;
  if (short <= 0) return null;
  return (
    <section className="surface-card surface-3d flex items-start gap-3 border-2 border-status-danger/30 bg-status-danger/[0.05] px-5 py-4">
      <div className="flex-1">
        <h3 className="text-[15px] font-extrabold text-fg-primary">
          Short delivery — {short.toLocaleString()} L
        </h3>
        <p className="mt-1 text-[13px] font-medium text-fg-secondary">
          When you create the invoice on the next step, the shortfall will post
          automatically to the driver's payroll as a deduction. The loan is
          idempotent — it only posts once per trip. If you edit volumes later,
          re-open the trip first (see the Invoice step).
        </p>
      </div>
    </section>
  );
}

function CompleteDelivery({
  tripId,
  canComplete,
  dischargeCaptured,
  readOnly,
}: {
  tripId: string;
  canComplete: boolean;
  dischargeCaptured: boolean;
  readOnly: boolean;
}) {
  if (readOnly) return null;

  if (canComplete) {
    return (
      <section className="surface-card surface-3d flex items-center justify-between gap-3 border-2 border-status-success/40 bg-status-success/[0.06] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-extrabold text-fg-primary">Delivered</h3>
          <p className="mt-0.5 text-[13px] font-medium text-fg-secondary">
            Volume captured. The trip is ready to invoice + close.
          </p>
        </div>
        <Button asChild size="lg" variant="primary">
          <Link href={`/trips/${tripId}/invoice?advance=1`}>
            Move to Invoice
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <StageGateBanner
      blocker={!dischargeCaptured ? "Capture the discharged volume + seal numbers." : "Delivery isn't ready."}
      hint="The delivered volume is what we bill on."
    />
  );
}
