import { notFound } from "next/navigation";
import { TripDocuments } from "@/components/trips/trip-documents";
import { AdvanceStageButton } from "@/components/trips/advance-stage-button";
import {
  BOLApprovalGate,
  FuelCargoCard,
  StageGateBanner,
} from "@/components/trips/wizard-shared";
import { getTripById } from "@/server/actions/trips";
import { listTripDocuments } from "@/server/actions/documents";
import { wizardReadOnly } from "@/lib/trips/wizard-stages";

/**
 * STAGE 1 — Loading.
 *
 * The dispatcher uploads + approves the Bill of Lading, captures the
 * loaded volume (prefilled from BOL @20°C) and the seal numbers. Only
 * advances to "In transit" when BOL is approved + volume + seals are in.
 */
export default async function TripLoadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const documents = await listTripDocuments(id);
  const readOnly = wizardReadOnly(trip.status);

  const bol = documents.find((d) => d.kind === "bill_of_lading");
  const bolApproved = bol?.status === "approved";
  const loadingCaptured = trip.loadedLitres !== undefined && !!trip.loadingSealNumbers;
  const canComplete = bolApproved && loadingCaptured && !readOnly;

  return (
    <div className="flex flex-col gap-5">
      {!bolApproved && <BOLApprovalGate tripId={trip.id} />}

      <TripDocuments tripId={trip.id} documents={documents} />

      <FuelCargoCard trip={trip} bolVolumeL={trip.cargoQuantity} capture="loading" />

      <CompleteLoading
        tripId={trip.id}
        canComplete={canComplete}
        bolApproved={bolApproved}
        loadingCaptured={loadingCaptured}
        readOnly={readOnly}
      />
    </div>
  );
}

function CompleteLoading({
  tripId,
  canComplete,
  bolApproved,
  loadingCaptured,
  readOnly,
}: {
  tripId: string;
  canComplete: boolean;
  bolApproved: boolean;
  loadingCaptured: boolean;
  readOnly: boolean;
}) {
  if (readOnly) return null;

  if (canComplete) {
    return (
      <section className="surface-card surface-3d flex items-center justify-between gap-3 border-2 border-status-success/40 bg-status-success/[0.06] px-5 py-4">
        <div>
          <h3 className="text-[15px] font-extrabold text-fg-primary">Loading complete</h3>
          <p className="mt-0.5 text-[13px] font-medium text-fg-secondary">
            BOL approved, volume and seals captured. The truck can move to In transit.
          </p>
        </div>
        <AdvanceStageButton
          tripId={tripId}
          to="in_transit"
          nextSlug="in-transit"
          label="Mark loading complete"
        />
      </section>
    );
  }

  return (
    <StageGateBanner
      blocker={
        !bolApproved
          ? "Approve the Bill of Lading before advancing."
          : !loadingCaptured
            ? "Capture the loaded volume + seal numbers before advancing."
            : "Loading isn't ready."
      }
      hint="Each step in the wizard unlocks the next — finish this one to enter In transit."
    />
  );
}
