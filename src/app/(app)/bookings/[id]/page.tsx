import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Phone,
  Route as RouteIcon,
  Truck,
  User,
} from "lucide-react";
import { getBookingById } from "@/server/actions/bookings";
import { getTripById } from "@/server/actions/trips";
import { listDrivers } from "@/server/actions/drivers";
import { listTrucks } from "@/server/actions/trucks";
import { listTrailers } from "@/server/actions/trailers";
import { PageHeader } from "@/components/layout/page-header";
import {
  BOOKING_PIPELINE,
  StatusPipeline,
  bookingStatusIndex,
} from "@/components/ui/status-pipeline";
import { Button } from "@/components/ui/button";
import { BookingActions } from "./booking-actions";
import { TripPlanForm } from "./trip-plan-form";
import { computeFuelRevenue } from "@/lib/types/trips";

const basisLabel = {
  per_trip: "per trip",
  per_litre: "per litre",
  per_litre_per_km: "per litre per km",
  per_km: "per km",
  per_tonne: "per tonne",
  per_container: "per container",
} as const;

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) notFound();
  const trip = booking.tripId ? await getTripById(booking.tripId) : undefined;

  const totalRevenue = computeFuelRevenue({
    basis: booking.agreedBasis,
    amount: booking.agreedAmount,
    cargoQuantityLitres: booking.cargoQuantity,
  });

  // Only load assignable inventory if we'll actually show the plan form.
  const needsAssignment = booking.status === "confirmed";
  const [trucks, trailers, drivers] = needsAssignment
    ? await Promise.all([
        listTrucks().then((all) =>
          all
            .filter((t) => t.status === "active" || t.status === "idle")
            .map((t) => ({ id: t.id, registration: t.registration })),
        ),
        listTrailers().then((all) =>
          all
            .filter((t) => t.status === "active" || t.status === "idle")
            .map((t) => ({ id: t.id, registration: t.registration })),
        ),
        listDrivers().then((all) =>
          all
            .filter((d) => d.status === "active")
            .map((d) => ({ id: d.id, fullName: d.fullName })),
        ),
      ])
    : [[], [], []];

  const currentIndex = bookingStatusIndex(booking.status);
  const failedIndex =
    booking.status === "cancelled" ? currentIndex : undefined;

  return (
    <div className="stagger-children flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[
          { label: "Bookings", href: "/bookings" },
          { label: booking.number },
        ]}
        eyebrow="Booking"
        title={booking.number}
        description={
          booking.customer ? booking.customer.name : `Customer ${booking.customerId}`
        }
      />

      {/* STATUS — pipeline */}
      <section className="surface-card flex flex-col gap-3 px-5 py-4">
        <StatusPipeline
          stages={BOOKING_PIPELINE}
          currentIndex={currentIndex}
          failedAtIndex={failedIndex}
        />
      </section>

      {/* NEXT ACTION — adapts to status */}
      <NextActionPanel
        booking={booking}
        trip={trip}
        trucks={trucks as { id: string; registration: string }[]}
        trailers={trailers as { id: string; registration: string }[]}
        drivers={drivers as { id: string; fullName: string }[]}
      />

      {/* FACTS — route / cargo / rate in one tight strip */}
      <section className="surface-card grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex flex-col gap-1.5 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
            Route
          </span>
          <div className="flex items-center gap-2 text-[15px] font-medium text-fg-primary">
            <span>{booking.origin}</span>
            <ArrowRight className="size-3.5 text-fg-tertiary" />
            <span>{booking.destination}</span>
          </div>
          <span className="font-mono text-[11px] tnum text-fg-tertiary">
            requested {new Date(booking.requestedDate).toLocaleDateString("en-GB")}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
            Cargo
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono tnum text-2xl font-semibold text-fg-primary">
              {booking.cargoQuantity.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-tertiary">
              {booking.cargoUnit}
            </span>
          </div>
          <span className="text-[11px] text-fg-tertiary">{booking.cargoType}</span>
        </div>
        <div className="flex flex-col gap-1.5 px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-tertiary">
            Revenue
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono tnum text-2xl font-semibold text-fg-primary">
              {totalRevenue.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-tertiary">
              {booking.agreedCurrency}
            </span>
          </div>
          <span className="text-[11px] text-fg-tertiary">
            {booking.agreedAmount.toLocaleString()} {booking.agreedCurrency}{" "}
            {basisLabel[booking.agreedBasis]}
          </span>
        </div>
      </section>

      {/* RELATED — customer + trip, side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RelatedCard
          title="Customer"
          icon={Building2}
          href={booking.customer ? `/customers/${booking.customer.id}` : undefined}
        >
          {booking.customer ? (
            <>
              <div className="text-[15px] font-semibold text-fg-primary">
                {booking.customer.name}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-fg-tertiary">
                <User className="size-3" />
                {booking.customer.contactPerson}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs tnum text-fg-secondary">
                <Phone className="size-3" />
                {booking.customer.phone}
              </div>
            </>
          ) : (
            <span className="text-sm text-fg-tertiary">Customer not found.</span>
          )}
        </RelatedCard>

        <RelatedCard
          title="Trip"
          icon={RouteIcon}
          href={trip ? `/trips/${trip.id}` : undefined}
          mutedWhenEmpty
        >
          {trip ? (
            <>
              <div className="font-mono text-[15px] font-semibold text-fg-primary">
                {trip.number}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-fg-tertiary">
                <Truck className="size-3" />
                <span className="font-mono">{trip.truck?.registration ?? "—"}</span>
                <span>·</span>
                <span>{trip.driver?.fullName ?? "—"}</span>
              </div>
              <div className="text-xs text-fg-tertiary capitalize">
                {trip.status.replace(/_/g, " ")}
              </div>
            </>
          ) : (
            <span className="text-sm text-fg-tertiary">
              Not planned yet.
            </span>
          )}
        </RelatedCard>
      </div>

      {/* NOTES */}
      {booking.notes && (
        <section className="surface-card animate-content-in">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <FileText className="size-3.5 text-fg-tertiary" />
            <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
              Notes
            </h2>
          </header>
          <div className="px-5 py-4 text-sm text-fg-secondary">{booking.notes}</div>
        </section>
      )}
    </div>
  );
}

