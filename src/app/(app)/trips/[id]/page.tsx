import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  Container,
  Droplet,
  Fuel as FuelIcon,
  IdCard as IdCardIcon,
  Package,
  Thermometer,
  Truck as TruckIcon,
  Wallet,
} from "lucide-react";
import { correctVolumeTo20C, ullageVariancePct, ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";
import { CaptureDischargeButton, CaptureLoadingButton } from "@/components/trips/fuel-capture";
import { getTripById } from "@/server/actions/trips";
import { listTripDocuments } from "@/server/actions/documents";
import { listBorderCrossingsForTrip } from "@/server/actions/borders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TripStatusPill } from "@/components/trips/trip-status-pill";
import { TripTimeline } from "@/components/trips/trip-timeline";
import { TripStatusUpdate } from "@/components/trips/trip-status-update";
import { TripDocuments } from "@/components/trips/trip-documents";
import { TripBorders } from "@/components/trips/trip-borders";
import { TripReconciliation } from "@/components/trips/trip-reconciliation";
import { TripExpensesCard } from "@/components/trips/trip-expenses-card";
import { TripInvoiceCard } from "@/components/trips/trip-invoice-card";
import { Badge } from "@/components/ui/badge";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) notFound();
  const documents = await listTripDocuments(id);
  const borders = await listBorderCrossingsForTrip(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Trips", href: "/trips" }, { label: trip.number }]}
        eyebrow="Trip"
        title={trip.number}
        description={
          trip.customer
            ? `${trip.customer.name} · ${trip.origin} → ${trip.destination}`
            : `${trip.origin} → ${trip.destination}`
        }
        actions={
          <>
            <TripStatusPill status={trip.status} />
            {trip.readyToInvoice && <Badge variant="success">Ready to invoice</Badge>}
          </>
        }
      />

      {/* Hero summary */}
      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
          <div className="flex items-center justify-center bg-gradient-to-br from-brand-navy to-bg-base p-8">
            <div className="text-center">
              <TruckIcon className="mx-auto size-16 text-white/80" />
              <div className="mt-3 font-mono text-base font-semibold tracking-wider text-white">
                {trip.truck?.registration ?? "—"}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                {trip.driver?.fullName ?? "—"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            <Stat
              icon={Package}
              label={trip.product ?? "Cargo"}
              value={
                trip.cargoUnit === "litres"
                  ? `${trip.cargoQuantity.toLocaleString()} L`
                  : `${trip.cargoQuantity} ${trip.cargoUnit}`
              }
              valueClassName="font-mono tnum"
            />
            <Stat
              icon={Wallet}
              label="Revenue"
              value={`${trip.revenueAmount.toLocaleString()} ${trip.revenueCurrency}`}
              valueClassName="font-mono tnum"
            />
            <Stat
              icon={Wallet}
              label="Driver advance"
              value={
                trip.driverAdvanceKes !== undefined
                  ? `KSh ${trip.driverAdvanceKes.toLocaleString()}`
                  : "—"
              }
              valueClassName="font-mono tnum"
            />
            <Stat
              icon={Calendar}
              label="Planned departure"
              value={
                trip.plannedDepartureDate
                  ? new Date(trip.plannedDepartureDate).toLocaleDateString("en-GB")
                  : "—"
              }
            />
          </div>
        </div>
      </Card>

      {/* Linked entities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <LinkedCard
          title="Customer"
          icon={Building2}
          href={trip.customer ? `/customers/${trip.customer.id}` : undefined}
          name={trip.customer?.name ?? "—"}
          subtext={trip.customer?.contactPerson}
        />
        <LinkedCard
          title="Truck"
          icon={TruckIcon}
          href={trip.truck ? `/trucks/${trip.truck.id}` : undefined}
          name={trip.truck?.registration ?? "—"}
          subtext={trip.truck ? `${trip.truck.make} ${trip.truck.model}` : undefined}
          mono
        />
        <LinkedCard
          title="Trailer"
          icon={Container}
          href={trip.trailer ? `/trailers/${trip.trailer.id}` : undefined}
          name={trip.trailer?.registration ?? "—"}
          subtext={trip.trailer ? `${trip.trailer.capacityTonnes}t` : "Not attached"}
          mono
        />
      </div>

      {/* Fuel cargo — loading + discharge observations */}
      <FuelCargoCard trip={trip} />

      <div className="grid gap-4 lg:grid-cols-2">
        <LinkedCard
          title="Driver"
          icon={IdCardIcon}
          href={trip.driver ? `/drivers/${trip.driver.id}` : undefined}
          name={trip.driver?.fullName ?? "—"}
          subtext={trip.driver?.phone}
        />
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
            <CardDescription>
              {trip.booking ? `Created from ${trip.booking.number}` : "No booking link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trip.booking ? (
              <Link
                href={`/bookings/${trip.booking.id}`}
                className="group inline-flex items-center gap-2 text-sm text-fg-primary hover:text-brand-blue"
              >
                <span className="font-mono">{trip.booking.number}</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <span className="text-sm text-fg-tertiary">Not linked.</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents (loading, customs, weighbridge, POD…) */}
      <TripDocuments tripId={trip.id} documents={documents} />

      {/* Cross-border crossings */}
      <TripBorders tripId={trip.id} borders={borders} />

      {/* Expenses */}
      <TripExpensesCard tripId={trip.id} />

      {/* Invoice */}
      <TripInvoiceCard tripId={trip.id} readyToInvoice={!!trip.readyToInvoice} />

      {/* Reconciliation panel (only when delivered) */}
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

      {/* Closed summary */}
      {trip.status === "closed" && (
        <Card className="border-status-success/30 bg-status-success/5">
          <CardHeader>
            <CardTitle className="text-status-success">Closed & reconciled</CardTitle>
            <CardDescription>
              {trip.closedAt && `Closed ${new Date(trip.closedAt).toLocaleString("en-GB")}.`}
              {trip.readyToInvoice && " Ready to invoice."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                value={trip.actualFuelLitres ? `${trip.actualFuelLitres.toLocaleString()} L` : "—"}
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
                label="Driver advance issued"
                value={`KSh ${(trip.driverAdvanceKes ?? 0).toLocaleString()}`}
              />
              <ClosedStat
                label="Driver advance used"
                value={`KSh ${(trip.driverAdvanceUsedKes ?? 0).toLocaleString()}`}
              />
              <ClosedStat
                label={
                  (trip.driverAdvanceKes ?? 0) - (trip.driverAdvanceUsedKes ?? 0) >= 0
                    ? "Advance balance (returned)"
                    : "Advance overspent"
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
          </CardContent>
        </Card>
      )}

      {/* Trip lifecycle */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
            <CardDescription>
              Move the trip through its lifecycle. The truck and driver follow automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TripStatusUpdate tripId={trip.id} currentStatus={trip.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Every status change captured.</CardDescription>
          </CardHeader>
          <CardContent>
            <TripTimeline events={trip.events} />
          </CardContent>
        </Card>
      </div>

      {trip.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Dispatch notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-secondary">{trip.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
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
    tone === "success" ? "text-status-success" :
    tone === "danger" ? "text-status-danger" :
    tone === "info" ? "text-brand-blue" :
    tone === "warning" ? "text-status-warning" :
    "text-fg-primary";
  return (
    <div className="rounded-md bg-bg-base/60 p-3 ring-1 ring-border">
      <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</div>
      <div className={`mt-0.5 font-mono tnum text-base font-semibold ${colour}`}>{value}</div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-bg-elevated p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
        <Icon className="size-3" /> {label}
      </div>
      <div className={"mt-1 text-base font-medium text-fg-primary " + valueClassName}>{value}</div>
    </div>
  );
}

function LinkedCard({
  title,
  icon: Icon,
  href,
  name,
  subtext,
  mono = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  name: string;
  subtext?: string;
  mono?: boolean;
}) {
  const inner = (
    <div className="flex items-start gap-3">
      <div className="flex size-10 items-center justify-center rounded-md bg-bg-base text-fg-tertiary ring-1 ring-border">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={"text-sm font-semibold text-fg-primary " + (mono ? "font-mono" : "")}>{name}</div>
        {subtext && <div className="text-xs text-fg-tertiary">{subtext}</div>}
      </div>
    </div>
  );
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {href ? (
          <Link href={href} className="group block transition-colors">
            {inner}
          </Link>
        ) : (
          inner
        )}
      </CardContent>
    </Card>
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
  // Closed/cancelled trips are read-only — observations feed reconciled
  // variance figures and must not change after the fact.
  const editable = trip.status !== "closed" && trip.status !== "cancelled";

  // Compute corrected litres / ullage on the fly if needed
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FuelIcon className="size-4 text-fg-tertiary" />
          Fuel cargo
        </CardTitle>
        <CardDescription>
          {trip.product
            ? `Product: ${trip.product} · agreed ${trip.cargoQuantity.toLocaleString()} L`
            : `${trip.cargoQuantity} ${trip.cargoUnit}`}
          {!hasLoading && trip.product
            ? " · capture loading observations from the depot loading sheet"
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <FuelBlock title="Depot loading">
          <KV
            icon={Droplet}
            label="Observed litres"
            value={trip.loadedLitres === undefined ? "—" : `${trip.loadedLitres.toLocaleString()} L`}
          />
          <KV
            icon={Thermometer}
            label="Loading temp"
            value={trip.loadingTempC === undefined ? "—" : `${trip.loadingTempC.toFixed(1)} °C`}
          />
          <KV
            icon={Droplet}
            label="Density (15 °C)"
            value={trip.density15C === undefined ? "—" : `${trip.density15C.toFixed(3)} kg/L`}
          />
          <KV
            icon={Droplet}
            label="@ 20 °C corrected"
            value={loaded20C === undefined ? "—" : `${loaded20C.toLocaleString()} L`}
            highlight
          />
          <KV
            icon={IdCardIcon}
            label="Seal numbers"
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
            label="Observed litres"
            value={
              trip.dischargedLitres === undefined
                ? "—"
                : `${trip.dischargedLitres.toLocaleString()} L`
            }
          />
          <KV
            icon={Thermometer}
            label="Discharge temp"
            value={
              trip.dischargeTempC === undefined ? "—" : `${trip.dischargeTempC.toFixed(1)} °C`
            }
          />
          <KV
            icon={Droplet}
            label="@ 20 °C corrected"
            value={discharged20C === undefined ? "—" : `${discharged20C.toLocaleString()} L`}
            highlight
          />
          <KV
            icon={IdCardIcon}
            label="Seal numbers"
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
            <div className="rounded-md border border-dashed border-border bg-bg-base/40 p-3 text-[11px] text-fg-tertiary">
              Awaiting both loading and discharge observations.
            </div>
          ) : (
            <>
              <KV
                icon={Droplet}
                label="Ullage"
                value={`${ullage >= 0 ? "" : "+"}${(-ullage).toFixed(2)} %`}
                highlight
                tone={
                  Math.abs(ullage) <= ULLAGE_ALERT_THRESHOLD_PCT
                    ? "success"
                    : "danger"
                }
              />
              <KV
                icon={Droplet}
                label="Net delivered"
                value={
                  loaded20C !== undefined && discharged20C !== undefined
                    ? `${discharged20C.toLocaleString()} L (of ${loaded20C.toLocaleString()})`
                    : "—"
                }
              />
              {Math.abs(ullage) > ULLAGE_ALERT_THRESHOLD_PCT && (
                <div className="rounded-md border border-status-danger/30 bg-status-danger/10 p-3 text-[11px] text-status-danger">
                  Variance exceeds the {ULLAGE_ALERT_THRESHOLD_PCT.toFixed(1)}% threshold —
                  triggers ullage investigation.
                </div>
              )}
            </>
          )}
        </FuelBlock>
      </CardContent>
    </Card>
  );
}

function FuelBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg-base/40 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fg-tertiary">
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
