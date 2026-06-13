import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Container,
  Droplet,
  Fuel as FuelIcon,
  IdCard as IdCardIcon,
  Thermometer,
  Truck as TruckIcon,
} from "lucide-react";
import {
  correctVolumeTo20C,
  ullageVariancePct,
  ULLAGE_ALERT_THRESHOLD_PCT,
} from "@/lib/types/trips";
import { CaptureDischargeButton, CaptureLoadingButton } from "@/components/trips/fuel-capture";
import { getTripById } from "@/server/actions/trips";
import { listTripDocuments } from "@/server/actions/documents";
import { listBorderCrossingsForTrip } from "@/server/actions/borders";
import { PageHeader } from "@/components/layout/page-header";
import { TripTimeline } from "@/components/trips/trip-timeline";
import { TripStatusUpdate } from "@/components/trips/trip-status-update";
import { TripDocuments } from "@/components/trips/trip-documents";
import { TripBorders } from "@/components/trips/trip-borders";
import { TripReconciliation } from "@/components/trips/trip-reconciliation";
import { TripExpensesCard } from "@/components/trips/trip-expenses-card";
import { TripInvoiceCard } from "@/components/trips/trip-invoice-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StatusPipeline,
  TRIP_PIPELINE,
  tripStatusIndex,
} from "@/components/ui/status-pipeline";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const [documents, borders] = await Promise.all([
    listTripDocuments(id),
    listBorderCrossingsForTrip(id),
  ]);

  const pipeline = tripStatusIndex(trip.status);

  return (
    <div className="stagger-children flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: "Trips", href: "/trips" }, { label: trip.number }]}
        eyebrow="Trip"
        title={trip.number}
        description={
          trip.customer
            ? `${trip.customer.name} · ${trip.origin} to ${trip.destination}`
            : `${trip.origin} to ${trip.destination}`
        }
        actions={
          trip.readyToInvoice ? <Badge variant="success">Ready to invoice</Badge> : null
        }
      />

      {/* STATUS pipeline */}
      <section className="surface-card px-5 py-4">
        <StatusPipeline
          stages={TRIP_PIPELINE}
          currentIndex={pipeline.index}
          failedAtIndex={pipeline.failed ? pipeline.index : undefined}
        />
      </section>

      {/* NEXT ACTION — status-adaptive */}
      <NextActionPanel trip={trip} />

      {/* FACTS — cargo / revenue / schedule */}
      <section className="surface-card grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <FactCell
          label={trip.product ?? "Cargo"}
          value={
            trip.cargoUnit === "litres"
              ? trip.cargoQuantity.toLocaleString()
              : String(trip.cargoQuantity)
          }
          unit={trip.cargoUnit === "litres" ? "L" : trip.cargoUnit}
          sub={trip.product ? "agreed volume" : trip.cargoType}
        />
        <FactCell
          label="Revenue"
          value={trip.revenueAmount.toLocaleString()}
          unit={trip.revenueCurrency}
          sub={
            trip.driverAdvanceKes !== undefined
              ? `KSh ${trip.driverAdvanceKes.toLocaleString()} driver advance`
              : undefined
          }
        />
        <FactCell
          label="Schedule"
          value={
            trip.plannedDepartureDate
              ? new Date(trip.plannedDepartureDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })
              : "—"
          }
          unit="dep"
          sub={
            trip.plannedDeliveryDate
              ? `arrive ${new Date(trip.plannedDeliveryDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}`
              : "delivery TBC"
          }
        />
      </section>

      {/* RELATED RAIL — customer + booking + truck + driver + trailer */}
      <section className="surface-card grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-5 md:divide-y-0">
        <RelatedChip
          icon={Building2}
          label="Customer"
          name={trip.customer?.name ?? "—"}
          sub={trip.customer?.contactPerson}
          href={trip.customer ? `/customers/${trip.customer.id}` : undefined}
        />
        <RelatedChip
          icon={ClipboardList}
          label="Booking"
          name={trip.booking?.number ?? "—"}
          sub={trip.booking ? "Source" : "Not linked"}
          href={trip.booking ? `/bookings/${trip.booking.id}` : undefined}
          mono
        />
        <RelatedChip
          icon={TruckIcon}
          label="Truck"
          name={trip.truck?.registration ?? "—"}
          sub={trip.truck ? `${trip.truck.make} ${trip.truck.model}` : undefined}
          href={trip.truck ? `/trucks/${trip.truck.id}` : undefined}
          mono
        />
        <RelatedChip
          icon={IdCardIcon}
          label="Driver"
          name={trip.driver?.fullName ?? "—"}
          sub={trip.driver?.phone}
          href={trip.driver ? `/drivers/${trip.driver.id}` : undefined}
        />
        <RelatedChip
          icon={Container}
          label="Trailer"
          name={trip.trailer?.registration ?? "—"}
          sub={trip.trailer ? `${trip.trailer.capacityTonnes}t` : "Not attached"}
          href={trip.trailer ? `/trailers/${trip.trailer.id}` : undefined}
          mono
        />
      </section>

      {/* FUEL CARGO — the operational heart */}
      <FuelCargoCard trip={trip} />

      {/* Documents / borders / expenses / invoice — kept as-is */}
      <TripDocuments tripId={trip.id} documents={documents} />
      <TripBorders tripId={trip.id} borders={borders} />
      <TripExpensesCard tripId={trip.id} />
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
      />

      {trip.status === "closed" && (
        <section className="surface-card overflow-hidden border-status-success/25 bg-status-success/[0.04]">
          <header className="flex items-center justify-between gap-3 border-b border-status-success/20 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-status-success" />
              <h2 className="text-[13px] font-semibold text-fg-primary">
                Closed and reconciled
              </h2>
            </div>
            {trip.closedAt && (
              <span className="font-mono text-[11px] tnum text-fg-tertiary">
                {new Date(trip.closedAt).toLocaleString("en-GB")}
              </span>
            )}
          </header>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <ClosedStat
              label="Revenue"
              value={`${trip.revenueAmount.toLocaleString()} ${trip.revenueCurrency}`}
              tone="success"
            />
            <ClosedStat
              label="Actual km"
              value={trip.actualKm ? `${trip.actualKm.toLocaleString()} km` : "—"}
            />
            <ClosedStat
              label="Actual fuel"
              value={
                trip.actualFuelLitres ? `${trip.actualFuelLitres.toLocaleString()} L` : "—"
              }
            />
            <ClosedStat
              label="Fuel efficiency"
              value={
                trip.actualKm && trip.actualFuelLitres && trip.actualFuelLitres > 0
                  ? `${(trip.actualKm / trip.actualFuelLitres).toFixed(2)} km/L`
                  : "—"
              }
              tone="info"
            />
            <ClosedStat
              label="Driver advance"
              value={`KSh ${(trip.driverAdvanceKes ?? 0).toLocaleString()}`}
            />
            <ClosedStat
              label="Advance used"
              value={`KSh ${(trip.driverAdvanceUsedKes ?? 0).toLocaleString()}`}
            />
            <ClosedStat
              label={
                (trip.driverAdvanceKes ?? 0) - (trip.driverAdvanceUsedKes ?? 0) >= 0
                  ? "Balance returned"
                  : "Overspent"
              }
              value={`KSh ${Math.abs(
                (trip.driverAdvanceKes ?? 0) - (trip.driverAdvanceUsedKes ?? 0),
              ).toLocaleString()}`}
              tone={
                (trip.driverAdvanceKes ?? 0) - (trip.driverAdvanceUsedKes ?? 0) >= 0
                  ? "success"
                  : "danger"
              }
            />
            <ClosedStat
              label="Border charges"
              value={`KSh ${trip.borderChargesKes.toLocaleString()}`}
            />
          </div>
        </section>
      )}

      {/* Trip lifecycle — status update + timeline */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3.5">
            <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
              Update status
            </h2>
          </header>
          <div className="px-5 py-4">
            <TripStatusUpdate tripId={trip.id} currentStatus={trip.status} />
          </div>
        </section>

        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3.5">
            <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
              Timeline
            </h2>
          </header>
          <div className="px-5 py-4">
            <TripTimeline events={trip.events} />
          </div>
        </section>
      </div>

      {trip.notes && (
        <section className="surface-card overflow-hidden">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
              Dispatch notes
            </h2>
          </header>
          <p className="px-5 py-4 text-sm text-fg-secondary">{trip.notes}</p>
        </section>
      )}
    </div>
  );
}

