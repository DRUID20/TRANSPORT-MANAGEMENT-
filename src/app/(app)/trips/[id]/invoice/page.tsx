import { notFound } from "next/navigation";
import { TripInvoiceCard } from "@/components/trips/trip-invoice-card";
import { TripReconciliation } from "@/components/trips/trip-reconciliation";
import { ReopenTripButton } from "@/components/trips/reopen-trip-button";
import { StageGateBanner } from "@/components/trips/wizard-shared";
import { getTripById } from "@/server/actions/trips";
import { wizardReadOnly } from "@/lib/trips/wizard-stages";

/**
 * STAGE 5 — Invoice & close.
 *
 * Preview the invoice → post → close. Once the trip is closed every stage
 * goes read-only. If the dispatcher needs to fix something after close,
 * an admin must reopen the trip (added in the next commit alongside the
 * shortage-loan reversal logic).
 */
export default async function TripInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const readOnly = wizardReadOnly(trip.status);

  if (
    trip.status === "planned" ||
    trip.status === "loading" ||
    trip.status === "in_transit" ||
    trip.status === "at_border"
  ) {
    return (
      <StageGateBanner
        blocker="Delivery isn't complete yet."
        hint="The invoice is built from the discharged volume — capture it on the Delivery stage first."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <TripInvoiceCard tripId={trip.id} readyToInvoice={!!trip.readyToInvoice} />

      <TripReconciliation
        tripId={trip.id}
        status={trip.status}
        revenueAmount={trip.revenueAmount}
        revenueCurrency={trip.revenueCurrency}
        driverAdvanceKes={trip.driverAdvanceKes ?? 0}
        borderChargesKes={trip.borderChargesKes}
        initialActualKm={trip.actualKm}
        initialActualFuelLitres={trip.actualFuelLitres}
        initialDriverAdvanceUsedKes={trip.driverAdvanceUsedKes}
        cargoUnit={trip.cargoUnit}
        cargoQuantity={trip.cargoQuantity}
        loadedLitres={trip.loadedLitres}
        loadedLitres20C={trip.loadedLitres20C}
      />

      {readOnly && (
        <section className="surface-card surface-3d border-2 border-border-strong px-5 py-4">
          <h3 className="text-[15px] font-extrabold text-fg-primary">
            Need to amend something?
          </h3>
          <p className="mt-1 text-[13px] font-medium text-fg-secondary">
            This trip is closed. An admin reopen is required to edit volumes, expenses
            or border charges — that'll either delete the draft invoice (and reverse
            the shortage deduction) or, if the invoice was already sent, ask you to
            issue a credit note first.
          </p>
          <ReopenTripButton tripId={trip.id} />
        </section>
      )}
    </div>
  );
}