/**
 * NextActionPanel — adapts to booking status. Renders the one thing
 * the operator needs to do right now (and nothing else).
 */
function NextActionPanel({
  booking,
  trip,
  trucks,
  trailers,
  drivers,
}: {
  booking: NonNullable<Awaited<ReturnType<typeof getBookingById>>>;
  trip: Awaited<ReturnType<typeof getTripById>>;
  trucks: { id: string; registration: string }[];
  trailers: { id: string; registration: string }[];
  drivers: { id: string; fullName: string }[];
}) {
  if (booking.status === "draft") {
    return (
      <section className="surface-card flex flex-col gap-3 border-brand-blue/25 bg-brand-blue/[0.03] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-fg-primary">
            Confirm to dispatch
          </h2>
          <p className="text-xs text-fg-tertiary">
            Lock the rate and pickup date, then plan a trip.
          </p>
        </div>
        <BookingActions bookingId={booking.id} action="confirm" />
      </section>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="text-[13px] font-semibold tracking-tight text-fg-primary">
            Plan trip
          </h2>
        </header>
        <div className="px-5 py-5">
          <TripPlanForm
            bookingId={booking.id}
            trucks={trucks}
            trailers={trailers}
            drivers={drivers}
            defaultDepartureDate={booking.requestedDate}
          />
        </div>
      </section>
    );
  }

  if (booking.status === "planned" && trip) {
    return (
      <section className="surface-card flex items-center justify-between gap-3 border-status-success/25 bg-status-success/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-status-success/15 text-status-success ring-1 ring-status-success/30">
            <CheckCircle2 className="size-4" />
          </span>
          <div>
            <h2 className="text-[13px] font-semibold text-fg-primary">
              Trip {trip.number} planned
            </h2>
            <p className="text-xs text-fg-tertiary">
              {trip.truck?.registration ?? "—"} · {trip.driver?.fullName ?? "—"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/trips/${trip.id}`}>
            Open trip
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </section>
    );
  }

  return null;
}

function RelatedCard({
  title,
  icon: Icon,
  href,
  children,
  mutedWhenEmpty = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children: React.ReactNode;
  mutedWhenEmpty?: boolean;
}) {
  const body = (
    <>
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
          <Icon className="size-3.5" />
          {title}
        </h3>
        {href && <ArrowRight className="size-3.5 text-fg-tertiary" />}
      </header>
      <div className="flex flex-col gap-1.5 px-5 py-4">{children}</div>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="surface-card surface-interactive group block overflow-hidden hover:border-border-strong"
    >
      {body}
    </Link>
  ) : (
    <div
      className={
        "surface-card overflow-hidden " +
        (mutedWhenEmpty ? "border-dashed bg-bg-surface/40" : "")
      }
    >
      {body}
    </div>
  );
}
