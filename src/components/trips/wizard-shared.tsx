import Link from "next/link";
import { Droplet, Fuel as FuelIcon, IdCard as IdCardIcon } from "lucide-react";
import {
  CaptureDischargeButton,
  CaptureLoadingButton,
} from "@/components/trips/fuel-capture";
import {
  ullageVariancePct,
  ULLAGE_ALERT_THRESHOLD_PCT,
} from "@/lib/types/trips";

/**
 * Wizard-shared components used by multiple stage pages.
 * Kept private to /trips so we don't leak operational chrome elsewhere.
 */

export type TripForFuelCard = {
  id: string;
  status: string;
  product?: "PMS" | "AGO";
  cargoQuantity: number;
  cargoUnit: string;
  loadedLitres?: number;
  loadingTempC?: number;
  density15C?: number;
  loadedLitres20C?: number;
  loadingSealNumbers?: string;
  dischargedLitres?: number;
  dischargeTempC?: number;
  dischargedLitres20C?: number;
  dischargeSealNumbers?: string;
  ullagePct?: number;
};

export function FuelCargoCard({
  trip,
  bolVolumeL,
  showCaptureControls = true,
}: {
  trip: TripForFuelCard;
  bolVolumeL?: number;
  /** Hide the inline capture buttons (used on the Delivery stage where we
   *  surface the discharge form on its own; or read-only summaries). */
  showCaptureControls?: boolean;
}) {
  const hasLoading = trip.loadedLitres !== undefined;
  const hasDischarge = trip.dischargedLitres !== undefined;
  const editable =
    showCaptureControls && trip.status !== "closed" && trip.status !== "cancelled";

  // BOL volume is already at 20 °C — observed = corrected.
  const loaded20C = trip.loadedLitres20C ?? trip.loadedLitres;
  const discharged20C = trip.dischargedLitres20C ?? trip.dischargedLitres;
  const ullage =
    trip.ullagePct ??
    (loaded20C !== undefined && discharged20C !== undefined
      ? ullageVariancePct(loaded20C, discharged20C)
      : undefined);

  return (
    <section className="surface-card surface-3d border-2 border-border-strong overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b-[3px] border-border-strong bg-bg-surface px-5 py-3.5">
        <div className="flex items-center gap-2">
          <FuelIcon className="size-4 text-fg-tertiary" />
          <h2 className="text-[15px] font-extrabold tracking-tight text-fg-primary">
            Fuel cargo
          </h2>
          {trip.product && (
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-fg-tertiary">
              {trip.product} · {trip.cargoQuantity.toLocaleString()} L per BOL @ 20 °C
            </span>
          )}
        </div>
      </header>
      <div className="grid gap-px bg-border md:grid-cols-3">
        <FuelBlock title="Depot loading">
          <KV
            icon={Droplet}
            label="Loaded (@ 20 °C)"
            value={trip.loadedLitres === undefined ? "—" : `${trip.loadedLitres.toLocaleString()} L`}
            highlight
          />
          <KV
            icon={IdCardIcon}
            label="Seals"
            value={trip.loadingSealNumbers ?? "—"}
            mono
          />
          {trip.product && editable && (
            <CaptureLoadingButton
              tripId={trip.id}
              product={trip.product}
              initialLitres={trip.loadedLitres}
              bolVolumeL={bolVolumeL}
              hasExisting={hasLoading}
            />
          )}
        </FuelBlock>

        <FuelBlock title="Customer discharge">
          <KV
            icon={Droplet}
            label="Discharged (@ 20 °C)"
            value={trip.dischargedLitres === undefined ? "—" : `${trip.dischargedLitres.toLocaleString()} L`}
            highlight
          />
          <KV
            icon={IdCardIcon}
            label="Seals"
            value={trip.dischargeSealNumbers ?? "—"}
            mono
          />
          {trip.product && editable && (
            <CaptureDischargeButton
              tripId={trip.id}
              product={trip.product}
              hasLoading={hasLoading}
              hasExisting={hasDischarge}
              initialLitres={trip.dischargedLitres}
            />
          )}
        </FuelBlock>

        <FuelBlock title="Variance">
          {ullage === undefined ? (
            <div className="rounded-md border border-dashed border-border-strong bg-bg-surface/60 p-3 text-[12px] font-medium text-fg-tertiary">
              Awaiting both observations.
            </div>
          ) : (
            <>
              <KV
                icon={Droplet}
                label="Ullage"
                value={`${ullage >= 0 ? "" : "+"}${(-ullage).toFixed(2)} %`}
                highlight
                tone={
                  Math.abs(ullage) <= ULLAGE_ALERT_THRESHOLD_PCT ? "success" : "danger"
                }
              />
              <KV
                icon={Droplet}
                label="Delivered"
                value={
                  loaded20C !== undefined && discharged20C !== undefined
                    ? `${discharged20C.toLocaleString()} L of ${loaded20C.toLocaleString()}`
                    : "—"
                }
              />
              {Math.abs(ullage) > ULLAGE_ALERT_THRESHOLD_PCT && (
                <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-[12px] font-semibold text-status-danger">
                  Exceeds {ULLAGE_ALERT_THRESHOLD_PCT.toFixed(1)}% threshold. Investigate.
                </div>
              )}
            </>
          )}
        </FuelBlock>
      </div>
    </section>
  );
}

function FuelBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 bg-bg-elevated px-5 py-4">
      <div className="font-mono text-[11px] font-extrabold uppercase tracking-[0.14em] text-fg-secondary">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function KV({
  icon: Icon,
  label,
  value,
  highlight = false,
  mono = false,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  tone?: "default" | "success" | "danger";
}) {
  const colour =
    tone === "success"
      ? "text-status-success"
      : tone === "danger"
        ? "text-status-danger"
        : highlight
          ? "text-fg-primary"
          : "text-fg-secondary";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-fg-tertiary">
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className={
          (mono ? "font-mono " : "") +
          (highlight ? "font-bold " : "font-semibold ") +
          "text-[13px] tnum " +
          colour
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Big "no BOL approved yet" gate shown at the top of the Loading stage. */
export function BOLApprovalGate({ tripId }: { tripId: string }) {
  return (
    <section className="surface-card surface-3d flex flex-col gap-3 border-2 border-status-warning/50 bg-status-warning/[0.06] px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-status-warning/20 text-status-warning">
          <span className="font-mono text-[15px] font-extrabold">1</span>
        </div>
        <div className="flex-1">
          <h2 className="text-[17px] font-extrabold tracking-tight text-fg-primary">
            Upload &amp; approve the Bill of Lading first
          </h2>
          <p className="mt-1 text-[13px] font-medium text-fg-secondary">
            The BOL prints the agreed volume (@ 20 °C) and the seal numbers — it's the
            legal basis for everything that follows. Upload it in the Documents card
            below, then approve it before the next stage unlocks.
          </p>
          <p className="mt-2 text-[12px] text-fg-tertiary">
            Trip id: <Link href={`/trips/${tripId}`} className="font-mono font-semibold text-brand-blue hover:underline">{tripId}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Small "stage gate not met" banner used at the bottom of each non-loading stage. */
export function StageGateBanner({
  blocker,
  hint,
}: {
  blocker: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border-l-4 border-status-warning bg-status-warning/[0.06] px-3.5 py-2.5 text-[13px]">
      <div className="font-extrabold text-fg-primary">{blocker}</div>
      {hint && <div className="mt-0.5 text-[12px] font-medium text-fg-secondary">{hint}</div>}
    </div>
  );
}