/**
 * NextActionPanel — adapts to trip status. Surfaces the operational
 * step the dispatcher / driver should take next, without leaving the
 * trip page.
 */
function NextActionPanel({
  trip,
}: {
  trip: NonNullable<Awaited<ReturnType<typeof getTripById>>>;
}) {
  const product = trip.product;

  if (trip.status === "planned" && product) {
    return (
      <section className="surface-card flex flex-col gap-3 border-brand-blue/25 bg-brand-blue/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-fg-primary">
            Capture depot loading
          </h2>
          <p className="text-xs text-fg-tertiary">
            Litres, temperature, density, seal numbers from the loading sheet.
          </p>
        </div>
        <CaptureLoadingButton
          tripId={trip.id}
          product={product}
          initialLitres={trip.loadedLitres}
          hasExisting={trip.loadedLitres !== undefined}
        />
      </section>
    );
  }

  if (trip.status === "delivered" && product && trip.dischargedLitres === undefined) {
    return (
      <section className="surface-card flex flex-col gap-3 border-status-warning/30 bg-status-warning/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-fg-primary">
            Capture discharge
          </h2>
          <p className="text-xs text-fg-tertiary">
            Customer-side litres, temperature and seal verification.
          </p>
        </div>
        <CaptureDischargeButton
          tripId={trip.id}
          product={product}
          hasLoading={trip.loadedLitres !== undefined}
          hasExisting={trip.dischargedLitres !== undefined}
          initialLitres={trip.dischargedLitres}
        />
      </section>
    );
  }

  if (trip.readyToInvoice) {
    return (
      <section className="surface-card flex flex-col gap-3 border-status-success/25 bg-status-success/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-fg-primary">
            Ready to invoice
          </h2>
          <p className="text-xs text-fg-tertiary">
            Trip closed and reconciled. Issue the invoice to post AR.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/invoices/new?trip=${trip.id}`}>
            Generate invoice
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </section>
    );
  }

  return null;
}

function FactCell({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono tnum text-2xl font-semibold text-fg-primary">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-tertiary">
            {unit}
          </span>
        )}
      </div>
      {sub && <span className="text-[11px] text-fg-tertiary">{sub}</span>}
    </div>
  );
}

function RelatedChip({
  icon: Icon,
  label,
  name,
  sub,
  href,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  name: string;
  sub?: string;
  href?: string;
  mono?: boolean;
}) {
  const body = (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className={
          "truncate text-[13px] font-semibold text-fg-primary group-hover:text-brand-blue " +
          (mono ? "font-mono tnum" : "")
        }
      >
        {name}
      </span>
      {sub && <span className="truncate text-[11px] text-fg-tertiary">{sub}</span>}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="group block transition-colors hover:bg-bg-surface/60"
    >
      {body}
    </Link>
  ) : (
    <div className="opacity-70">{body}</div>
  );
}

function ClosedStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "info" | "warning";
}) {
  const colour =
    tone === "success"
      ? "text-status-success"
      : tone === "danger"
        ? "text-status-danger"
        : tone === "info"
          ? "text-brand-blue"
          : tone === "warning"
            ? "text-status-warning"
            : "text-fg-primary";
  return (
    <div className="flex flex-col gap-1 bg-bg-elevated px-5 py-3.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-tertiary">
        {label}
      </span>
      <span className={`font-mono tnum text-[15px] font-semibold ${colour}`}>
        {value}
      </span>
    </div>
  );
}

type TripForFuelCard = {
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

function FuelCargoCard({ trip }: { trip: TripForFuelCard }) {
  const hasLoading = trip.loadedLitres !== undefined;
  const hasDischarge = trip.dischargedLitres !== undefined;
  const editable = trip.status !== "closed" && trip.status !== "cancelled";

  const loaded20C =
    trip.loadedLitres20C ??
    (trip.loadedLitres !== undefined &&
    trip.loadingTempC !== undefined &&
    (trip.product === "PMS" || trip.product === "AGO")
      ? correctVolumeTo20C(trip.product, trip.loadedLitres, trip.loadingTempC)
      : undefined);
  const discharged20C =
    trip.dischargedLitres20C ??
    (trip.dischargedLitres !== undefined &&
    trip.dischargeTempC !== undefined &&
    (trip.product === "PMS" || trip.product === "AGO")
      ? correctVolumeTo20C(trip.product, trip.dischargedLitres, trip.dischargeTempC)
      : undefined);
  const ullage =
    trip.ullagePct ??
    (loaded20C !== undefined && discharged20C !== undefined
      ? ullageVariancePct(loaded20C, discharged20C)
      : undefined);

  return (
    <section className="surface-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <FuelIcon className="size-4 text-fg-tertiary" />
          <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
            Fuel cargo
          </h2>
          {trip.product && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
              {trip.product} · {trip.cargoQuantity.toLocaleString()} L agreed
            </span>
          )}
        </div>
      </header>
      <div className="grid gap-px bg-border md:grid-cols-3">
        <FuelBlock title="Depot loading">
          <KV
            icon={Droplet}
            label="Observed"
            value={trip.loadedLitres === undefined ? "—" : `${trip.loadedLitres.toLocaleString()} L`}
          />
          <KV
            icon={Thermometer}
            label="Temp"
            value={trip.loadingTempC === undefined ? "—" : `${trip.loadingTempC.toFixed(1)} °C`}
          />
          <KV
            icon={Droplet}
            label="Density 15 °C"
            value={trip.density15C === undefined ? "—" : `${trip.density15C.toFixed(3)} kg/L`}
          />
          <KV
            icon={Droplet}
            label="@ 20 °C"
            value={loaded20C === undefined ? "—" : `${loaded20C.toLocaleString()} L`}
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
              hasExisting={hasLoading}
            />
          )}
        </FuelBlock>

        <FuelBlock title="Customer discharge">
          <KV
            icon={Droplet}
            label="Observed"
            value={trip.dischargedLitres === undefined ? "—" : `${trip.dischargedLitres.toLocaleString()} L`}
          />
          <KV
            icon={Thermometer}
            label="Temp"
            value={trip.dischargeTempC === undefined ? "—" : `${trip.dischargeTempC.toFixed(1)} °C`}
          />
          <KV
            icon={Droplet}
            label="@ 20 °C"
            value={discharged20C === undefined ? "—" : `${discharged20C.toLocaleString()} L`}
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
            <div className="rounded-md border border-dashed border-border bg-bg-surface/60 p-3 text-[11px] text-fg-tertiary">
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
                <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-[11px] text-status-danger">
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
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-tertiary">
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
      <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-tertiary">
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className={
          (mono ? "font-mono " : "") +
          (highlight ? "font-semibold " : "") +
          "text-xs tnum " +
          colour
        }
      >
        {value}
      </span>
    </div>
  );
}
