import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { WizardTripHeader, ReadOnlyBanner } from "@/components/trips/wizard-trip-header";
import { WizardStageBar } from "@/components/trips/wizard-stage-bar";
import { getTripById } from "@/server/actions/trips";
import { listTripDocuments } from "@/server/actions/documents";
import { currentStage, wizardReadOnly } from "@/lib/trips/wizard-stages";
import type { TripDocument } from "@/lib/types/documents";

/**
 * Trip wizard layout — wraps every sub-route (loading/in-transit/border/
 * delivery/invoice) with:
 *   - Breadcrumb / PageHeader
 *   - Compact "trip context" header (truck, driver, route, customer)
 *   - Big always-visible STAGE BAR
 *   - Closed / cancelled banner when terminal
 *
 * The active stage's content renders as {children}. The /trips/[id] root
 * itself is a thin redirect (page.tsx) that sends the user to the current
 * stage based on status.
 */
export default async function TripWizardLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const documents = await listTripDocuments(id);

  const stage = currentStage(trip.status, { readyToInvoice: trip.readyToInvoice });
  const readOnly = wizardReadOnly(trip.status);
  const blocker = computeBlocker(trip, documents);

  return (
    <div className="page-3d-bg stagger-children flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: "Trips", href: "/trips" }, { label: trip.number }]}
        eyebrow="Trip"
        title={trip.number}
        description={
          trip.customer
            ? `${trip.customer.name} · ${trip.origin} → ${trip.destination ?? "destination TBC"}`
            : `${trip.origin} → ${trip.destination ?? "destination TBC"}`
        }
        actions={
          trip.readyToInvoice ? <Badge variant="success">Ready to invoice</Badge> : null
        }
      />

      <WizardTripHeader
        tripId={trip.id}
        tripNumber={trip.number}
        customerName={trip.customer?.name}
        customerId={trip.customer?.id}
        origin={trip.origin}
        destination={trip.destination}
        truckReg={trip.truck?.registration}
        truckId={trip.truck?.id}
        driverName={trip.driver?.fullName}
        driverId={trip.driver?.id}
        blocker={blocker}
      />

      {readOnly && <ReadOnlyBanner kind={trip.status === "closed" ? "closed" : "cancelled"} />}

      <WizardStageBar
        tripId={trip.id}
        status={trip.status}
        readyToInvoice={trip.readyToInvoice}
        current={stage}
        delayed={trip.status === "delayed"}
      />

      {children}
    </div>
  );
}

/**
 * Compute the single most important "what's blocking advance" sentence
 * for the current stage. Surfaced in the WizardTripHeader so it's visible
 * from every sub-route.
 */
function computeBlocker(
  trip: Awaited<ReturnType<typeof getTripById>>,
  documents: TripDocument[],
): string | undefined {
  if (!trip) return undefined;
  if (trip.status === "closed") return undefined;
  if (trip.status === "cancelled") return undefined;

  const bol = documents.find((d) => d.kind === "bill_of_lading");
  if (!bol) return "Upload the Bill of Lading.";
  if (bol.status !== "approved") return "Approve the Bill of Lading.";

  if (trip.status === "planned" || trip.status === "loading") {
    if (trip.loadedLitres === undefined) return "Capture the loaded volume + seals.";
    return "Mark loading complete to enter In transit.";
  }
  if (trip.status === "in_transit") return "Confirm the truck has reached the border.";
  if (trip.status === "at_border") {
    if (!trip.destination) return "Assign the destination (rate will auto-look-up).";
    return "Record the Road User Charge + clear the border.";
  }
  if (trip.status === "delivered" && trip.dischargedLitres === undefined) {
    return "Capture the delivered volume.";
  }
  if (trip.readyToInvoice) return "Preview the invoice, then post & close.";
  return undefined;
}
